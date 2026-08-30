export type SurfaceKind = 'reel' | 'feed' | 'postModal';

export function isSupportedPath(pathname: string): boolean {
  return (
    pathname === '/' ||
    pathname === '/reels' ||
    pathname.startsWith('/reels/') ||
    pathname.startsWith('/reel/') ||
    pathname.startsWith('/p/')
  );
}

export function getSurfaceKind(video: HTMLVideoElement): SurfaceKind {
  if (video.closest('[role="dialog"], [aria-modal="true"]')) return 'postModal';
  if (location.pathname.startsWith('/reel')) return 'reel';
  return 'feed';
}
