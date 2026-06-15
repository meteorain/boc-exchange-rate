import { defineManifest } from '@crxjs/vite-plugin';
import pkg from './package.json';

export default defineManifest({
  manifest_version: 3,
  name: '__MSG_extensionName__',
  description: '__MSG_extensionDesc__',
  version: pkg.version,
  // English is the safest fallback for locales we don't ship; Chinese users
  // still get zh_CN (that folder exists), and it matches the currency-name
  // fallback in lib/currencies.ts.
  default_locale: 'en',
  permissions: ['alarms', 'storage', 'notifications', 'sidePanel'],
  host_permissions: ['https://www.boc.cn/', 'https://api.frankfurter.dev/'],
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
  side_panel: {
    default_path: 'src/popup/index.html',
  },
  icons: {
    16: 'images/icon16.png',
    48: 'images/icon48.png',
    128: 'images/icon128.png',
  },
});
