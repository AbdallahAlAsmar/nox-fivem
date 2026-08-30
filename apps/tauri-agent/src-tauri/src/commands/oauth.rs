//! Localhost OAuth loopback for Clerk Google/Discord sign-in.
//!
//! Opens the provider in the *system* browser (not the Tauri webview). Clerk
//! redirects back to http://127.0.0.1:PORT/callback; we capture that URL and
//! emit it to the frontend so Clerk can finish the session.
//!
//! Fixed port so the URL can be allowlisted in the Clerk dashboard:
//!   http://127.0.0.1:18234/callback
//!   http://localhost:18234/callback

use std::sync::Mutex;
use std::time::Duration;

use once_cell::sync::Lazy;
use tauri::{AppHandle, Emitter};
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::TcpListener;
use tokio::sync::oneshot;

const OAUTH_PORT: u16 = 18234;

struct OAuthServerState {
    /// Drop / send to shut down the listener early.
    shutdown: Option<oneshot::Sender<()>>,
}

static OAUTH_STATE: Lazy<Mutex<OAuthServerState>> = Lazy::new(|| {
    Mutex::new(OAuthServerState { shutdown: None })
});

/// Start listening for a single Clerk OAuth redirect. Returns the fixed port.
#[tauri::command]
pub async fn start_oauth_server_cmd(app: AppHandle) -> Result<u16, String> {
    // Cancel any previous listener first.
    stop_oauth_server_cmd().await?;

    let listener = TcpListener::bind(("127.0.0.1", OAUTH_PORT))
        .await
        .map_err(|e| {
            format!(
                "Could not bind OAuth callback on 127.0.0.1:{} — is another NOXES instance running? ({e})",
                OAUTH_PORT
            )
        })?;

    let (tx, mut rx) = oneshot::channel::<()>();
    {
        let mut state = OAUTH_STATE.lock().map_err(|e| e.to_string())?;
        state.shutdown = Some(tx);
    }

    let app_handle = app.clone();
    tauri::async_runtime::spawn(async move {
        tokio::select! {
            _ = &mut rx => {
                println!("[OAuth] Server cancelled");
            }
            result = accept_one_callback(&listener) => {
                match result {
                    Ok(url) => {
                        println!("[OAuth] Callback received");
                        let _ = app_handle.emit("oauth:callback", url);
                    }
                    Err(e) => {
                        eprintln!("[OAuth] Listener error: {e}");
                        let _ = app_handle.emit("oauth:error", e);
                    }
                }
            }
        }
        // Clear shutdown handle when done.
        if let Ok(mut state) = OAUTH_STATE.lock() {
            state.shutdown = None;
        }
    });

    Ok(OAUTH_PORT)
}

/// Stop the OAuth listener if it is still running.
#[tauri::command]
pub async fn stop_oauth_server_cmd() -> Result<(), String> {
    // Take/send shutdown inside a scoped lock so the MutexGuard is never held
    // across an await (Tauri commands must be Send).
    let should_wait = {
        let mut state = OAUTH_STATE.lock().map_err(|e| e.to_string())?;
        if let Some(tx) = state.shutdown.take() {
            let _ = tx.send(());
            true
        } else {
            false
        }
    };
    if should_wait {
        // Brief pause so the port is released before a restart.
        tokio::time::sleep(Duration::from_millis(80)).await;
    }
    Ok(())
}

async fn accept_one_callback(listener: &TcpListener) -> Result<String, String> {
    let (mut socket, _) = listener
        .accept()
        .await
        .map_err(|e| format!("OAuth accept failed: {e}"))?;

    let mut buf = vec![0u8; 8192];
    let n = socket
        .read(&mut buf)
        .await
        .map_err(|e| format!("OAuth read failed: {e}"))?;
    let req = String::from_utf8_lossy(&buf[..n]);

    // First line: GET /callback?__clerk_status=... HTTP/1.1
    let path_and_query = req
        .lines()
        .next()
        .and_then(|line| line.split_whitespace().nth(1))
        .unwrap_or("/")
        .to_string();

    let callback_url = format!("http://127.0.0.1:{OAUTH_PORT}{path_and_query}");

    let body = r#"<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>NOXES</title>
<style>
  body{font-family:system-ui,sans-serif;background:#0F0F14;color:#fff;display:flex;
  align-items:center;justify-content:center;min-height:100vh;margin:0}
  .box{text-align:center;max-width:360px;padding:2rem}
  h1{font-size:14px;letter-spacing:.2em;text-transform:uppercase;margin:0 0 .75rem}
  p{color:rgba(255,255,255,.5);font-size:13px;line-height:1.5;margin:0}
</style></head>
<body><div class="box">
  <h1>Signed in</h1>
  <p>You can close this tab and return to the NOXES app.</p>
</div></body></html>"#;

    let response = format!(
        "HTTP/1.1 200 OK\r\nContent-Type: text/html; charset=utf-8\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}",
        body.len(),
        body
    );
    let _ = socket.write_all(response.as_bytes()).await;
    let _ = socket.shutdown().await;

    Ok(callback_url)
}
