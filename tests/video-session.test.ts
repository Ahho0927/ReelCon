import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_SETTINGS } from '../src/shared/settings';
import { VideoSession } from '../src/content/video-session';

function pointer(type: string, x: number, y: number): Event {
  const event = new MouseEvent(type, {
    bubbles: true,
    cancelable: true,
    button: 0,
    clientX: x,
    clientY: y,
  });
  Object.defineProperties(event, {
    pointerId: { value: 1 },
    isPrimary: { value: true },
  });
  return event;
}

function createVideo(initialPaused = false): {
  video: HTMLVideoElement;
  play: ReturnType<typeof vi.fn>;
  pause: ReturnType<typeof vi.fn>;
} {
  let paused = initialPaused;
  const video = document.createElement('video');
  video.getBoundingClientRect = () => ({
    left: 0,
    top: 0,
    right: 400,
    bottom: 600,
    width: 400,
    height: 600,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  });
  Object.defineProperty(video, 'paused', { configurable: true, get: () => paused });
  Object.defineProperty(video, 'duration', { configurable: true, value: 100 });
  Object.defineProperty(video, 'playbackRate', { configurable: true, writable: true, value: 1 });
  Object.defineProperty(video, 'currentTime', { configurable: true, writable: true, value: 20 });
  const play = vi.fn(async () => { paused = false; });
  const pause = vi.fn(() => { paused = true; });
  video.play = play;
  video.pause = pause;
  document.body.append(video);
  return { video, play, pause };
}

