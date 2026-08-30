import { describe, expect, it } from 'vitest';
import { isSupportedPath } from '../src/content/surfaces';

describe('supported Instagram paths', () => {
  it('includes the requested feed, reel, and post routes', () => {
    expect(isSupportedPath('/')).toBe(true);
    expect(isSupportedPath('/reels/')).toBe(true);
    expect(isSupportedPath('/reel/abc/')).toBe(true);
    expect(isSupportedPath('/p/abc/')).toBe(true);
  });

  it('excludes similarly prefixed and unsupported surfaces', () => {
    expect(isSupportedPath('/reelsfoo')).toBe(false);
    expect(isSupportedPath('/stories/account/')).toBe(false);
    expect(isSupportedPath('/direct/inbox/')).toBe(false);
  });
});
