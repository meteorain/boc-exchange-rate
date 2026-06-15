import { defineManifest } from '@crxjs/vite-plugin';
import pkg from './package.json';

export default defineManifest({
  manifest_version: 3,
  name: '__MSG_extensionName__',
  description: '__MSG_extensionDesc__',
  version: pkg.version,
  default_locale: 'zh_CN',
  permissions: ['alarms', 'storage', 'notifications'],
  host_permissions: ['https://www.boc.cn/'],
  background: {
    service_worker: 'src/background/service-worker.ts',
    type: 'module',
  },
  action: {
    default_popup: 'src/popup/index.html',
    default_icon: {
      16: 'images/icon16.png',
      48: 'images/icon48.png',
      128: 'images/icon128.png',
    },
  },
  options_page: 'src/options/index.html',
  icons: {
    16: 'images/icon16.png',
    48: 'images/icon48.png',
    128: 'images/icon128.png',
  },
});
