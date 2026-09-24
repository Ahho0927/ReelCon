import { isAllowedInstagramImageUrl } from '../shared/download-message';

const MIN_PHOTO_WIDTH = 240;
const MIN_PHOTO_HEIGHT = 180;
const MIN_PHOTO_AREA = 60_000;
const CLIPPING_OVERFLOW = new Set(['auto', 'clip', 'hidden', 'scroll']);
const USERNAME_EXCLUSIONS = new Set([
  'accounts',
  'direct',
  'explore',
  'p',
  'reel',
  'reels',
  'stories',
]);

function makeRect(left: number, top: number, right: number, bottom: number): DOMRect {
  return {
    left,
    top,
    right,
    bottom,
    width: Math.max(0, right - left),
    height: Math.max(0, bottom - top),
    x: left,
    y: top,
    toJSON: () => ({}),
  };
}

function intersectRects(first: DOMRect, second: DOMRect): DOMRect {
  return makeRect(
    Math.max(first.left, second.left),
    Math.max(first.top, second.top),
    Math.min(first.right, second.right),
    Math.min(first.bottom, second.bottom),
  );
}

function rectArea(rect: DOMRect): number {
  return rect.width * rect.height;
}

export function getVisiblePhotoRect(
  image: HTMLImageElement,
  article = image.closest<HTMLElement>('article'),
): DOMRect {
  let visibleRect = intersectRects(
    image.getBoundingClientRect(),
    makeRect(0, 0, window.innerWidth, window.innerHeight),
  );
  let ancestor = image.parentElement;
  while (ancestor) {
    const style = getComputedStyle(ancestor);
    const overflowX = style.overflowX || style.overflow;
    const overflowY = style.overflowY || style.overflow;
    if (CLIPPING_OVERFLOW.has(overflowX) || CLIPPING_OVERFLOW.has(overflowY)) {
      const bounds = ancestor.getBoundingClientRect();
      const horizontal = CLIPPING_OVERFLOW.has(overflowX)
        ? makeRect(bounds.left, visibleRect.top, bounds.right, visibleRect.bottom)
        : visibleRect;
      visibleRect = intersectRects(visibleRect, horizontal);
      const vertical = CLIPPING_OVERFLOW.has(overflowY)
        ? makeRect(visibleRect.left, bounds.top, visibleRect.right, bounds.bottom)
        : visibleRect;
      visibleRect = intersectRects(visibleRect, vertical);
    }
    if (ancestor === article) break;
    ancestor = ancestor.parentElement;
  }
  return visibleRect;
}

function isHidden(element: HTMLElement): boolean {
  if (element.closest('[aria-hidden="true"], [hidden]')) return true;
  const style = getComputedStyle(element);
  return (
    style.display === 'none' ||
    style.visibility === 'hidden' ||
    (style.opacity !== '' && Number(style.opacity) === 0)
  );
}

function topmostMediaAtCenter(image: HTMLImageElement, rect: DOMRect): Element | null {
  if (typeof document.elementsFromPoint !== 'function') return image;
  const x = Math.max(0, Math.min(window.innerWidth - 1, rect.left + rect.width / 2));
  const y = Math.max(0, Math.min(window.innerHeight - 1, rect.top + rect.height / 2));
  const stack = document.elementsFromPoint(x, y);
  // Instagram can create media elements in a different JS realm. Tag names are
  // stable across realms while instanceof can reject otherwise valid DOM nodes.
  return stack.find((element) => element.tagName === 'IMG' || element.tagName === 'VIDEO') ?? null;
}

export function isEligiblePostPhoto(image: HTMLImageElement): boolean {
  if (!image.isConnected || isHidden(image)) return false;
  const rect = image.getBoundingClientRect();
  const visibleRect = getVisiblePhotoRect(image);
  if (
    rect.width < MIN_PHOTO_WIDTH ||
    rect.height < MIN_PHOTO_HEIGHT ||
    rect.width * rect.height < MIN_PHOTO_AREA ||
    rectArea(visibleRect) < MIN_PHOTO_AREA * 0.15
  ) {
    return false;
  }
  const topmostMedia = topmostMediaAtCenter(image, visibleRect);
  // elementsFromPoint occasionally omits image layers while Instagram is
  // compositing a carousel. Treat that as inconclusive; an explicit video or
  // different image still excludes a covered/stale slide.
  return topmostMedia === null || topmostMedia === image;
}

