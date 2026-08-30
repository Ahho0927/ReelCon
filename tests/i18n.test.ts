import { describe, expect, it } from 'vitest';
import {
  normalizeLocale,
  SUPPORTED_LOCALES,
  translate,
  type MessageKey,
} from '../src/shared/i18n';

describe('localization', () => {
  it('maps Instagram language tags to supported locales', () => {
    expect(normalizeLocale('en-US')).toBe('en');
    expect(normalizeLocale('ko-KR')).toBe('ko');
    expect(normalizeLocale('ja-JP')).toBe('ja');
    expect(normalizeLocale('zh-Hans-CN')).toBe('zh-CN');
    expect(normalizeLocale('zh-Hant-TW')).toBe('zh-TW');
    expect(normalizeLocale('zh-HK')).toBe('zh-TW');
    expect(normalizeLocale('fr-FR')).toBe('en');
  });

  it('provides every runtime message in every supported locale', () => {
    const keys: MessageKey[] = [
      'scrubLabel',
      'slideToLock',
      'slideToUnlock',
      'releaseToLock',
      'releaseToUnlock',
      'speedLocked',
      'speedUnlocked',
      'masterLabel',
      'gestureSettings',
      'centerHoldTitle',
      'centerHoldDescription',
      'centerHoldLabel',
      'edgeHoldTitle',
      'edgeHoldDescription',
      'edgeHoldLabel',
      'speedLockTitle',
      'speedLockDescription',
      'speedLockLabel',
      'scrubBarTitle',
      'scrubBarDescription',
      'scrubBarLabel',
      'scopeNote',
    ];
    for (const locale of SUPPORTED_LOCALES) {
      for (const key of keys) expect(translate(locale, key).trim()).not.toBe('');
    }
  });
});
