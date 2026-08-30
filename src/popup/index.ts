import './style.css';
import { readSettings, writeSettings, type Settings } from '../shared/settings';

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

async function update(key: SettingKey, checked: boolean): Promise<void> {
  await writeSettings({ [key]: checked });
  render(await readSettings());
}

for (const key of keys) {
  inputs[key].addEventListener('change', () => {
    update(key, inputs[key].checked).catch(() => undefined);
  });
}

readSettings().then(render).catch(() => undefined);
