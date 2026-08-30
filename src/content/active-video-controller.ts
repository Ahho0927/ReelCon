import type { Settings } from '../shared/settings';
import {
  detectInstagramLocale,
  rememberInstagramLocale,
  type SupportedLocale,
} from '../shared/i18n';
import { isSupportedPath } from './surfaces';
import { chooseActiveVideo, type Point } from './video-candidates';
import { VideoSession } from './video-session';

export class ActiveVideoController {
  private settings: Settings;
  private videos = new Set<HTMLVideoElement>();
  private visibleRatios = new Map<HTMLVideoElement, number>();
  private session: VideoSession | null = null;
  private pointer: Point | undefined;
  private observer: MutationObserver;
  private intersectionObserver: IntersectionObserver | null = null;
  private interval: number;
  private lastUrl = location.href;
  private scanQueued = false;
  private evaluationFrame = 0;
  private destroyed = false;
  private locale: SupportedLocale;

  constructor(settings: Settings) {
    this.settings = settings;
    this.locale = detectInstagramLocale();
    rememberInstagramLocale(this.locale).catch(() => undefined);
    this.observer = new MutationObserver(this.onMutation);
    this.observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['aria-hidden', 'class', 'hidden', 'lang', 'src', 'style'],
    });
    if (typeof IntersectionObserver !== 'undefined') {
      this.intersectionObserver = new IntersectionObserver(this.onIntersection, {
        threshold: [0, 0.25, 0.42, 0.6, 0.8, 1],
      });
    }
    window.addEventListener('pointermove', this.onPointerMove, { passive: true, capture: true });
    window.addEventListener('scroll', this.onViewportChange, { passive: true });
    window.addEventListener('resize', this.onViewportChange, { passive: true });
    document.addEventListener('transitionend', this.onViewportChange, true);
    this.interval = window.setInterval(this.checkRoute, 500);
    this.scan();
  }

  updateSettings(settings: Settings): void {
    this.settings = settings;
    if (!settings.enabled) {
      this.session?.destroy();
      this.session = null;
      return;
    }
    this.session?.updateSettings(settings);
    this.scheduleEvaluate();
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.session?.destroy();
    this.session = null;
    this.observer.disconnect();
    this.intersectionObserver?.disconnect();
    window.clearInterval(this.interval);
    cancelAnimationFrame(this.evaluationFrame);
    window.removeEventListener('pointermove', this.onPointerMove, true);
    window.removeEventListener('scroll', this.onViewportChange);
    window.removeEventListener('resize', this.onViewportChange);
    document.removeEventListener('transitionend', this.onViewportChange, true);
  }

  private scan(): void {
    if (this.destroyed) return;
    const found = new Set(document.querySelectorAll<HTMLVideoElement>('video'));

    for (const video of this.videos) {
      if (found.has(video)) continue;
      this.intersectionObserver?.unobserve(video);
      this.visibleRatios.delete(video);
    }
    for (const video of found) {
      if (!this.videos.has(video)) this.intersectionObserver?.observe(video);
    }

    this.videos = found;
    if (this.session && !found.has(this.session.video)) {
      this.session.destroy();
      this.session = null;
    }
    this.evaluate();
  }

  private evaluate(): void {
    if (this.destroyed) return;
    this.checkRoute();

    if (!this.settings.enabled || !isSupportedPath(location.pathname)) {
      this.session?.destroy();
      this.session = null;
      return;
    }

    if (this.session?.isInteracting && this.session.video.isConnected) return;

    const candidate = chooseActiveVideo(
      this.videos,
      this.pointer,
      (video) => this.visibleRatios.get(video),
    );
    if (candidate?.video === this.session?.video) {
      this.session?.refreshLayout();
      return;
    }
    this.session?.destroy();
    this.session = candidate
      ? new VideoSession(candidate.video, this.settings, this.locale)
      : null;
  }

  private onPointerMove = (event: PointerEvent): void => {
    this.pointer = { x: event.clientX, y: event.clientY };
    this.scheduleEvaluate();
  };

  private onViewportChange = (): void => this.scheduleEvaluate();

  private onIntersection: IntersectionObserverCallback = (entries) => {
    for (const entry of entries) {
      if (entry.target instanceof HTMLVideoElement) {
        this.visibleRatios.set(entry.target, entry.intersectionRatio);
      }
    }
    this.scheduleEvaluate();
  };

  private onMutation: MutationCallback = (records) => {
    const relevantRecords = records.filter((record) =>
      !(record.target instanceof Element) ||
      !record.target.closest('[data-reel-controls="overlay"]'),
    );
    if (relevantRecords.length === 0) return;
    if (relevantRecords.some((record) => record.attributeName === 'lang')) {
      const locale = detectInstagramLocale();
      if (locale !== this.locale) {
        this.locale = locale;
        this.session?.updateLocale(locale);
        rememberInstagramLocale(locale).catch(() => undefined);
      }
    }
    const videoListChanged = relevantRecords.some((record) => {
      if (record.type === 'attributes') return record.attributeName === 'src';
      return [...record.addedNodes, ...record.removedNodes].some((node) =>
        node instanceof HTMLVideoElement ||
        (node instanceof Element && Boolean(node.querySelector('video'))),
      );
    });
    if (videoListChanged) this.scheduleScan();
    else this.scheduleEvaluate();
  };

  private scheduleScan = (): void => {
    if (this.scanQueued || this.destroyed) return;
    this.scanQueued = true;
    queueMicrotask(() => {
      this.scanQueued = false;
      this.scan();
    });
  };

  private scheduleEvaluate = (): void => {
    if (this.evaluationFrame || this.destroyed) return;
    this.evaluationFrame = requestAnimationFrame(() => {
      this.evaluationFrame = 0;
      this.evaluate();
    });
  };

  private checkRoute = (): void => {
    if (location.href === this.lastUrl) return;
    this.lastUrl = location.href;
    this.session?.destroy();
    this.session = null;
    this.scheduleScan();
  };
}
