import type { Settings } from '../shared/settings';
import {
  DOWNLOAD_PHOTO_MESSAGE_TYPE,
  type DownloadPhotoRequest,
  type DownloadPhotoResponse,
} from '../shared/download-message';
import {
  detectInstagramLocale,
  rememberInstagramLocale,
  type SupportedLocale,
} from '../shared/i18n';
import {
  buildPhotoFilename,
  choosePostPhoto,
  getHighestResolutionUrl,
  getVisiblePhotoRect,
} from './photo-candidates';
import { PhotoDownloadOverlay } from './photo-download-overlay';

interface PhotoSession {
  article: HTMLElement;
  image: HTMLImageElement;
  overlay: PhotoDownloadOverlay;
}

function isPhotoDownloadPath(pathname: string): boolean {
  return pathname === '/' || pathname.startsWith('/p/');
}

function pointInsideRect(x: number, y: number, rect: DOMRect): boolean {
  return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
}

async function requestDownload(request: DownloadPhotoRequest): Promise<boolean> {
  if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) return false;
  const response = await chrome.runtime.sendMessage(request) as DownloadPhotoResponse | undefined;
  return response?.ok === true;
}

export class PhotoDownloadController {
  private settings: Settings;
  private sessions = new Map<HTMLElement, PhotoSession>();
  private observer: MutationObserver;
  private locale: SupportedLocale;
  private lastUrl = location.href;
  private interval: number;
  private refreshFrame = 0;
  private destroyed = false;
  private pointer: { x: number; y: number } | null = null;

  constructor(settings: Settings) {
    this.settings = settings;
    this.locale = detectInstagramLocale();
    this.observer = new MutationObserver(this.onMutation);
    this.observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['aria-hidden', 'class', 'hidden', 'lang', 'src', 'srcset', 'style'],
    });
    window.addEventListener('pointermove', this.onPointerMove, { passive: true, capture: true });
    window.addEventListener('scroll', this.scheduleRefresh, { passive: true, capture: true });
    window.addEventListener('resize', this.scheduleRefresh, { passive: true });
    document.addEventListener('transitionend', this.scheduleRefresh, true);
    this.interval = window.setInterval(this.checkRoute, 500);
    this.refresh();
  }

  updateSettings(settings: Settings): void {
    this.settings = settings;
    if (!settings.enabled || !settings.photoDownloadEnabled) {
      this.clearSessions();
      return;
    }
    this.scheduleRefresh();
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.observer.disconnect();
    window.clearInterval(this.interval);
    cancelAnimationFrame(this.refreshFrame);
    window.removeEventListener('pointermove', this.onPointerMove, true);
    window.removeEventListener('scroll', this.scheduleRefresh, true);
    window.removeEventListener('resize', this.scheduleRefresh);
    document.removeEventListener('transitionend', this.scheduleRefresh, true);
    this.clearSessions();
  }

  private refresh = (): void => {
    if (this.destroyed) return;
    this.checkRoute();
    if (!this.settings.enabled || !this.settings.photoDownloadEnabled || !isPhotoDownloadPath(location.pathname)) {
      this.clearSessions();
      return;
    }

    const articles = new Set(document.querySelectorAll<HTMLElement>('article'));
    for (const [article, session] of this.sessions) {
      if (articles.has(article) && article.isConnected) continue;
      session.overlay.destroy();
      this.sessions.delete(article);
    }

    for (const article of articles) {
      const image = choosePostPhoto(article);
      const existing = this.sessions.get(article);
      if (!image) {
        existing?.overlay.destroy();
        this.sessions.delete(article);
        continue;
      }

      if (existing?.image === image) {
        this.updateSessionLayout(existing);
        continue;
      }

      existing?.overlay.destroy();
      const session = {} as PhotoSession;
      const overlay = new PhotoDownloadOverlay(this.locale, () => this.downloadSession(session));
      session.article = article;
      session.image = image;
      session.overlay = overlay;
      this.sessions.set(article, session);
      this.updateSessionLayout(session);
    }
  };

  private updateSessionLayout(session: PhotoSession): void {
    const rect = getVisiblePhotoRect(session.image, session.article);
    session.overlay.setRect(rect);
    const hovered = this.pointer ? pointInsideRect(this.pointer.x, this.pointer.y, rect) : false;
    session.overlay.setHovered(hovered);
  }

  private downloadSession(session: PhotoSession): Promise<boolean> {
    if (!session.image.isConnected || !session.article.isConnected) return Promise.resolve(false);
    const url = getHighestResolutionUrl(session.image);
    if (!url) return Promise.resolve(false);
    return requestDownload({
      type: DOWNLOAD_PHOTO_MESSAGE_TYPE,
      url,
      filename: buildPhotoFilename(session.article, session.image, url),
    });
  }

  private onPointerMove = (event: PointerEvent): void => {
    this.pointer = { x: event.clientX, y: event.clientY };
    for (const session of this.sessions.values()) {
      session.overlay.setHovered(pointInsideRect(
        event.clientX,
        event.clientY,
        getVisiblePhotoRect(session.image, session.article),
      ));
    }
  };

  private onMutation = (records: MutationRecord[]): void => {
    const relevant = records.some((record) =>
      !(record.target instanceof window.Element) ||
      !record.target.closest('[data-reel-controls="photo-download"]'),
    );
    if (!relevant) return;
    if (records.some((record) => record.attributeName === 'lang')) {
      const locale = detectInstagramLocale();
      if (locale !== this.locale) {
        this.locale = locale;
        for (const session of this.sessions.values()) session.overlay.setLocale(locale);
        rememberInstagramLocale(locale).catch(() => undefined);
      }
    }
    this.scheduleRefresh();
  };

  private scheduleRefresh = (): void => {
    if (this.refreshFrame || this.destroyed) return;
    this.refreshFrame = requestAnimationFrame(() => {
      this.refreshFrame = 0;
      this.refresh();
    });
  };

  private checkRoute = (): void => {
    if (location.href === this.lastUrl) return;
    this.lastUrl = location.href;
    this.clearSessions();
    this.scheduleRefresh();
  };

  private clearSessions(): void {
    for (const session of this.sessions.values()) session.overlay.destroy();
    this.sessions.clear();
  }
}
