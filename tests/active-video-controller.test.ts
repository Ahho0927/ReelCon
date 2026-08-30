import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ActiveVideoController } from '../src/content/active-video-controller';
import { DEFAULT_SETTINGS } from '../src/shared/settings';

class FakeIntersectionObserver {
  static instances: FakeIntersectionObserver[] = [];
  readonly observe = vi.fn();
  readonly unobserve = vi.fn();
  readonly disconnect = vi.fn();

  constructor(readonly callback: IntersectionObserverCallback) {
    FakeIntersectionObserver.instances.push(this);
  }
}

let frameCallbacks: FrameRequestCallback[] = [];

function flushAnimationFrames(): void {
  const callbacks = frameCallbacks;
  frameCallbacks = [];
  for (const callback of callbacks) callback(0);
}

function createVisibleVideo(): HTMLVideoElement {
  const video = document.createElement('video');
  video.getBoundingClientRect = () => ({
    left: 100,
    top: 100,
    right: 500,
    bottom: 700,
    width: 400,
    height: 600,
    x: 100,
    y: 100,
    toJSON: () => ({}),
  });
  Object.defineProperty(video, 'duration', { configurable: true, value: 100 });
  document.body.append(video);
  return video;
}

describe('ActiveVideoController lifecycle', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('IntersectionObserver', FakeIntersectionObserver);
    frameCallbacks = [];
    vi.stubGlobal('requestAnimationFrame', vi.fn((callback: FrameRequestCallback) => {
      frameCallbacks.push(callback);
      return frameCallbacks.length;
    }));
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    FakeIntersectionObserver.instances = [];
    document.body.innerHTML = '';
    history.replaceState({}, '', '/');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('observes and activates only eligible videos', () => {
    const video = createVisibleVideo();
    const controller = new ActiveVideoController({ ...DEFAULT_SETTINGS });

    expect(FakeIntersectionObserver.instances[0]?.observe).toHaveBeenCalledWith(video);
    expect(document.querySelectorAll('[data-reel-controls="overlay"]')).toHaveLength(1);

    controller.destroy();
    expect(FakeIntersectionObserver.instances[0]?.disconnect).toHaveBeenCalledOnce();
    expect(document.querySelectorAll('[data-reel-controls="overlay"]')).toHaveLength(0);
  });

  it('cleans up the active session after navigating to an excluded surface', () => {
    createVisibleVideo();
    const controller = new ActiveVideoController({ ...DEFAULT_SETTINGS });
    expect(document.querySelectorAll('[data-reel-controls="overlay"]')).toHaveLength(1);

    history.replaceState({}, '', '/stories/account/');
    vi.advanceTimersByTime(500);
    expect(document.querySelectorAll('[data-reel-controls="overlay"]')).toHaveLength(0);

    controller.destroy();
  });

  it('realigns the scrub bar when a carousel transition moves the video', () => {
    let left = 100;
    const video = createVisibleVideo();
    video.getBoundingClientRect = () => ({
      left,
      top: 100,
      right: left + 400,
      bottom: 700,
      width: 400,
      height: 600,
      x: left,
      y: 100,
      toJSON: () => ({}),
    });
    const controller = new ActiveVideoController({ ...DEFAULT_SETTINGS });
    const overlay = document.querySelector<HTMLElement>('[data-reel-controls="overlay"]');
    expect(overlay?.style.left).toBe('100px');

    left = 260;
    document.dispatchEvent(new Event('transitionend', { bubbles: true }));
    flushAnimationFrames();
    expect(overlay?.style.left).toBe('260px');

    controller.destroy();
  });
});
