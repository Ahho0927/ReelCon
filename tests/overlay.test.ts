import { beforeEach, describe, expect, it, vi } from 'vitest';
import { VideoOverlay } from '../src/content/overlay';

function pointer(type: string, x: number): Event {
  const event = new MouseEvent(type, {
    bubbles: true,
    cancelable: true,
    button: 0,
    clientX: x,
    clientY: 4,
  });
  Object.defineProperty(event, 'pointerId', { value: 7 });
  return event;
}

describe('VideoOverlay scrub bar', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('is keyboard accessible and reports progress', () => {
    const onSeek = vi.fn();
    const onSeekStart = vi.fn();
    const onSeekEnd = vi.fn();
    const overlay = new VideoOverlay({ onSeek, onSeekStart, onSeekEnd });
    const slider = overlay.host.shadowRoot?.querySelector<HTMLElement>('[role="slider"]');

    expect(overlay.host.hasAttribute('aria-hidden')).toBe(false);
    expect(slider?.tabIndex).toBe(0);
    overlay.setProgress(25, 100);
    expect(slider?.getAttribute('aria-valuetext')).toBe('25%');

    slider?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    expect(onSeekStart).toHaveBeenCalledOnce();
    expect(onSeek).toHaveBeenCalledWith(0.27);
    expect(onSeekEnd).toHaveBeenCalledOnce();

    overlay.setScrubEnabled(false);
    expect(slider?.tabIndex).toBe(-1);
    expect(slider?.getAttribute('aria-hidden')).toBe('');
    overlay.destroy();
  });

  it('seeks on pointer drag without leaking the event', () => {
    const onSeek = vi.fn();
    const onSeekStart = vi.fn();
    const onSeekEnd = vi.fn();
    const overlay = new VideoOverlay({ onSeek, onSeekStart, onSeekEnd });
    const slider = overlay.host.shadowRoot?.querySelector<HTMLElement>('[role="slider"]');
    if (!slider) throw new Error('slider missing');
    slider.getBoundingClientRect = () => ({
      left: 100,
      top: 0,
      right: 300,
      bottom: 16,
      width: 200,
      height: 16,
      x: 100,
      y: 0,
      toJSON: () => ({}),
    });

    const down = pointer('pointerdown', 150);
    slider.dispatchEvent(down);
    slider.dispatchEvent(pointer('pointermove', 250));
    slider.dispatchEvent(pointer('pointerup', 300));

    expect(down.defaultPrevented).toBe(true);
    expect(onSeekStart).toHaveBeenCalledOnce();
    expect(onSeek.mock.calls.map(([ratio]) => ratio)).toEqual([0.25, 0.75, 1]);
    expect(onSeekEnd).toHaveBeenCalledOnce();
    overlay.destroy();
  });
});
