import {
  isDownloadPhotoRequest,
  type DownloadPhotoResponse,
} from '../shared/download-message';

export interface DownloadsApi {
  download(options: chrome.downloads.DownloadOptions): Promise<number>;
}

export async function handleDownloadPhoto(
  message: unknown,
  downloads: DownloadsApi,
): Promise<DownloadPhotoResponse> {
  if (!isDownloadPhotoRequest(message)) {
    return { ok: false, error: 'invalid-request' };
  }

  try {
    const downloadId = await downloads.download({
      url: message.url,
      filename: message.filename,
      conflictAction: 'uniquify',
    });
    return { ok: true, downloadId };
  } catch {
    return { ok: false, error: 'download-failed' };
  }
}

if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage && chrome.downloads) {
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (!isDownloadPhotoRequest(message)) return false;
    handleDownloadPhoto(message, chrome.downloads).then(sendResponse);
    return true;
  });
}
