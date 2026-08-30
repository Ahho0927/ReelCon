import { describe, expect, it } from 'vitest';
import {
  getGestureZone,
  getLockThreshold,
  movedBeyondTolerance,
} from '../src/content/gesture-machine';

describe('gesture geometry', () => {
  const rect = { left: 100, width: 400 } as DOMRect;

  it('splits the video into 22/56/22 zones', () => {
    expect(getGestureZone(100, rect)).toBe('leftEdge');
    expect(getGestureZone(188, rect)).toBe('leftEdge');
    expect(getGestureZone(189, rect)).toBe('center');
    expect(getGestureZone(411, rect)).toBe('center');
    expect(getGestureZone(412, rect)).toBe('rightEdge');
  });

  it('clamps the downward lock threshold', () => {
    expect(getLockThreshold(400)).toBe(64);
    expect(getLockThreshold(800)).toBe(80);
    expect(getLockThreshold(1_200)).toBe(96);
  });

  it('allows tiny pointer jitter before hold activation', () => {
    expect(movedBeyondTolerance(0, 0, 5, 5)).toBe(false);
    expect(movedBeyondTolerance(0, 0, 9, 0)).toBe(true);
  });
});
