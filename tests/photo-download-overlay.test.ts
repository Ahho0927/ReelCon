import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PhotoDownloadOverlay } from '../src/content/photo-download-overlay';

describe('photo download overlay', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    document.documentElement.lang = 'ko';
  });

  it('positions the button and replaces it with a check icon after success', async () => {
    const onDownload = vi.fn().mockResolvedValue(true);
    const overlay = new PhotoDownloadOverlay('ko', onDownload);
    overlay.setRect({
      left: 100,
      top: 120,
      width: 468,
      height: 585,
      right: 568,
      bottom: 705,
      x: 100,
      y: 120,
      toJSON: () => ({}),
    });
    overlay.setHovered(true);

    expect(overlay.host.style.left).toBe('100px');
    expect(overlay.host.style.height).toBe('585px');
    expect(overlay.host.hasAttribute('data-hovered')).toBe(true);
    expect(overlay.button.getAttribute('aria-label')).toBe('사진 다운로드');

    const bubbled = vi.fn();
    document.addEventListener('click', bubbled);
    overlay.button.click();
    await vi.waitFor(() => expect(onDownload).toHaveBeenCalledOnce());
    await vi.waitFor(() => {
      const toast = overlay.host.shadowRoot?.querySelector('.toast');
      expect(overlay.button.hasAttribute('data-success')).toBe(true);
      expect(overlay.button.getAttribute('aria-label')).toBe('다운로드를 시작했습니다');
      expect(toast?.classList.contains('visible')).toBe(false);
    });
    expect(bubbled).not.toHaveBeenCalled();
    overlay.destroy();
  });

  it('announces failure and updates its locale', async () => {
    const overlay = new PhotoDownloadOverlay('en', vi.fn().mockResolvedValue(false));
    overlay.setLocale('ja');
    expect(overlay.button.getAttribute('aria-label')).toBe('写真をダウンロード');
    overlay.button.click();
    await vi.waitFor(() => {
      expect(overlay.host.shadowRoot?.querySelector('.toast')?.textContent)
        .toBe('写真をダウンロードできませんでした');
    });
    overlay.destroy();
  });
});
