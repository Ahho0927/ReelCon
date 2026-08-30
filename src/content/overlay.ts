const OVERLAY_STYLES = `
  :host {
    --rc-white: #ffffff;
    --rc-track: rgba(255, 255, 255, 0.34);
    --rc-shadow: 0 1px 5px rgba(0, 0, 0, 0.88), 0 0 1px rgba(0, 0, 0, 0.9);
    position: fixed;
    z-index: 2147483646;
    display: block;
    pointer-events: none;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  }

  * { box-sizing: border-box; }

  .surface {
    position: absolute;
    inset: 0;
    overflow: hidden;
    pointer-events: none;
  }

  .message,
  .toast {
    position: absolute;
    left: 50%;
    bottom: 22px;
    max-width: calc(100% - 32px);
    transform: translate(-50%, 5px);
    color: var(--rc-white);
    font-size: 14px;
    font-weight: 500;
    line-height: 1.35;
    letter-spacing: -0.015em;
    text-align: center;
    text-wrap: balance;
    opacity: 0;
    filter: drop-shadow(var(--rc-shadow));
    transition: opacity 140ms ease, transform 180ms cubic-bezier(.2,.8,.2,1);
    white-space: nowrap;
  }

  .message.visible,
  .toast.visible {
    opacity: 1;
    transform: translate(-50%, 0);
  }

  .toast {
    bottom: 52px;
    font-size: 15px;
    font-weight: 600;
  }

  .scrub-hit {
    position: absolute;
    right: 12px;
    bottom: 0;
    left: 12px;
    height: 16px;
    display: flex;
    align-items: flex-end;
    padding-bottom: 5px;
    pointer-events: auto;
    cursor: pointer;
    touch-action: none;
  }

  .scrub-track {
    position: relative;
    width: 100%;
    height: 3px;
    overflow: visible;
    border-radius: 999px;
    background: var(--rc-track);
    transition: height 130ms ease;
  }

  .scrub-hit:hover .scrub-track,
  .scrub-hit.dragging .scrub-track,
  .scrub-hit:focus-visible .scrub-track {
    height: 5px;
  }

  .scrub-progress {
    position: absolute;
    inset: 0 auto 0 0;
    width: 0%;
    border-radius: inherit;
    background: var(--rc-white);
  }

  .scrub-thumb {
    position: absolute;
    top: 50%;
    right: 0;
    width: 9px;
    height: 9px;
    border-radius: 50%;
    background: var(--rc-white);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
    opacity: 0;
    transform: translate(50%, -50%) scale(.8);
    transition: opacity 120ms ease, transform 120ms ease;
  }

  .scrub-hit:hover .scrub-thumb,
  .scrub-hit.dragging .scrub-thumb,
  .scrub-hit:focus-visible .scrub-thumb {
    opacity: 1;
    transform: translate(50%, -50%) scale(1);
  }

  .scrub-hit:focus-visible {
    outline: none;
  }

  .surface.clean-held .message,
  .surface.clean-held .toast,
  .surface.clean-held .scrub-hit,
  .surface.scrub-disabled .scrub-hit {
    display: none;
  }

  @media (prefers-reduced-motion: reduce) {
    .message, .toast, .scrub-track, .scrub-thumb { transition: none; }
  }
`;

export interface OverlayCallbacks {
  onSeek: (ratio: number) => void;
  onSeekStart: () => void;
  onSeekEnd: () => void;
}

export class VideoOverlay {
  readonly host: HTMLDivElement;
  private readonly surface: HTMLDivElement;
  private readonly message: HTMLDivElement;
  private readonly toast: HTMLDivElement;
  private readonly scrubHit: HTMLDivElement;
  private readonly progress: HTMLDivElement;
  private readonly callbacks: OverlayCallbacks;
  private toastTimer: number | undefined;
  private draggingPointer: number | null = null;

