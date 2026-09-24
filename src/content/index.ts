import { ActiveVideoController } from './active-video-controller';
import { PhotoDownloadController } from './photo-download-controller';
import { readSettings, watchSettings } from '../shared/settings';

const INSTANCE_KEY = '__reelControlsController';
const CLEANUP_KEY = '__reelControlsCleanup';
type ControllerWindow = Window & typeof globalThis & {
  [INSTANCE_KEY]?: ActiveVideoController;
  [CLEANUP_KEY]?: () => void;
};

async function start(): Promise<void> {
  const scopedWindow = window as ControllerWindow;
  scopedWindow[CLEANUP_KEY]?.();
  const settings = await readSettings();
  const controller = new ActiveVideoController(settings);
  const photoDownloadController = new PhotoDownloadController(settings);
  scopedWindow[INSTANCE_KEY] = controller;
  const stopWatching = watchSettings((next) => {
    controller.updateSettings(next);
    photoDownloadController.updateSettings(next);
  });
  scopedWindow[CLEANUP_KEY] = () => {
    stopWatching();
    controller.destroy();
    photoDownloadController.destroy();
    delete scopedWindow[INSTANCE_KEY];
    delete scopedWindow[CLEANUP_KEY];
  };
}

start().catch(() => undefined);
