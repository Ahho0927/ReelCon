import type { Settings } from '../shared/settings';
import {
  detectInstagramLocale,
  translate,
  type MessageKey,
  type SupportedLocale,
} from '../shared/i18n';
import {
  getGestureZone,
  getLockThreshold,
  HOLD_DELAY_MS,
  movedBeyondTolerance,
  type GestureState,
  type GestureZone,
} from './gesture-machine';
import { OverlayHider } from './overlay-hider';
import { VideoOverlay } from './overlay';

interface PendingGesture {
  pointerId: number;
  startX: number;
  startY: number;
  zone: GestureZone;
  timer: number;
}

const INTERACTIVE_SELECTOR = 'button, a, input, [role="button"], [role="slider"]';

function intersectionArea(first: DOMRect, second: DOMRect): number {
  const width = Math.max(0, Math.min(first.right, second.right) - Math.max(first.left, second.left));
  const height = Math.max(0, Math.min(first.bottom, second.bottom) - Math.max(first.top, second.top));
  return width * height;
}

function isNativeControlTarget(
  target: EventTarget | null,
  video: HTMLVideoElement,
  videoRect: DOMRect,
): boolean {
  if (!(target instanceof Element) || target === video) return false;
  const interactive = target.closest(INTERACTIVE_SELECTOR);
  if (!(interactive instanceof HTMLElement)) return false;

  // Instagram often wraps the complete media surface in a button. That is the
  // gesture surface, not a small native control such as mute, like, or a link.
  if (interactive.contains(video)) return false;
  const interactiveRect = interactive.getBoundingClientRect();
  const videoArea = videoRect.width * videoRect.height;
  const coverage = videoArea > 0 ? intersectionArea(interactiveRect, videoRect) / videoArea : 0;
  return coverage < 0.45;
}

function safePlay(video: HTMLVideoElement): void {
  video.play().catch(() => undefined);
}

export class VideoSession {
  readonly video: HTMLVideoElement;
  private settings: Settings;
  private state: GestureState = 'idle';
  private overlay: VideoOverlay;
  private hider = new OverlayHider();
  private pending: PendingGesture | null = null;
  private locked = false;
  private basePlaybackRate = 1;
  private holdPlaybackRate = 1;
  private wasPlayingBeforeCenterHold = false;
  private wasPlayingBeforeEdgeHold = false;
  private suppressClickUntil = 0;
  private scrubbing = false;
  private layoutFrame = 0;
  private progressFrame = 0;
  private resizeObserver: ResizeObserver | null = null;
  private destroyed = false;
  private locale: SupportedLocale;