describe('VideoSession gesture state', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    document.body.innerHTML = '';
    document.documentElement.lang = 'ko';
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('pauses on a center hold and resumes only if it was playing', () => {
    const { video, play, pause } = createVideo(false);
    const session = new VideoSession(video, { ...DEFAULT_SETTINGS });

    video.dispatchEvent(pointer('pointerdown', 200, 250));
    vi.advanceTimersByTime(300);
    expect(pause).toHaveBeenCalledOnce();

    video.dispatchEvent(pointer('pointerup', 200, 250));
    expect(play).toHaveBeenCalledOnce();
    session.destroy();
  });

  it('plays at 2x while an edge is held and restores on release', () => {
    const { video, play } = createVideo(false);
    const session = new VideoSession(video, { ...DEFAULT_SETTINGS });

    video.dispatchEvent(pointer('pointerdown', 20, 200));
    vi.advanceTimersByTime(300);
    expect(video.playbackRate).toBe(2);
    expect(play).toHaveBeenCalledOnce();
    video.dispatchEvent(pointer('pointerup', 20, 200));
    expect(video.playbackRate).toBe(1);
    session.destroy();
  });

  it('temporarily plays a paused video during an edge hold and pauses it again', () => {
    const { video, play, pause } = createVideo(true);
    const session = new VideoSession(video, { ...DEFAULT_SETTINGS });

    video.dispatchEvent(pointer('pointerdown', 20, 200));
    vi.advanceTimersByTime(300);
    expect(play).toHaveBeenCalledOnce();
    expect(video.playbackRate).toBe(2);

    video.dispatchEvent(pointer('pointerup', 20, 200));
    expect(pause).toHaveBeenCalledOnce();
    expect(video.playbackRate).toBe(1);
    session.destroy();
  });

  it('locks and unlocks 2x with the same downward gesture', () => {
    const { video } = createVideo(false);
    const session = new VideoSession(video, { ...DEFAULT_SETTINGS });

    video.dispatchEvent(pointer('pointerdown', 20, 180));
    vi.advanceTimersByTime(300);
    video.dispatchEvent(pointer('pointermove', 20, 260));
    video.dispatchEvent(pointer('pointerup', 20, 260));
    expect(video.playbackRate).toBe(2);

    video.dispatchEvent(pointer('pointerdown', 20, 180));
    vi.advanceTimersByTime(300);
    video.dispatchEvent(pointer('pointermove', 20, 260));
    video.dispatchEvent(pointer('pointerup', 20, 260));
    expect(video.playbackRate).toBe(1);
    session.destroy();
  });

  it('accepts holds through a full-size Instagram button wrapper', () => {
    const { video, pause } = createVideo(false);
    const wrapper = document.createElement('div');
    wrapper.setAttribute('role', 'button');
    wrapper.getBoundingClientRect = video.getBoundingClientRect;
    const mediaSurface = document.createElement('span');
    wrapper.append(video, mediaSurface);
    document.body.append(wrapper);
    const session = new VideoSession(video, { ...DEFAULT_SETTINGS });

    mediaSurface.dispatchEvent(pointer('pointerdown', 200, 250));
    vi.advanceTimersByTime(300);
    expect(pause).toHaveBeenCalledOnce();
    mediaSurface.dispatchEvent(pointer('pointerup', 200, 250));
    session.destroy();
  });

  it('still ignores small native buttons over the video', () => {
    const { video, pause } = createVideo(false);
    const button = document.createElement('button');
    button.getBoundingClientRect = () => ({
      left: 340,
      top: 20,
      right: 380,
      bottom: 60,
      width: 40,
      height: 40,
      x: 340,
      y: 20,
      toJSON: () => ({}),
    });
    document.body.append(button);
    const session = new VideoSession(video, { ...DEFAULT_SETTINGS });

    button.dispatchEvent(pointer('pointerdown', 360, 40));
    vi.advanceTimersByTime(300);
    expect(pause).not.toHaveBeenCalled();
    session.destroy();
  });

  it('clears a speed lock when Instagram reuses the video for new media', () => {
    const { video } = createVideo(false);
    const session = new VideoSession(video, { ...DEFAULT_SETTINGS });

    video.dispatchEvent(pointer('pointerdown', 20, 180));
    vi.advanceTimersByTime(300);
    video.dispatchEvent(pointer('pointermove', 20, 260));
    video.dispatchEvent(pointer('pointerup', 20, 260));
    expect(video.playbackRate).toBe(2);

    video.playbackRate = 1;
    video.dispatchEvent(new Event('loadstart'));
    video.dispatchEvent(pointer('pointerdown', 20, 180));
    vi.advanceTimersByTime(300);

    const message = document
      .querySelector<HTMLElement>('[data-reel-controls="overlay"]')
      ?.shadowRoot?.querySelector<HTMLElement>('.message');
    expect(message?.textContent).toBe('2배속을 고정하려면 아래로 미세요');

    video.dispatchEvent(pointer('pointerup', 20, 180));
    expect(video.playbackRate).toBe(1);
    session.destroy();
  });

  it('restores temporary edge state after pointer cancellation', () => {
    const { video } = createVideo(false);
    const session = new VideoSession(video, { ...DEFAULT_SETTINGS });

    video.dispatchEvent(pointer('pointerdown', 20, 200));
    vi.advanceTimersByTime(300);
    expect(video.playbackRate).toBe(2);
    video.dispatchEvent(pointer('pointercancel', 20, 200));
    expect(video.playbackRate).toBe(1);
    session.destroy();
  });

  it('updates an active hold message when the Instagram language changes', () => {
    const { video } = createVideo(false);
    const session = new VideoSession(video, { ...DEFAULT_SETTINGS }, 'en');

    video.dispatchEvent(pointer('pointerdown', 20, 180));
    vi.advanceTimersByTime(300);
    const message = document
      .querySelector<HTMLElement>('[data-reel-controls="overlay"]')
      ?.shadowRoot?.querySelector<HTMLElement>('.message');
    expect(message?.textContent).toBe('Slide down to lock 2x speed');

    session.updateLocale('ja');
    expect(message?.textContent).toBe('下にスライドして2倍速をロック');
    video.dispatchEvent(pointer('pointerup', 20, 180));
    session.destroy();
  });
});
