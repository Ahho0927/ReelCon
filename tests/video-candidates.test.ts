import { beforeEach, describe, expect, it } from 'vitest';
import { chooseActiveVideo, scoreVideo } from '../src/content/video-candidates';

function rect(left: number, top: number, width = 400, height = 600): DOMRect {
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

function makeVideo(bounds: DOMRect, parent?: HTMLElement): HTMLVideoElement {
  const video = document.createElement('video');
  Object.defineProperty(video, 'paused', { configurable: true, value: true });
  video.getBoundingClientRect = () => bounds;
  (parent ?? document.body).append(video);
  return video;
}

describe('active video selection', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    history.replaceState({}, '', '/');
    Object.defineProperty(document, 'elementsFromPoint', {
      configurable: true,
      value: undefined,
    });
  });

  it('rejects small previews and mostly hidden videos', () => {
    expect(scoreVideo(makeVideo(rect(10, 10, 120, 180)))).toBeNull();
    expect(scoreVideo(makeVideo(rect(10, 800, 400, 600)))).toBeNull();
  });

  it('accepts a normal landscape feed video', () => {
    expect(scoreVideo(makeVideo(rect(100, 100, 468, 200)))).not.toBeNull();
  });

  it('prioritizes the video under the pointer', () => {
    const first = makeVideo(rect(100, 100));
    const second = makeVideo(rect(700, 100));
    expect(chooseActiveVideo([first, second], { x: 800, y: 300 })?.video).toBe(second);
  });

  it('prioritizes a post modal over the feed', () => {
    const feed = makeVideo(rect(500, 100));
    const dialog = document.createElement('div');
    dialog.setAttribute('role', 'dialog');
    document.body.append(dialog);
    const modal = makeVideo(rect(100, 120), dialog);
    expect(chooseActiveVideo([feed, modal])?.video).toBe(modal);
  });

  it('uses the observer ratio when it is available', () => {
    const video = makeVideo(rect(100, 100));
    expect(chooseActiveVideo([video], undefined, () => 0.2)).toBeNull();
  });

  it('rejects videos inside an aria-hidden carousel slide', () => {
    const hiddenSlide = document.createElement('div');
    hiddenSlide.setAttribute('aria-hidden', 'true');
    document.body.append(hiddenSlide);
    expect(scoreVideo(makeVideo(rect(100, 100), hiddenSlide))).toBeNull();
  });

  it('rejects a previous carousel video painted behind the current photo', () => {
    const previousVideo = makeVideo(rect(100, 100));
    const currentPhoto = document.createElement('img');
    document.body.append(currentPhoto);
    Object.defineProperty(document, 'elementsFromPoint', {
      configurable: true,
      value: () => [currentPhoto, previousVideo],
    });

    expect(scoreVideo(previousVideo)).toBeNull();
  });

  it('selects only the topmost video when carousel videos overlap', () => {
    const previousVideo = makeVideo(rect(100, 100));
    const currentVideo = makeVideo(rect(100, 100));
    Object.defineProperty(document, 'elementsFromPoint', {
      configurable: true,
      value: () => [currentVideo, previousVideo],
    });

    expect(chooseActiveVideo([previousVideo, currentVideo])?.video).toBe(currentVideo);
  });
});