  constructor(
    video: HTMLVideoElement,
    settings: Settings,
    locale = detectInstagramLocale(),
  ) {
    this.video = video;
    this.settings = settings;
    this.locale = locale;
    this.basePlaybackRate = video.playbackRate || 1;
    this.overlay = new VideoOverlay({
      onSeek: (ratio) => this.seek(ratio),
      onSeekStart: () => {
        this.scrubbing = true;
        this.cancelPending();
      },
      onSeekEnd: () => {
        this.scrubbing = false;
      },
    }, locale);
    this.overlay.setScrubEnabled(settings.scrubBarEnabled);

    window.addEventListener('pointerdown', this.onPointerDown, true);
    window.addEventListener('pointermove', this.onPointerMove, true);
    window.addEventListener('pointerup', this.onPointerUp, true);
    window.addEventListener('pointercancel', this.onPointerCancel, true);
    window.addEventListener('click', this.onClick, true);
    document.addEventListener('visibilitychange', this.onVisibilityChange);
    window.addEventListener('blur', this.onWindowBlur);
    window.addEventListener('scroll', this.onViewportChange, { passive: true, capture: true });
    window.addEventListener('resize', this.onViewportChange, { passive: true });
    this.video.addEventListener('ratechange', this.onRateChange);
    this.video.addEventListener('timeupdate', this.updateProgress);
    this.video.addEventListener('durationchange', this.updateProgress);
    this.video.addEventListener('loadedmetadata', this.updateProgress);
    this.video.addEventListener('play', this.startProgressLoop);
    this.video.addEventListener('loadstart', this.onMediaChange);
    this.video.addEventListener('emptied', this.onMediaChange);
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(this.onViewportChange);
      this.resizeObserver.observe(this.video);
    }
    this.syncLayout();
    this.updateProgress();
    if (!this.video.paused) this.startProgressLoop();
  }

  get isInteracting(): boolean {
    return this.scrubbing || (this.state !== 'idle' && this.state !== 'locked');
  }

  refreshLayout(): void {
    if (!this.destroyed) this.syncLayout();
  }

  updateLocale(locale: SupportedLocale): void {
    if (locale === this.locale) return;
    this.locale = locale;
    this.overlay.setLocale(locale);
    if (this.state === 'edgeHeld') this.showEdgeMessage(false);
    if (this.state === 'edgeArmed') this.showEdgeMessage(true);
  }

  updateSettings(settings: Settings): void {
    this.settings = settings;
    this.overlay.setScrubEnabled(settings.scrubBarEnabled);
    if (!settings.edgeHoldEnabled || !settings.speedLockEnabled) this.clearSpeedLock(false);
    if (!settings.enabled) this.resetGesture();
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.resetGesture();
    this.clearSpeedLock(false);
    cancelAnimationFrame(this.layoutFrame);
    cancelAnimationFrame(this.progressFrame);
    window.removeEventListener('pointerdown', this.onPointerDown, true);
    window.removeEventListener('pointermove', this.onPointerMove, true);
    window.removeEventListener('pointerup', this.onPointerUp, true);
    window.removeEventListener('pointercancel', this.onPointerCancel, true);
    window.removeEventListener('click', this.onClick, true);
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
    window.removeEventListener('blur', this.onWindowBlur);
    window.removeEventListener('scroll', this.onViewportChange, true);
    window.removeEventListener('resize', this.onViewportChange);
    this.video.removeEventListener('ratechange', this.onRateChange);
    this.video.removeEventListener('timeupdate', this.updateProgress);
    this.video.removeEventListener('durationchange', this.updateProgress);
    this.video.removeEventListener('loadedmetadata', this.updateProgress);
    this.video.removeEventListener('play', this.startProgressLoop);
    this.video.removeEventListener('loadstart', this.onMediaChange);
    this.video.removeEventListener('emptied', this.onMediaChange);
    this.resizeObserver?.disconnect();
    this.hider.restore();
    this.overlay.destroy();
  }

  private syncLayout = (): void => {
    const rect = this.video.getBoundingClientRect();
    this.overlay.setRect(rect);
  };

  private updateProgress = (): void => {
    this.overlay.setProgress(this.video.currentTime, this.video.duration);
  };

  private startProgressLoop = (): void => {
    if (this.progressFrame || this.destroyed) return;
    const paintProgress = () => {
      this.progressFrame = 0;
      if (this.destroyed) return;
      this.updateProgress();
      if (!this.video.paused) this.progressFrame = requestAnimationFrame(paintProgress);
    };
    this.progressFrame = requestAnimationFrame(paintProgress);
  };

  private onPointerDown = (event: PointerEvent): void => {
    if (!this.settings.enabled || event.button !== 0 || event.isPrimary === false) return;
    if (this.overlay.containsEvent(event)) return;
    const rect = this.video.getBoundingClientRect();
    if (
      event.clientX < rect.left ||
      event.clientX > rect.right ||
      event.clientY < rect.top ||
      event.clientY > rect.bottom
    ) {
      return;
    }
    if (isNativeControlTarget(event.target, this.video, rect)) return;

    const zone = getGestureZone(event.clientX, rect);
    if (zone === 'center' && !this.settings.centerHoldEnabled) return;
    if (zone !== 'center' && !this.settings.edgeHoldEnabled) return;

    this.cancelPending();
    this.state = 'pending';
    const timer = window.setTimeout(() => this.activateHold(), HOLD_DELAY_MS);
    this.pending = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      zone,
      timer,
    };
  };

  private activateHold(): void {
    if (!this.pending || this.destroyed) return;
    if (this.pending.zone === 'center') {
      this.state = 'centerHeld';
      this.wasPlayingBeforeCenterHold = !this.video.paused;
      this.video.pause();
      this.hider.hide(this.video);
      this.overlay.setCleanHeld(true);
      return;
    }

    this.state = 'edgeHeld';
    this.wasPlayingBeforeEdgeHold = !this.video.paused;
    this.holdPlaybackRate = this.video.playbackRate || 1;
    if (!this.locked) this.basePlaybackRate = this.holdPlaybackRate;
    this.video.playbackRate = 2;
    safePlay(this.video);
    if (this.settings.speedLockEnabled) {
      this.showEdgeMessage(false);
    }
  }

  private onPointerMove = (event: PointerEvent): void => {
    if (!this.pending || this.pending.pointerId !== event.pointerId) return;
    if (this.state === 'pending') {
      if (
        movedBeyondTolerance(
          this.pending.startX,
          this.pending.startY,
          event.clientX,
          event.clientY,
        )
      ) {
        this.cancelPending();
      }
      return;
    }

    if (this.state !== 'edgeHeld' && this.state !== 'edgeArmed') return;
    event.preventDefault();
    event.stopPropagation();
    const armed =
      this.settings.speedLockEnabled &&
      event.clientY - this.pending.startY >= getLockThreshold(this.video.getBoundingClientRect().height);
    this.state = armed ? 'edgeArmed' : 'edgeHeld';
    this.showEdgeMessage(armed);
  };

  private onPointerUp = (event: PointerEvent): void => {
    if (!this.pending || this.pending.pointerId !== event.pointerId) return;
    if (this.state === 'pending') {
      this.cancelPending();
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    this.suppressClickUntil = Date.now() + 550;

    if (this.state === 'centerHeld') {
      this.finishCenterHold();
    } else if (this.state === 'edgeArmed') {
      this.toggleSpeedLock();
    } else if (this.state === 'edgeHeld') {
      this.video.playbackRate = this.locked ? 2 : this.holdPlaybackRate;
      if (!this.locked && !this.wasPlayingBeforeEdgeHold) this.video.pause();
    }

    this.overlay.setMessage();
    this.clearPendingTimer();
    this.pending = null;
    this.state = this.locked ? 'locked' : 'idle';
    this.wasPlayingBeforeEdgeHold = false;
  };

  private onPointerCancel = (event: PointerEvent): void => {
    if (!this.pending || this.pending.pointerId !== event.pointerId) return;
    this.resetGesture();
  };

  private onClick = (event: MouseEvent): void => {
    if (Date.now() > this.suppressClickUntil) return;
    const rect = this.video.getBoundingClientRect();
    if (
      event.clientX >= rect.left &&
      event.clientX <= rect.right &&
      event.clientY >= rect.top &&
      event.clientY <= rect.bottom
    ) {
      event.preventDefault();
      event.stopImmediatePropagation();
      this.suppressClickUntil = 0;
    }
  };

  private finishCenterHold(): void {
    this.hider.restore();
    this.overlay.setCleanHeld(false);
    if (this.wasPlayingBeforeCenterHold) safePlay(this.video);
    this.wasPlayingBeforeCenterHold = false;
  }

  private toggleSpeedLock(): void {
    if (this.locked) {
      this.locked = false;
      this.video.playbackRate = this.basePlaybackRate;
      this.overlay.showToast(this.message('speedUnlocked'));
    } else {
      this.locked = true;
      this.video.playbackRate = 2;
      this.overlay.showToast(this.message('speedLocked'));
    }
  }

  private clearSpeedLock(showToast: boolean): void {
    if (!this.locked) return;
    this.locked = false;
    this.video.playbackRate = this.basePlaybackRate;
    if (showToast) this.overlay.showToast(this.message('speedUnlocked'));
    if (this.state === 'locked') this.state = 'idle';
  }

  private seek(ratio: number): void {
    if (!Number.isFinite(this.video.duration) || this.video.duration <= 0) return;
    this.video.currentTime = ratio * this.video.duration;
    this.overlay.setProgress(this.video.currentTime, this.video.duration);
  }

  private onRateChange = (): void => {
    if (this.state === 'idle' && !this.locked && this.video.playbackRate !== 2) {
      this.basePlaybackRate = this.video.playbackRate;
    }
  };

  private resetGesture(): void {
    if (this.state === 'centerHeld') this.finishCenterHold();
    if ((this.state === 'edgeHeld' || this.state === 'edgeArmed') && !this.locked) {
      this.video.playbackRate = this.holdPlaybackRate;
      if (!this.wasPlayingBeforeEdgeHold) this.video.pause();
    }
    this.hider.restore();
    this.overlay.setCleanHeld(false);
    this.overlay.setMessage();
    this.cancelPending();
    this.state = this.locked ? 'locked' : 'idle';
    this.wasPlayingBeforeEdgeHold = false;
  }

  private clearPendingTimer(): void {
    if (this.pending) window.clearTimeout(this.pending.timer);
  }

  private cancelPending(): void {
    this.clearPendingTimer();
    this.pending = null;
    if (this.state === 'pending') this.state = this.locked ? 'locked' : 'idle';
  }

  private onVisibilityChange = (): void => {
    if (document.hidden) this.resetGesture();
  };

  private onWindowBlur = (): void => this.resetGesture();

  private message(key: MessageKey): string {
    return translate(this.locale, key);
  }

  private showEdgeMessage(armed: boolean): void {
    const key: MessageKey = armed
      ? this.locked
        ? 'releaseToUnlock'
        : 'releaseToLock'
      : this.locked
        ? 'slideToUnlock'
        : 'slideToLock';
    this.overlay.setMessage(this.message(key));
  }

  private onViewportChange = (): void => {
    if (this.layoutFrame || this.destroyed) return;
    this.layoutFrame = requestAnimationFrame(() => {
      this.layoutFrame = 0;
      if (!this.destroyed) this.syncLayout();
    });
  };

  private onMediaChange = (): void => {
    if (this.destroyed) return;
    const nextRate = this.video.playbackRate === 2
      ? this.video.defaultPlaybackRate || 1
      : this.video.playbackRate || 1;

    this.clearPendingTimer();
    this.pending = null;
    this.hider.restore();
    this.overlay.setCleanHeld(false);
    this.overlay.setMessage();
    this.locked = false;
    this.state = 'idle';
    this.wasPlayingBeforeCenterHold = false;
    this.wasPlayingBeforeEdgeHold = false;
    this.basePlaybackRate = nextRate;
    this.holdPlaybackRate = nextRate;
    this.video.playbackRate = nextRate;
    this.updateProgress();
  };
}
