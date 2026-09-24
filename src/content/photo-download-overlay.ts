import { translate, type SupportedLocale } from '../shared/i18n';

const OVERLAY_STYLES = `
  :host {
    position: fixed;
    z-index: 2147483645;
    display: block;
    pointer-events: none;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  }

  * { box-sizing: border-box; }

  button {
    position: absolute;
    right: 12px;
    bottom: 12px;
    width: 36px;
    height: 36px;
    display: grid;
    place-items: center;
    padding: 0;
    border: 1px solid rgba(255, 255, 255, 0.42);
    border-radius: 50%;
    color: #fff;
    background: rgba(0, 0, 0, 0.66);
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.34);
    cursor: pointer;
    opacity: 0;
    transform: translateY(4px) scale(.96);
    transition: opacity 130ms ease, transform 150ms ease, background 130ms ease;
    pointer-events: none;
  }

  :host([data-hovered]) button,
  button:focus-visible,
  button[data-busy],
  button[data-success],
  .toast.visible {
    opacity: 1;
    transform: translateY(0) scale(1);
  }

  :host([data-hovered]) button,
  button:focus-visible,
  button[data-busy],
  button[data-success] {
    pointer-events: auto;
  }

  button:hover { background: rgba(0, 0, 0, 0.82); }
  button:focus-visible { outline: 2px solid #fff; outline-offset: 2px; }
  button[data-busy] { cursor: progress; }
  button[data-success] { cursor: default; background: rgba(20, 126, 72, .88); }
  svg { width: 19px; height: 19px; }

  .spinner {
    display: none;
    width: 17px;
    height: 17px;
    border: 2px solid rgba(255, 255, 255, .4);
    border-top-color: #fff;
    border-radius: 50%;
    animation: spin .7s linear infinite;
  }

  .check-icon { display: none; }
  button[data-busy] .download-icon,
  button[data-success] .download-icon { display: none; }
  button[data-busy] .spinner { display: block; }
  button[data-success] .check-icon { display: block; }

  .toast {
    position: absolute;
    right: 12px;
    bottom: 56px;
    max-width: min(260px, calc(100% - 24px));
    padding: 7px 10px;
    border-radius: 7px;
    color: #fff;
    background: rgba(0, 0, 0, .78);
    font-size: 13px;
    font-weight: 600;
    line-height: 1.25;
    opacity: 0;
    transform: translateY(3px);
    transition: opacity 130ms ease, transform 150ms ease;
    pointer-events: none;
    white-space: nowrap;
  }

  @keyframes spin { to { transform: rotate(360deg); } }

  @media (prefers-reduced-motion: reduce) {
    button, .toast { transition: none; }
    .spinner { animation-duration: 1.4s; }
  }
`;

export class PhotoDownloadOverlay {
  readonly host: HTMLDivElement;
  readonly button: HTMLButtonElement;
  private readonly toast: HTMLDivElement;
  private readonly onDownload: () => Promise<boolean>;
  private locale: SupportedLocale;
  private toastTimer: number | undefined;
  private destroyed = false;

  constructor(locale: SupportedLocale, onDownload: () => Promise<boolean>) {
    this.locale = locale;
    this.onDownload = onDownload;
    this.host = document.createElement('div');
    this.host.dataset.reelControls = 'photo-download';
    const shadow = this.host.attachShadow({ mode: 'open' });
    shadow.innerHTML = `
      <style>${OVERLAY_STYLES}</style>
      <button type="button" aria-live="polite">
        <svg class="download-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M12 3v11m0 0 4-4m-4 4-4-4M5 17.5V20h14v-2.5" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <svg class="check-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="m5 12.5 4.3 4.3L19 7.2" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <span class="spinner" aria-hidden="true"></span>
      </button>
      <div class="toast" role="status" aria-live="polite"></div>
    `;
    this.button = shadow.querySelector('button') as HTMLButtonElement;
    this.toast = shadow.querySelector('.toast') as HTMLDivElement;
    this.setLocale(locale);
    this.button.addEventListener('pointerdown', this.stopEvent);
    this.button.addEventListener('click', this.handleClick);
    document.documentElement.append(this.host);
  }

  setRect(rect: DOMRect): void {
    this.host.style.left = `${Math.round(rect.left)}px`;
    this.host.style.top = `${Math.round(rect.top)}px`;
    this.host.style.width = `${Math.round(rect.width)}px`;
    this.host.style.height = `${Math.round(rect.height)}px`;
  }

  setHovered(hovered: boolean): void {
    this.host.toggleAttribute('data-hovered', hovered);
  }

  setLocale(locale: SupportedLocale): void {
    this.locale = locale;
    this.button.setAttribute('aria-label', translate(locale, 'downloadPhotoLabel'));
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    if (this.toastTimer !== undefined) window.clearTimeout(this.toastTimer);
    this.host.remove();
  }

  private stopEvent = (event: Event): void => {
    event.preventDefault();
    event.stopPropagation();
  };

  private handleClick = async (event: MouseEvent): Promise<void> => {
    this.stopEvent(event);
    if (this.button.disabled || this.destroyed) return;
    this.button.disabled = true;
    this.button.toggleAttribute('data-busy', true);
    this.button.setAttribute('aria-label', translate(this.locale, 'downloadingPhoto'));
    const success = await this.onDownload().catch(() => false);
    if (this.destroyed) return;
    this.button.removeAttribute('data-busy');
    if (success) {
      this.showSuccess();
      return;
    }
    this.button.disabled = false;
    this.button.setAttribute('aria-label', translate(this.locale, 'downloadPhotoLabel'));
    this.showToast(translate(this.locale, 'downloadPhotoFailed'));
  };

  private showSuccess(): void {
    if (this.toastTimer !== undefined) window.clearTimeout(this.toastTimer);
    this.toast.classList.remove('visible');
    this.button.toggleAttribute('data-success', true);
    this.button.setAttribute('aria-label', translate(this.locale, 'downloadPhotoStarted'));
    this.toastTimer = window.setTimeout(() => {
      this.button.removeAttribute('data-success');
      this.button.disabled = false;
      this.button.setAttribute('aria-label', translate(this.locale, 'downloadPhotoLabel'));
    }, 1_200);
  }

  private showToast(text: string): void {
    if (this.toastTimer !== undefined) window.clearTimeout(this.toastTimer);
    this.toast.textContent = text;
    this.toast.classList.add('visible');
    this.toastTimer = window.setTimeout(() => this.toast.classList.remove('visible'), 1_500);
  }
}
