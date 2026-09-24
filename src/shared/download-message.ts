export const DOWNLOAD_PHOTO_MESSAGE_TYPE = 'download-photo' as const;

export interface DownloadPhotoRequest {
  type: typeof DOWNLOAD_PHOTO_MESSAGE_TYPE;
  url: string;
  filename: string;
}

export type DownloadPhotoResponse =
  | { ok: true; downloadId: number }
  | { ok: false; error: 'invalid-request' | 'download-failed' };

export function isAllowedInstagramImageUrl(value: string): boolean {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:') return false;
    const hostname = url.hostname.toLowerCase();
    return (
      hostname === 'instagram.com' ||
      hostname.endsWith('.instagram.com') ||
      hostname === 'cdninstagram.com' ||
      hostname.endsWith('.cdninstagram.com') ||
      hostname === 'fbcdn.net' ||
      hostname.endsWith('.fbcdn.net')
    );
  } catch {
    return false;
  }
}

export function isSafeDownloadFilename(value: string): boolean {
  return (
    value.length > 0 &&
    value.length <= 180 &&
    !value.includes('/') &&
    !value.includes('\\') &&
    !value.includes('\0') &&
    value !== '.' &&
    value !== '..'
  );
}

export function isDownloadPhotoRequest(value: unknown): value is DownloadPhotoRequest {
  if (!value || typeof value !== 'object') return false;
  const request = value as Partial<DownloadPhotoRequest>;
  return (
    request.type === DOWNLOAD_PHOTO_MESSAGE_TYPE &&
    typeof request.url === 'string' &&
    isAllowedInstagramImageUrl(request.url) &&
    typeof request.filename === 'string' &&
    isSafeDownloadFilename(request.filename)
  );
}
