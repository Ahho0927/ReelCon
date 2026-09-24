import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, normalizeSettings } from '../src/shared/settings';

describe('settings migration', () => {
  it('enables photo downloads for existing installations without the new key', () => {
    expect(normalizeSettings({ enabled: false })).toEqual({
      ...DEFAULT_SETTINGS,
      enabled: false,
      photoDownloadEnabled: true,
    });
  });
});
