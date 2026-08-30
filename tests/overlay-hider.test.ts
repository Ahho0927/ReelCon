import { beforeEach, describe, expect, it } from 'vitest';
import { OverlayHider } from '../src/content/overlay-hider';

function mediaRect(): DOMRect {
  return {
    left: 100,
    top: 100,
    right: 500,
    bottom: 700,
    width: 400,
    height: 600,
    x: 100,
    y: 100,
    toJSON: () => ({}),
  };
}

describe('OverlayHider', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('also hides Instagram UI inserted after a center hold begins', async () => {
    const root = document.createElement('div');
    const mediaBranch = document.createElement('div');
    const video = document.createElement('video');
    root.getBoundingClientRect = mediaRect;
    mediaBranch.getBoundingClientRect = mediaRect;
    video.getBoundingClientRect = mediaRect;
    mediaBranch.append(video);
    root.append(mediaBranch);
    document.body.append(root);

    const hider = new OverlayHider();
    hider.hide(video);

    const delayedPauseIcon = document.createElement('div');
    delayedPauseIcon.dataset.instagramPauseUi = 'true';
    mediaBranch.append(delayedPauseIcon);
    await Promise.resolve();

    expect(delayedPauseIcon.style.opacity).toBe('0');
    expect(delayedPauseIcon.style.visibility).toBe('hidden');
    expect(delayedPauseIcon.style.pointerEvents).toBe('none');

    delayedPauseIcon.style.setProperty('opacity', '1');
    delayedPauseIcon.classList.add('instagram-pause-visible');
    await Promise.resolve();
    expect(delayedPauseIcon.style.opacity).toBe('0');
    expect(delayedPauseIcon.style.getPropertyPriority('opacity')).toBe('important');

    hider.restore();
    expect(delayedPauseIcon.style.opacity).toBe('');
    expect(delayedPauseIcon.style.visibility).toBe('');
  });
});
