export interface Settings {
  enabled: boolean;
  centerHoldEnabled: boolean;
  edgeHoldEnabled: boolean;
  speedLockEnabled: boolean;
  scrubBarEnabled: boolean;
}

export const DEFAULT_SETTINGS: Readonly<Settings> = Object.freeze({
  enabled: true,
  centerHoldEnabled: true,
  edgeHoldEnabled: true,
  speedLockEnabled: true,
  scrubBarEnabled: true,
});

export function normalizeSettings(value: Partial<Settings> | undefined): Settings {
  return { ...DEFAULT_SETTINGS, ...(value ?? {}) };
}

export async function readSettings(): Promise<Settings> {
  if (typeof chrome === 'undefined' || !chrome.storage?.sync) {
    return { ...DEFAULT_SETTINGS };
  }

  const stored = await chrome.storage.sync.get(DEFAULT_SETTINGS);
  return normalizeSettings(stored as Partial<Settings>);
}

export async function writeSettings(patch: Partial<Settings>): Promise<void> {
  if (typeof chrome === 'undefined' || !chrome.storage?.sync) return;
  await chrome.storage.sync.set(patch);
}

export function watchSettings(listener: (settings: Settings) => void): () => void {
  if (typeof chrome === 'undefined' || !chrome.storage?.onChanged) return () => undefined;

  const onChanged = (
    changes: Record<string, chrome.storage.StorageChange>,
    areaName: string,
  ) => {
    if (areaName !== 'sync') return;
    readSettings().then(listener).catch(() => undefined);
  };

  chrome.storage.onChanged.addListener(onChanged);
  return () => chrome.storage.onChanged.removeListener(onChanged);
}
