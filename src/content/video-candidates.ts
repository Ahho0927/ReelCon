import { getSurfaceKind, type SurfaceKind } from './surfaces';

const MIN_SHORT_EDGE = 150;
const MIN_LONG_EDGE = 240;
const MIN_VIDEO_AREA = 70_000;
const MIN_VISIBLE_RATIO = 0.42;

export interface VideoCandidate {
  video: HTMLVideoElement;
  rect: DOMRect;
  ratio: number;
  surface: SurfaceKind;
  score: number;
}

export interface Point {
  x: number;
  y: number;
}

interface Bounds {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

const CLIPPING_OVERFLOW = new Set(['auto', 'clip', 'hidden', 'scroll']);

function area(bounds: Bounds): number {
  return Math.max(0, bounds.right - bounds.left) * Math.max(0, bounds.bottom - bounds.top);
}

function isHiddenByStyle(element: Element): boolean {
  if (element instanceof HTMLElement) {
    if (element.hidden || element.matches('[inert], [aria-hidden="true"]')) return true;
  }
  const style = getComputedStyle(element);
  return (
    style.display === 'none' ||
    style.visibility === 'hidden' ||
    style.visibility === 'collapse' ||
    style.contentVisibility === 'hidden' ||
    Number.parseFloat(style.opacity || '1') <= 0.01
  );
}

function isTopmostMedia(video: HTMLVideoElement, bounds: Bounds): boolean {
  if (typeof document.elementsFromPoint !== 'function') return true;
  const width = bounds.right - bounds.left;
  const height = bounds.bottom - bounds.top;
  if (width <= 0 || height <= 0) return false;

  const samples = [0.3, 0.5, 0.7];
  let foundOtherMedia = false;
  for (const xRatio of samples) {
    const x = bounds.left + width * xRatio;
    const y = bounds.top + height * 0.5;
    const topMedia = document.elementsFromPoint(x, y).find(
      (element) => element instanceof HTMLVideoElement || element instanceof HTMLImageElement,
    );
    if (!topMedia) continue;
    if (topMedia === video || video.contains(topMedia)) return true;
    foundOtherMedia = true;
  }
  return !foundOtherMedia;
}

export function getVisibleRatio(rect: Pick<DOMRect, 'left' | 'top' | 'right' | 'bottom' | 'width' | 'height'>): number {
  if (rect.width <= 0 || rect.height <= 0) return 0;
  const visibleWidth = Math.max(0, Math.min(rect.right, innerWidth) - Math.max(rect.left, 0));
  const visibleHeight = Math.max(0, Math.min(rect.bottom, innerHeight) - Math.max(rect.top, 0));
  return (visibleWidth * visibleHeight) / (rect.width * rect.height);
}

export function getEffectiveVisibleRatio(video: HTMLVideoElement, rect: DOMRect): number {
  if (!video.isConnected || rect.width <= 0 || rect.height <= 0) return 0;
  if (typeof video.checkVisibility === 'function' && !video.checkVisibility({
    checkOpacity: true,
    checkVisibilityCSS: true,
  })) {
    return 0;
  }

  const visible: Bounds = {
    left: Math.max(0, rect.left),
    top: Math.max(0, rect.top),
    right: Math.min(innerWidth, rect.right),
    bottom: Math.min(innerHeight, rect.bottom),
  };

  let current: Element | null = video;
  while (current && current !== document.documentElement) {
    if (isHiddenByStyle(current)) return 0;
    if (current instanceof HTMLElement && current !== video) {
      const currentRect = current.getBoundingClientRect();
      if (currentRect.width > 0 && currentRect.height > 0) {
        const style = getComputedStyle(current);
        const overflowX = style.overflowX || style.overflow;
        const overflowY = style.overflowY || style.overflow;
        if (CLIPPING_OVERFLOW.has(overflowX)) {
          visible.left = Math.max(visible.left, currentRect.left);
          visible.right = Math.min(visible.right, currentRect.right);
        }
        if (CLIPPING_OVERFLOW.has(overflowY)) {
          visible.top = Math.max(visible.top, currentRect.top);
          visible.bottom = Math.min(visible.bottom, currentRect.bottom);
        }
      }
    }
    current = current.parentElement;
  }

  const ratio = area(visible) / (rect.width * rect.height);
  if (ratio <= 0 || !isTopmostMedia(video, visible)) return 0;
  return ratio;
}

export function containsPoint(rect: Pick<DOMRect, 'left' | 'top' | 'right' | 'bottom'>, point?: Point): boolean {
  return Boolean(
    point &&
      point.x >= rect.left &&
      point.x <= rect.right &&
      point.y >= rect.top &&
      point.y <= rect.bottom,
  );
}

export function scoreVideo(
  video: HTMLVideoElement,
  pointer?: Point,
  observedRatio?: number,
): VideoCandidate | null {
  const rect = video.getBoundingClientRect();
  const shortEdge = Math.min(rect.width, rect.height);
  const longEdge = Math.max(rect.width, rect.height);
  if (
    shortEdge < MIN_SHORT_EDGE ||
    longEdge < MIN_LONG_EDGE ||
    rect.width * rect.height < MIN_VIDEO_AREA
  ) {
    return null;
  }

  const effectiveRatio = getEffectiveVisibleRatio(video, rect);
  const ratio = observedRatio === undefined
    ? effectiveRatio
    : Math.min(observedRatio, effectiveRatio);
  if (ratio < MIN_VISIBLE_RATIO) return null;

  const surface = getSurfaceKind(video);
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  const viewportCenterX = innerWidth / 2;
  const viewportCenterY = innerHeight / 2;
  const distance = Math.hypot(centerX - viewportCenterX, centerY - viewportCenterY);
  const modalBonus = surface === 'postModal' ? 1_000_000 : 0;
  const pointerBonus = containsPoint(rect, pointer) ? 500_000 : 0;
  const playingBonus = video.paused ? 0 : 20_000;

  return {
    video,
    rect,
    ratio,
    surface,
    score: modalBonus + pointerBonus + playingBonus + ratio * 10_000 - distance,
  };
}

export function chooseActiveVideo(
  videos: Iterable<HTMLVideoElement>,
  pointer?: Point,
  getObservedRatio?: (video: HTMLVideoElement) => number | undefined,
): VideoCandidate | null {
  let best: VideoCandidate | null = null;
  for (const video of videos) {
    const candidate = scoreVideo(video, pointer, getObservedRatio?.(video));
    if (candidate && (!best || candidate.score > best.score)) best = candidate;
  }
  return best;
}
