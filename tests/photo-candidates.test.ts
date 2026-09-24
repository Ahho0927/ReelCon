import { beforeEach, describe, expect, it } from 'vitest';
import {
  buildPhotoFilename,
  choosePostPhoto,
  getHighestResolutionUrl,
  getVisiblePhotoRect,
  isEligiblePostPhoto,
  parseSrcset,
} from '../src/content/photo-candidates';

function rect(left: number, top: number, width: number, height: number): DOMRect {
  return {
    left,
    top,
    width,
    height,
    right: left + width,
    bottom: top + height,
    x: left,
    y: top,
    toJSON: () => ({}),
  };
}

function makeImage(parent: HTMLElement, bounds: DOMRect): HTMLImageElement {
  const image = document.createElement('img');
  image.getBoundingClientRect = () => bounds;
  parent.append(image);
  return image;
}

describe('Instagram post photo candidates', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    history.replaceState({}, '', '/');
    Object.defineProperty(document, 'elementsFromPoint', {
      configurable: true,
      value: undefined,
    });
  });

  it('chooses the large post photo instead of an avatar', () => {
    const article = document.createElement('article');
    document.body.append(article);
    makeImage(article, rect(100, 40, 40, 40));
    const photo = makeImage(article, rect(100, 100, 468, 585));

    expect(choosePostPhoto(article)).toBe(photo);
  });

  it('rejects hidden carousel slides and a photo covered by video', () => {
    const article = document.createElement('article');
    document.body.append(article);
    const hiddenSlide = document.createElement('div');
    hiddenSlide.setAttribute('aria-hidden', 'true');
    article.append(hiddenSlide);
    const hidden = makeImage(hiddenSlide, rect(100, 100, 468, 585));
    expect(isEligiblePostPhoto(hidden)).toBe(false);

    const visible = makeImage(article, rect(100, 100, 468, 585));
    const video = document.createElement('video');
    article.append(video);
    Object.defineProperty(document, 'elementsFromPoint', {
      configurable: true,
      value: () => [video, visible],
    });
    expect(isEligiblePostPhoto(visible)).toBe(false);
  });

  it('keeps a visible photo when hit testing returns no media element', () => {
    const article = document.createElement('article');
    document.body.append(article);
    const visible = makeImage(article, rect(100, 100, 468, 585));
    const overlay = document.createElement('button');
    Object.defineProperty(document, 'elementsFromPoint', {
      configurable: true,
      value: () => [overlay],
    });

    expect(isEligiblePostPhoto(visible)).toBe(true);
  });

  it('clips a wide carousel image to the visible media viewport', () => {
    const article = document.createElement('article');
    const viewport = document.createElement('div');
    viewport.style.overflow = 'hidden';
    article.append(viewport);
    document.body.append(article);
    article.getBoundingClientRect = () => rect(25, 84, 855, 1138);
    viewport.getBoundingClientRect = () => rect(25, 84, 855, 1138);
    const image = makeImage(viewport, rect(25, 84, 1_685, 1138));
    Object.defineProperty(document, 'elementsFromPoint', {
      configurable: true,
      value: () => [image],
    });

    const visible = getVisiblePhotoRect(image, article);
    expect(visible.left).toBe(25);
    expect(visible.right).toBe(880);
    expect(visible.width).toBe(855);
    expect(choosePostPhoto(article)).toBe(image);
  });

  it('uses the largest allowed srcset URL and falls back to currentSrc', () => {
    const image = document.createElement('img');
    image.setAttribute('srcset', [
      'https://scontent.cdninstagram.com/small.jpg 320w',
      'https://scontent.cdninstagram.com/large.jpg 1080w',
      'https://example.com/rejected.jpg 2000w',
    ].join(', '));
    expect(parseSrcset(image.srcset)).toHaveLength(2);
    expect(getHighestResolutionUrl(image)).toBe('https://scontent.cdninstagram.com/large.jpg');

    image.removeAttribute('srcset');
    Object.defineProperty(image, 'currentSrc', {
      configurable: true,
      value: 'https://scontent.xx.fbcdn.net/fallback.webp',
    });
    expect(getHighestResolutionUrl(image)).toBe('https://scontent.xx.fbcdn.net/fallback.webp');
  });

  it('builds a safe post filename with the current carousel index', () => {
    const article = document.createElement('article');
    article.innerHTML = `
      <header><a href="/sample.user/">sample.user</a></header>
      <a href="/p/AbC_123/">post</a>
      <ul><li><img></li><li><img></li></ul>
    `;
    document.body.append(article);
    const image = article.querySelectorAll('img')[1];
    expect(buildPhotoFilename(
      article,
      image,
      'https://scontent.cdninstagram.com/photo.jpeg?x=1',
      123,
    )).toBe('instagram-sample.user-AbC_123-2.jpg');
  });
});
