// The shared lib/currencies.ts probes `chrome.i18n` (guarded by typeof) to
// detect the UI language in the extension. There's no chrome in the Tauri
// webview — this ambient declaration just satisfies the type checker; at
// runtime the guard falls back to navigator.language.
declare const chrome:
  | undefined
  | { i18n?: { getUILanguage?: () => string } };