  constructor(callbacks: OverlayCallbacks) {
    this.callbacks = callbacks;
    this.host = document.createElement('div');
    this.host.dataset.reelControls = 'overlay';
    const shadow = this.host.attachShadow({ mode: 'open' });
    shadow.innerHTML = `
      <style>${OVERLAY_STYLES}</style>
      <div class="surface">
        <div class="message" role="status" aria-live="polite"></div>
        <div class="toast" role="status" aria-live="polite"></div>
        <div class="scrub-hit" role="slider" tabindex="0" aria-label="영상 재생 위치" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" aria-valuetext="0%">
          <div class="scrub-track">
            <div class="scrub-progress"><span class="scrub-thumb"></span></div>
          </div>
        </div>
      </div>
    `;

    this.surface = shadow.querySelector('.surface') as HTMLDivElement;
    this.message = shadow.querySelector('.message') as HTMLDivElement;
    this.toast = shadow.querySelector('.toast') as HTMLDivElement;
    this.scrubHit = shadow.querySelector('.scrub-hit') as HTMLDivElement;
    this.progress = shadow.querySelector('.scrub-progress') as HTMLDivElement;

    this.scrubHit.addEventListener('pointerdown', this.onScrubPointerDown);
    this.scrubHit.addEventListener('pointermove', this.onScrubPointerMove);
    this.scrubHit.addEventListener('pointerup', this.onScrubPointerUp);
    this.scrubHit.addEventListener('pointercancel', this.onScrubPointerCancel);
    this.scrubHit.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
    });
    this.scrubHit.addEventListener('keydown', this.onScrubKeyDown);
    document.documentElement.append(this.host);
  }

  setRect(rect: DOMRect): void {
    this.host.style.left = `${Math.round(rect.left)}px`;
    this.host.style.top = `${Math.round(rect.top)}px`;
    this.host.style.width = `${Math.round(rect.width)}px`;
    this.host.style.height = `${Math.round(rect.height)}px`;
  }

  setProgress(currentTime: number, duration: number): void {
    const ratio = duration > 0 && Number.isFinite(duration) ? currentTime / duration : 0;
    const percent = Math.max(0, Math.min(100, ratio * 100));
    this.progress.style.width = `${percent}%`;
    this.scrubHit.setAttribute('aria-valuenow', String(Math.round(percent)));
    this.scrubHit.setAttribute('aria-valuetext', `${Math.round(percent)}%`);
  }

  setMessage(text?: string): void {
    this.message.textContent = text ?? '';
    this.message.classList.toggle('visible', Boolean(text));
  }

  showToast(text: string): void {
    if (this.toastTimer !== undefined) window.clearTimeout(this.toastTimer);
    this.toast.textContent = text;
    this.toast.classList.add('visible');
    this.toastTimer = window.setTimeout(() => this.toast.classList.remove('visible'), 1_150);
  }

  setCleanHeld(active: boolean): void {
    this.surface.classList.toggle('clean-held', active);
  }

  setScrubEnabled(enabled: boolean): void {
    this.surface.classList.toggle('scrub-disabled', !enabled);
    this.scrubHit.tabIndex = enabled ? 0 : -1;
    this.scrubHit.toggleAttribute('aria-hidden', !enabled);
  }

  containsEvent(event: Event): boolean {
    return event.composedPath().includes(this.host);
  }

  destroy(): void {
    if (this.toastTimer !== undefined) window.clearTimeout(this.toastTimer);
    this.host.remove();
  }

  private seekFromEvent(event: PointerEvent): void {
    const rect = this.scrubHit.getBoundingClientRect();
    if (rect.width <= 0) return;
    this.callbacks.onSeek(Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)));
  }

  private onScrubPointerDown = (event: PointerEvent): void => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    this.draggingPointer = event.pointerId;
    this.scrubHit.classList.add('dragging');
    this.scrubHit.setPointerCapture?.(event.pointerId);
    this.callbacks.onSeekStart();
    this.seekFromEvent(event);
  };

  private onScrubPointerMove = (event: PointerEvent): void => {
    if (this.draggingPointer !== event.pointerId) return;
    event.preventDefault();
    event.stopPropagation();
    this.seekFromEvent(event);
  };

  private onScrubPointerUp = (event: PointerEvent): void => {
    if (this.draggingPointer !== event.pointerId) return;
    event.preventDefault();
    event.stopPropagation();
    this.seekFromEvent(event);
    this.draggingPointer = null;
    this.scrubHit.classList.remove('dragging');
    this.callbacks.onSeekEnd();
  };

  private onScrubPointerCancel = (event: PointerEvent): void => {
    if (this.draggingPointer !== event.pointerId) return;
    event.preventDefault();
    event.stopPropagation();
    this.draggingPointer = null;
    this.scrubHit.classList.remove('dragging');
    this.callbacks.onSeekEnd();
  };

  private onScrubKeyDown = (event: KeyboardEvent): void => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    event.stopPropagation();
    const now = Number(this.scrubHit.getAttribute('aria-valuenow') ?? 0);
    const next = event.key === 'Home'
      ? 0
      : event.key === 'End'
        ? 100
        : Math.max(0, Math.min(100, now + (event.key === 'ArrowRight' ? 2 : -2)));
    this.callbacks.onSeekStart();
    this.callbacks.onSeek(next / 100);
    this.callbacks.onSeekEnd();
  };
}
