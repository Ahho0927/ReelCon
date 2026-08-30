export type SupportedLocale = 'en' | 'ja' | 'ko' | 'zh-CN' | 'zh-TW';
export const SUPPORTED_LOCALES: readonly SupportedLocale[] = [
  'en',
  'ja',
  'ko',
  'zh-CN',
  'zh-TW',
];

export type MessageKey =
  | 'scrubLabel'
  | 'slideToLock'
  | 'slideToUnlock'
  | 'releaseToLock'
  | 'releaseToUnlock'
  | 'speedLocked'
  | 'speedUnlocked'
  | 'masterLabel'
  | 'gestureSettings'
  | 'centerHoldTitle'
  | 'centerHoldDescription'
  | 'centerHoldLabel'
  | 'edgeHoldTitle'
  | 'edgeHoldDescription'
  | 'edgeHoldLabel'
  | 'speedLockTitle'
  | 'speedLockDescription'
  | 'speedLockLabel'
  | 'scrubBarTitle'
  | 'scrubBarDescription'
  | 'scrubBarLabel'
  | 'scopeNote';

const messages: Record<SupportedLocale, Record<MessageKey, string>> = {
  en: {
    scrubLabel: 'Video playback position',
    slideToLock: 'Slide down to lock 2x speed',
    slideToUnlock: 'Slide down for normal speed',
    releaseToLock: 'Release to lock 2x speed',
    releaseToUnlock: 'Release for normal speed',
    speedLocked: 'Locked at 2x speed',
    speedUnlocked: 'Back to normal speed',
    masterLabel: 'Enable Reels Controls',
    gestureSettings: 'Gesture settings',
    centerHoldTitle: 'Center hold',
    centerHoldDescription: 'Hide the interface and pause',
    centerHoldLabel: 'Enable center hold',
    edgeHoldTitle: 'Edge hold',
    edgeHoldDescription: 'Play at 2x speed',
    edgeHoldLabel: 'Enable edge hold',
    speedLockTitle: 'Slide down to lock',
    speedLockDescription: 'Repeat the gesture for normal speed',
    speedLockLabel: 'Enable 2x speed lock',
    scrubBarTitle: 'Seek bar',
    scrubBarDescription: 'Drag or click to seek',
    scrubBarLabel: 'Enable seek bar',
    scopeNote: 'Works only on Instagram videos',
  },
  ja: {
    scrubLabel: '動画の再生位置',
    slideToLock: '下にスライドして2倍速をロック',
    slideToUnlock: '下にスライドして通常の速度にする',
    releaseToLock: 'リリースして2倍速をロック',
    releaseToUnlock: 'リリースして通常の速度にする',
    speedLocked: '2倍速ロック',
    speedUnlocked: '通常の速度に戻す',
    masterLabel: 'Reel Controlsを有効にする',
    gestureSettings: 'ジェスチャー設定',
    centerHoldTitle: '中央をホールド',
    centerHoldDescription: 'UIを隠して一時停止',
    centerHoldLabel: '中央ホールドを有効にする',
    edgeHoldTitle: 'サイドをホールド',
    edgeHoldDescription: '2倍速で再生',
    edgeHoldLabel: 'サイドホールドを有効にする',
    speedLockTitle: '下にスライドしてロック',
    speedLockDescription: '同じ操作で通常の速度に戻す',
    speedLockLabel: '2倍速ロックを有効にする',
    scrubBarTitle: 'シークバー',
    scrubBarDescription: 'ドラッグまたはクリックして移動',
    scrubBarLabel: 'シークバーを有効にする',
    scopeNote: 'Instagramの動画でのみ動作',
  },
  ko: {
    scrubLabel: '영상 재생 위치',
    slideToLock: '2배속을 고정하려면 아래로 미세요',
    slideToUnlock: '보통 속도로 재생하려면 아래로 미세요',
    releaseToLock: '2배속을 고정하려면 마우스를 놓으세요',
    releaseToUnlock: '보통 속도로 재생하려면 마우스를 놓으세요',
    speedLocked: '2배속 고정',
    speedUnlocked: '보통 속도로 돌아가기',
    masterLabel: 'Reels Controls 전체 활성화',
    gestureSettings: '제스처 설정',
    centerHoldTitle: '중앙 홀드',
    centerHoldDescription: 'UI 숨기고 일시정지',
    centerHoldLabel: '중앙 홀드 활성화',
    edgeHoldTitle: '가장자리 홀드',
    edgeHoldDescription: '누르는 동안 2배속',
    edgeHoldLabel: '가장자리 홀드 활성화',
    speedLockTitle: '아래로 밀어 고정',
    speedLockDescription: '같은 동작으로 해제',
    speedLockLabel: '2배속 고정 활성화',
    scrubBarTitle: '탐색 바',
    scrubBarDescription: '드래그하여 이동',
    scrubBarLabel: '탐색 바 활성화',
    scopeNote: 'Instagram 동영상에서만 작동',
  },
  'zh-CN': {
    scrubLabel: '视频播放位置',
    slideToLock: '下滑可锁定 2 倍速',
    slideToUnlock: '下滑可恢復正常速度',
    releaseToLock: '松开可锁定 2 倍速',
    releaseToUnlock: '松开可恢復正常速度',
    speedLocked: '已锁定 2 倍速',
    speedUnlocked: '恢復正常速度',
    masterLabel: '启用 Reels Controls',
    gestureSettings: '手势设置',
    centerHoldTitle: '中央长按',
    centerHoldDescription: '隐藏界面并暂停',
    centerHoldLabel: '启用中央长按',
    edgeHoldTitle: '边缘长按',
    edgeHoldDescription: '按住时以 2 倍速播放',
    edgeHoldLabel: '启用边缘长按',
    speedLockTitle: '下滑锁定',
    speedLockDescription: '重复操作即可恢復正常速度',
    speedLockLabel: '启用 2 倍速锁定',
    scrubBarTitle: '进度条',
    scrubBarDescription: '拖动以跳转',
    scrubBarLabel: '启用进度条',
    scopeNote: '仅适用于 Instagram 视频',
  },
  'zh-TW': {
    scrubLabel: '影片播放位置',
    slideToLock: '向下滑動即可鎖定在 2 倍速',
    slideToUnlock: '向下滑動即可恢復正常速度',
    releaseToLock: '放開即可鎖定在 2 倍速',
    releaseToUnlock: '放開即可恢復正常速度',
    speedLocked: '鎖定在 2 倍速',
    speedUnlocked: '恢復正常速度',
    masterLabel: '啟用 Reel Controls',
    gestureSettings: '手勢設定',
    centerHoldTitle: '中央長按',
    centerHoldDescription: '隱藏介面並暫停',
    centerHoldLabel: '啟用中央長按',
    edgeHoldTitle: '邊緣長按',
    edgeHoldDescription: '按住時以 2 倍速播放',
    edgeHoldLabel: '啟用邊緣長按',
    speedLockTitle: '下滑鎖定',
    speedLockDescription: '重複操作即可恢復正常速度',
    speedLockLabel: '啟用 2 倍速鎖定',
    scrubBarTitle: '進度列',
    scrubBarDescription: '拖曳以跳轉',
    scrubBarLabel: '啟用進度列',
    scopeNote: '僅適用於 Instagram 影片',
  },
};

