import { fetch as tauriFetch } from '@tauri-apps/plugin-http';
import { load, type Store } from '@tauri-apps/plugin-store';
import { invoke } from '@tauri-apps/api/core';

/**
 * Platform adapter for the desktop app. The shared lib/ stays pure; here we
 * map its needs onto Tauri APIs:
 *  - HTTP via the http plugin (goes through Rust, so no CORS)
 *  - persistence via the store plugin
 *  - the menu-bar "badge" via a custom Rust command (set_tray_title)
 */

export async function fetchText(url: string): Promise<string> {
  const res = await tauriFetch(url, { method: 'GET' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

let storePromise: Promise<Store> | null = null;
function getStore(): Promise<Store> {
  return (storePromise ??= load('settings.json', { autoSave: true, defaults: {} }));
}

export const store = {
  async get<T>(key: string): Promise<T | undefined> {
    return (await getStore()).get<T>(key);
  },
  async set(key: string, value: unknown): Promise<void> {
    await (await getStore()).set(key, value);
  },
};

export async function setTrayTitle(title: string): Promise<void> {
  await invoke('set_tray_title', { title });
}
