import { defineConfig } from 'wxt';
import { resolve } from 'node:path';

export default defineConfig({
  srcDir: 'src',
  publicDir: resolve(__dirname, 'public'),
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: '__MSG_extensionName__',
    description: '__MSG_extensionDescription__',
    default_locale: 'ja',
    permissions: ['activeTab', 'cookies', 'storage'],
    host_permissions: ['https://rito.blue/*'],
    action: {
      default_title: 'Rito Extension',
      default_icon: {
        '16': 'icons/icon16.png',
        '32': 'icons/icon32.png',
        '48': 'icons/icon48.png',
        '128': 'icons/icon128.png',
      },
    },
    icons: {
      '16': 'icons/icon16.png',
      '32': 'icons/icon32.png',
      '48': 'icons/icon48.png',
      '128': 'icons/icon128.png',
    },
    browser_specific_settings: {
      gecko: {
        id: 'rito-extension@rito.blue',
        strict_min_version: '142.0',
        // @ts-ignore: WXT version might not yet support this Firefox-specific field in its types.
        data_collection_permissions: {
          required: ["none"],
        },
      },
    },
  },
  vite: () => ({
    build: {
      chunkSizeWarningLimit: 1000,
    },
  }),
});
