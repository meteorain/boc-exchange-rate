// Prevents an extra console window on Windows in release.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Manager, WindowEvent,
};

/// Show the rate badge on the tray. The frontend renders the number onto the
/// app icon (Chrome-style); we just set that image as the tray icon. On
/// Windows/Linux we also set a tooltip with the full value.
#[tauri::command]
fn set_badge(app: AppHandle, rgba: Vec<u8>, width: u32, height: u32, title: String) {
    let Some(tray) = app.tray_by_id("main") else {
        return;
    };

    if width > 0 && height > 0 && rgba.len() as u32 == width * height * 4 {
        let image = tauri::image::Image::new_owned(rgba, width, height);
        let _ = tray.set_icon(Some(image));
        let _ = tray.set_icon_as_template(false);
    }

    #[cfg(not(target_os = "macos"))]
    let _ = tray.set_tooltip(Some(title));
    #[cfg(target_os = "macos")]
    let _ = title;
}

fn show_window(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.show();
        let _ = window.unminimize();
        let _ = window.set_focus();
    }
}

fn toggle_window(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        if window.is_visible().unwrap_or(false) && !window.is_minimized().unwrap_or(false) {
            let _ = window.hide();
        } else {
            show_window(app);
        }
    }
}

fn show_settings(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("settings") {
        let _ = window.show();
        let _ = window.unminimize();
        let _ = window.set_focus();
    }
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .invoke_handler(tauri::generate_handler![set_badge])
        // Closing the window hides it (the app keeps living in the tray/Dock);
        // quit via the tray menu or Cmd-Q.
        .on_window_event(|window, event| {
            if let WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                let _ = window.hide();
            }
        })
        // macOS app-menu "设置… (⌘,)".
        .on_menu_event(|app, event| {
            if event.id().as_ref() == "settings" {
                show_settings(app);
            }
        })
        .setup(|app| {
            let show = MenuItem::with_id(app, "show", "显示 / 隐藏", true, None::<&str>)?;
            let settings = MenuItem::with_id(app, "settings", "设置…", true, None::<&str>)?;
            let quit = MenuItem::with_id(app, "quit", "退出", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show, &settings, &quit])?;

            TrayIconBuilder::with_id("main")
                .icon(app.default_window_icon().unwrap().clone())
                .menu(&menu)
                .show_menu_on_left_click(false)
                .icon_as_template(false)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "show" => toggle_window(app),
                    "settings" => show_settings(app),
                    "quit" => app.exit(0),
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        toggle_window(tray.app_handle());
                    }
                })
                .build(app)?;

            // macOS: insert a "设置… (⌘,)" item into the default app menu,
            // keeping the standard Edit menu (copy/paste) intact.
            #[cfg(target_os = "macos")]
            {
                let menu = Menu::default(app.handle())?;
                if let Some(tauri::menu::MenuItemKind::Submenu(app_menu)) =
                    menu.items()?.into_iter().next()
                {
                    let item = MenuItem::with_id(app, "settings", "设置…", true, Some("CmdOrCtrl+,"))?;
                    let _ = app_menu.insert(&item, 1);
                }
                let _ = app.handle().set_menu(menu);
            }

            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|_app, _event| {
            // Clicking the Dock icon (re)shows the window (macOS-only event).
            #[cfg(target_os = "macos")]
            if let tauri::RunEvent::Reopen { .. } = &_event {
                show_window(_app);
            }
        });
}
