import './style.css';
import {
  DEFAULT_SETTINGS,
  readSettings,
  writeSettings,
  type Settings,
} from '../shared/settings';
import {
  getPreferredLocale,
  translate,
  type MessageKey,
  type SupportedLocale,
} from '../shared/i18n';

type SettingKey = keyof Settings;

const keys: SettingKey[] = [
  'enabled',
  'centerHoldEnabled',
  'edgeHoldEnabled',
  'speedLockEnabled',
  'scrubBarEnabled',
];

const inputs = Object.fromEntries(
  keys.map((key) => [key, document.getElementById(key) as HTMLInputElement]),
) as Record<SettingKey, HTMLInputElement>;

function render(settings: Settings): void {
  for (const key of keys) inputs[key].checked = settings[key];
  const lockDisabled = !settings.enabled || !settings.edgeHoldEnabled;
  inputs.speedLockEnabled.disabled = lockDisabled;
  document.getElementById('speedLockRow')?.classList.toggle('is-disabled', lockDisabled);
  document.body.classList.toggle('master-disabled', !settings.enabled);
}

function applyLocale(locale: SupportedLocale): void {
  document.documentElement.lang = locale;
  for (const element of document.querySelectorAll<HTMLElement>('[data-i18n]')) {
    element.textContent = translate(locale, element.dataset.i18n as MessageKey);
  }
  for (const element of document.querySelectorAll<HTMLElement>('[data-i18n-aria-label]')) {
    element.setAttribute(
      'aria-label',
      translate(locale, element.dataset.i18nAriaLabel as MessageKey),
    );
  }
}

async function update(key: SettingKey, checked: boolean): Promise<void> {
  await writeSettings({ [key]: checked });
  render(await readSettings());
}

for (const key of keys) {
  inputs[key].addEventListener('change', () => {
    update(key, inputs[key].checked).catch(() => undefined);
  });
}

Promise.all([readSettings(), getPreferredLocale()])
  .then(([settings, locale]) => {
    applyLocale(locale);
    render(settings);
  })
  .catch(() => {
    applyLocale('en');
    render({ ...DEFAULT_SETTINGS });
  });
