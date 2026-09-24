import { describe, expect, it, vi } from 'vitest';
import { handleDownloadPhoto } from '../src/background';
import { DOWNLOAD_PHOTO_MESSAGE_TYPE } from '../src/shared/download-message';

describe('photo download background handler', () => {
  it('starts a safe download without forcing a save dialog', async () => {
    const download = vi.fn().mockResolvedValue(42);
    const response = await handleDownloadPhoto({
      type: DOWNLOAD_PHOTO_MESSAGE_TYPE,
      url: 'https://scontent.cdninstagram.com/photo.jpg?token=abc',
      filename: 'instagram-user-code.jpg',
    }, { download });

    expect(response).toEqual({ ok: true, downloadId: 42 });
    expect(download).toHaveBeenCalledWith({
      url: 'https://scontent.cdninstagram.com/photo.jpg?token=abc',
      filename: 'instagram-user-code.jpg',
      conflictAction: 'uniquify',
    });
    expect(download.mock.calls[0]?.[0]).not.toHaveProperty('saveAs');
  });

  it('rejects unsafe URLs and filenames', async () => {
    const download = vi.fn();
    await expect(handleDownloadPhoto({
      type: DOWNLOAD_PHOTO_MESSAGE_TYPE,
      url: 'https://example.com/photo.jpg',
      filename: 'photo.jpg',
    }, { download })).resolves.toEqual({ ok: false, error: 'invalid-request' });
    await expect(handleDownloadPhoto({
      type: DOWNLOAD_PHOTO_MESSAGE_TYPE,
      url: 'https://scontent.cdninstagram.com/photo.jpg',
      filename: '../photo.jpg',
    }, { download })).resolves.toEqual({ ok: false, error: 'invalid-request' });
    expect(download).not.toHaveBeenCalled();
  });

  it('returns a stable error when Chrome rejects the download', async () => {
    const download = vi.fn().mockRejectedValue(new Error('blocked'));
    await expect(handleDownloadPhoto({
      type: DOWNLOAD_PHOTO_MESSAGE_TYPE,
      url: 'https://scontent.xx.fbcdn.net/photo.jpg',
      filename: 'instagram-user-code.jpg',
    }, { download })).resolves.toEqual({ ok: false, error: 'download-failed' });
  });
});
