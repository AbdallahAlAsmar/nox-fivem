//! Local loopback that receives the OAuth redirect from the system browser.
//!
//! Google refuses to run its login inside an embedded webview, and Clerk's
//! hosted Account Portal cannot hand a session back to this app. The sign-in
//! screen opens the provider in the system browser with this loopback as
//! Clerk's redirect URL. The browser hits 127.0.0.1, we emit the query string
//! to the webview, and Clerk finishes the session there.

use std::sync::Mutex;

use tauri::{AppHandle, Emitter};
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::TcpListener;

static CALLBACK_BASE: Mutex<String> = Mutex::new(String::new());

pub fn callback_base() -> String {
    CALLBACK_BASE.lock().expect("oauth callback lock").clone()
}

fn emit_oauth(app: &AppHandle, url: &str) {
    // The dev screen listens for oauth-callback. The built screen listens
    // for oauth:callback. Both need the same return address.
    let _ = app.emit("oauth-callback", url.to_string());
    let _ = app.emit("oauth:callback", url.to_string());
}

pub fn spawn(app: AppHandle) {
    tauri::async_runtime::spawn(async move {
        // Fixed port so the production Clerk instance can allow this exact
        // return address. A random port is rejected after Google sign-in.
        let listener = match TcpListener::bind("127.0.0.1:47821").await {
            Ok(listener) => listener,
            Err(err) => {
                eprintln!("[oauth] failed to bind loopback: {err}");
                return;
            }
        };
        let port = match listener.local_addr() {
            Ok(addr) => addr.port(),
            Err(err) => {
                eprintln!("[oauth] failed to read loopback port: {err}");
                return;
            }
        };
        let base = format!("http://127.0.0.1:{port}");
        *CALLBACK_BASE.lock().expect("oauth callback lock") = base.clone();
        println!("[oauth] callback listening on {base}/sso-callback");

        loop {
            let (mut socket, _) = match listener.accept().await {
                Ok(pair) => pair,
                Err(err) => {
                    eprintln!("[oauth] accept failed: {err}");
                    continue;
                }
            };
            let app = app.clone();
            let base = base.clone();
            tauri::async_runtime::spawn(async move {
                let mut buf = vec![0u8; 32 * 1024];
                let n = socket.read(&mut buf).await.unwrap_or(0);
                let req = String::from_utf8_lossy(&buf[..n]);
                let target = req
                    .lines()
                    .next()
                    .and_then(|line| line.split_whitespace().nth(1))
                    .unwrap_or("/");

                let method = req.split_whitespace().next().unwrap_or("");
                let header_end = req.find("\r\n\r\n").map(|i| i + 4).unwrap_or(req.len());
                let req_body = req.get(header_end..).unwrap_or("").trim();

                if target.starts_with("/sso-fragment") {
                    // The hash (rotating token) is not sent on the first GET.
                    if req_body.starts_with("http://127.0.0.1") || req_body.starts_with("http://localhost") {
                        emit_oauth(&app, req_body);
                    }
                } else if method == "GET" {
                    // The built app returns to /callback. The dev screen uses /sso-callback.
                    for prefix in ["/sso-callback", "/callback"] {
                        if let Some(rest) = target.strip_prefix(prefix) {
                            if rest.starts_with('?') || rest.starts_with('#') {
                                emit_oauth(&app, &format!("{base}{target}"));
                            }
                            break;
                        }
                    }
                }

                let failed = target.contains("__clerk_status=failed");
                let message = if failed {
                    "Sign-in did not finish.<br>Close this window and try again in NOXES."
                } else {
                    "You're signed in.<br>Close this window and return to NOXES."
                };
                let body = format!(
                    "<!doctype html><meta charset=\"utf-8\"><title>NOXES</title>\
<body style=\"margin:0;background:#0f0f14;color:#fff;font-family:system-ui,sans-serif;\
display:flex;min-height:100vh;align-items:center;justify-content:center;text-align:center\">\
<p>{message}</p>\
<script>var failed=location.href.indexOf('__clerk_status=failed')!==-1;\
if(failed){{document.querySelector('p').innerHTML='Sign-in did not finish.<br>Close this window and try again in NOXES.';}}\
fetch('/sso-fragment',{{method:'POST',headers:{{'Content-Type':'text/plain'}},body:location.href}}).catch(function(){{}})</script>\
</body>"
                );
                let resp = format!(
                    "HTTP/1.1 200 OK\r\nContent-Type: text/html; charset=utf-8\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{body}",
                    body.len()
                );
                let _ = socket.write_all(resp.as_bytes()).await;
            });
        }
    });
}

/// Open an http(s) URL in the system browser. OAuth URLs only — anything else
/// is refused so a compromised page cannot launch arbitrary commands.
#[tauri::command]
pub fn open_external_url(url: String) -> Result<(), String> {
    if url.chars().any(|c| c.is_whitespace() || c == '"' || c == '\'') {
        return Err("refusing malformed url".into());
    }
    let Ok(parsed) = url::Url::parse(&url) else {
        return Err("refusing unparseable url".into());
    };
    if parsed.scheme() != "https" && parsed.scheme() != "http" {
        return Err("refusing non-http url".into());
    }
    if parsed.scheme() == "http" && parsed.host_str() != Some("127.0.0.1") && parsed.host_str() != Some("localhost") {
        return Err("refusing non-local http url".into());
    }

    // `open` quotes the URL for the shell. OAuth links contain `&`, which
    // `cmd /C start` would otherwise treat as a command separator.
    open::that(url).map_err(|err| err.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn oauth_callback_base() -> Result<String, String> {
    callback_base_url()
}

/// The built sign-in screen does `http://127.0.0.1:${port}/callback`.
/// Returning the full address produces a URL Clerk rejects.
#[tauri::command]
pub fn start_oauth_server_cmd() -> Result<String, String> {
    let base = callback_base();
    let port = base.rsplit(':').next().unwrap_or("");
    if port.is_empty() || !port.chars().all(|c| c.is_ascii_digit()) {
        return Err("oauth callback server is not ready".into());
    }
    Ok(port.to_string())
}

fn callback_base_url() -> Result<String, String> {
    let base = callback_base();
    if base.is_empty() {
        return Err("oauth callback server is not ready".into());
    }
    Ok(base)
}