export function choosePostPhoto(article: HTMLElement): HTMLImageElement | null {
  const candidates = [...article.querySelectorAll<HTMLImageElement>('img')]
    .filter(isEligiblePostPhoto)
    .map((image) => {
      const rect = image.getBoundingClientRect();
      return { image, visibleArea: rectArea(getVisiblePhotoRect(image, article)), area: rectArea(rect) };
    })
    .sort((first, second) => second.visibleArea - first.visibleArea || second.area - first.area);
  return candidates[0]?.image ?? null;
}

interface SrcsetCandidate {
  url: string;
  score: number;
}

export function parseSrcset(srcset: string): SrcsetCandidate[] {
  return srcset
    .split(',')
    .map((candidate) => candidate.trim())
    .filter(Boolean)
    .map((candidate) => {
      const [url, descriptor = '1x'] = candidate.split(/\s+/);
      const width = descriptor.match(/^(\d+(?:\.\d+)?)w$/);
      const density = descriptor.match(/^(\d+(?:\.\d+)?)x$/);
      return {
        url,
        score: width ? Number(width[1]) : density ? Number(density[1]) * 10_000 : 1,
      };
    })
    .filter((candidate) => isAllowedInstagramImageUrl(candidate.url));
}

export function getHighestResolutionUrl(image: HTMLImageElement): string | null {
  const srcset = parseSrcset(image.getAttribute('srcset') ?? '')
    .sort((first, second) => second.score - first.score);
  if (srcset[0]) return srcset[0].url;
  for (const value of [image.currentSrc, image.src, image.getAttribute('src') ?? '']) {
    if (value && isAllowedInstagramImageUrl(value)) return value;
  }
  return null;
}

function sanitizeFilenamePart(value: string): string {
  return value
    .normalize('NFKC')
    .replace(/[^\p{L}\p{N}._-]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}

function getPostShortcode(article: HTMLElement): string | null {
  for (const anchor of article.querySelectorAll<HTMLAnchorElement>('a[href]')) {
    const match = new URL(anchor.href, location.href).pathname.match(/^\/p\/([^/]+)/);
    if (match) return sanitizeFilenamePart(match[1]);
  }
  const routeMatch = location.pathname.match(/^\/p\/([^/]+)/);
  return routeMatch ? sanitizeFilenamePart(routeMatch[1]) : null;
}

function getUsername(article: HTMLElement): string | null {
  const anchors = article.querySelectorAll<HTMLAnchorElement>('header a[href], a[href]');
  for (const anchor of anchors) {
    const match = new URL(anchor.href, location.href).pathname.match(/^\/([^/]+)\/?$/);
    const username = match?.[1]?.toLowerCase();
    if (username && !USERNAME_EXCLUSIONS.has(username)) return sanitizeFilenamePart(username);
  }
  return null;
}

function getCarouselIndex(article: HTMLElement, image: HTMLImageElement): number | null {
  const item = image.closest('li');
  if (!item || !item.parentElement || !article.contains(item.parentElement)) return null;
  const mediaItems = [...item.parentElement.children].filter((child) =>
    child.querySelector('img, video'),
  );
  if (mediaItems.length < 2) return null;
  const index = mediaItems.indexOf(item);
  return index >= 0 ? index + 1 : null;
}

function getUrlExtension(urlValue: string): string {
  try {
    const match = new URL(urlValue).pathname.match(/\.(jpe?g|png|webp|avif)$/i);
    return match ? match[1].toLowerCase().replace('jpeg', 'jpg') : 'jpg';
  } catch {
    return 'jpg';
  }
}

export function buildPhotoFilename(
  article: HTMLElement,
  image: HTMLImageElement,
  url: string,
  fallbackId = Date.now(),
): string {
  const username = getUsername(article) ?? 'post';
  const shortcode = getPostShortcode(article) ?? String(fallbackId);
  const carouselIndex = getCarouselIndex(article, image);
  const slide = carouselIndex ? `-${carouselIndex}` : '';
  return `instagram-${username}-${shortcode}${slide}.${getUrlExtension(url)}`;
}
