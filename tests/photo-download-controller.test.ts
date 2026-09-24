import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PhotoDownloadController } from '../src/content/photo-download-controller';
import { DEFAULT_SETTINGS } from '../src/shared/settings';

function appendPhoto(): HTMLImageElement {
  const article = document.createElement('article');
  article.innerHTML = `
    <header><a href="/sample/">sample</a></header>
    <a href="/p/PostCode/">post</a>
  `;
  const image = document.createElement('img');
  image.setAttribute('srcset', [
    'https://scontent.cdninstagram.com/small.jpg 320w',
    'https://scontent.cdninstagram.com/large.jpg 1080w',
  ].join(', '));
  image.getBoundingClientRect = () => ({
    left: 100,
    top: 100,
    right: 568,
    bottom: 685,
    width: 468,
    height: 585,
    x: 100,
    y: 100,
    toJSON: () => ({}),
  });
  article.append(image);
  document.body.append(article);
  Object.defineProperty(document, 'elementsFromPoint', {
    configurable: true,
    value: () => [image],
  });
  return image;
}

describe('PhotoDownloadController', () => {
  const sendMessage = vi.fn();
  let controller: PhotoDownloadController | null = null;

  beforeEach(() => {
    vi.useFakeTimers();
    document.body.innerHTML = '';
    for (const host of document.querySelectorAll('[data-reel-controls="photo-download"]')) host.remove();
    document.documentElement.lang = 'en';
    history.replaceState({}, '', '/');
    sendMessage.mockReset().mockResolvedValue({ ok: true, downloadId: 7 });
    vi.stubGlobal('chrome', {
      runtime: { sendMessage },
      storage: { local: { set: vi.fn().mockResolvedValue(undefined) } },
    });
  });

  afterEach(() => {
    controller?.destroy();
    controller = null;
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('shows a bottom-right overlay and downloads the highest-resolution photo', async () => {
    appendPhoto();
    controller = new PhotoDownloadController({ ...DEFAULT_SETTINGS });
    const host = document.querySelector<HTMLElement>('[data-reel-controls="photo-download"]');
    const button = host?.shadowRoot?.querySelector<HTMLButtonElement>('button');
    expect(host?.style.left).toBe('100px');
    expect(host?.style.height).toBe('585px');

    window.dispatchEvent(new MouseEvent('pointermove', { clientX: 540, clientY: 650 }));
    expect(host?.hasAttribute('data-hovered')).toBe(true);
    button?.click();
    await Promise.resolve();
    await Promise.resolve();
    expect(sendMessage).toHaveBeenCalledWith({
      type: 'download-photo',
      url: 'https://scontent.cdninstagram.com/large.jpg',
      filename: 'instagram-sample-PostCode.jpg',
    });
  });

  it('removes overlays when the setting or route is disabled', () => {
    appendPhoto();
    controller = new PhotoDownloadController({ ...DEFAULT_SETTINGS });
    expect(document.querySelector('[data-reel-controls="photo-download"]')).not.toBeNull();

    controller.updateSettings({ ...DEFAULT_SETTINGS, photoDownloadEnabled: false });
    expect(document.querySelector('[data-reel-controls="photo-download"]')).toBeNull();

    controller.updateSettings({ ...DEFAULT_SETTINGS, photoDownloadEnabled: true });
    history.replaceState({}, '', '/explore/');
    vi.advanceTimersByTime(500);
    expect(document.querySelector('[data-reel-controls="photo-download"]')).toBeNull();
  });

  it('positions the overlay inside a clipped carousel viewport', () => {
    const image = appendPhoto();
    const article = image.closest('article') as HTMLElement;
    const viewport = document.createElement('div');
    viewport.style.overflow = 'hidden';
    viewport.getBoundingClientRect = () => ({
      left: 100,
      top: 100,
      right: 568,
      bottom: 685,
      width: 468,
      height: 585,
      x: 100,
      y: 100,
      toJSON: () => ({}),
    });
    article.append(viewport);
    viewport.append(image);
    image.getBoundingClientRect = () => ({
      left: 100,
      top: 100,
      right: 1_100,
      bottom: 685,
      width: 1_000,
      height: 585,
      x: 100,
      y: 100,
      toJSON: () => ({}),
    });

    controller = new PhotoDownloadController({ ...DEFAULT_SETTINGS });
    const host = document.querySelector<HTMLElement>('[data-reel-controls="photo-download"]');
    expect(host?.style.left).toBe('100px');
    expect(host?.style.width).toBe('468px');
    expect(host?.style.height).toBe('585px');
  });
});