export const INSTAGRAM_LOCALE_STORAGE_KEY = 'instagramLocale';

export function normalizeLocale(value?: string | null): SupportedLocale {
  const locale = (value ?? '').trim().replaceAll('_', '-').toLowerCase();
  if (locale === 'ko' || locale.startsWith('ko-')) return 'ko';
  if (locale === 'ja' || locale.startsWith('ja-')) return 'ja';
  if (
    locale === 'zh-tw' ||
    locale === 'zh-hk' ||
    locale === 'zh-mo' ||
    locale.startsWith('zh-hant')
  ) {
    return 'zh-TW';
  }
  if (locale === 'zh' || locale.startsWith('zh-')) return 'zh-CN';
  return 'en';
}

export function detectInstagramLocale(): SupportedLocale {
  return normalizeLocale(document.documentElement.lang || navigator.language);
}

export function translate(locale: SupportedLocale, key: MessageKey): string {
  return messages[locale][key];
}

export async function rememberInstagramLocale(locale: SupportedLocale): Promise<void> {
  if (typeof chrome === 'undefined' || !chrome.storage?.local) return;
  await chrome.storage.local.set({ [INSTAGRAM_LOCALE_STORAGE_KEY]: locale });
}

export async function getPreferredLocale(): Promise<SupportedLocale> {
  if (typeof chrome !== 'undefined' && chrome.storage?.local) {
    const stored = await chrome.storage.local.get(INSTAGRAM_LOCALE_STORAGE_KEY);
    const value = stored[INSTAGRAM_LOCALE_STORAGE_KEY];
    if (typeof value === 'string') return normalizeLocale(value);
  }
  const chromeLocale = typeof chrome !== 'undefined' && chrome.i18n?.getUILanguage
    ? chrome.i18n.getUILanguage()
    : navigator.language;
  return normalizeLocale(chromeLocale);
}
