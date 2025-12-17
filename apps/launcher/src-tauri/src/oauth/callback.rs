use axum::{
    extract::{Query, State},
    response::{Html, IntoResponse},
    routing::get,
    Router,
};
use std::sync::Arc;
use parking_lot::RwLock;
use serde::Deserialize;
use tokio::sync::oneshot;

use super::flow::OAuthFlow;

const CALLBACK_PORT: u16 = 19284;

#[derive(Debug, Deserialize)]
pub struct CallbackParams {
    code: Option<String>,
    state: Option<String>,
    error: Option<String>,
    error_description: Option<String>,
}

pub struct CallbackServer {
    shutdown_tx: RwLock<Option<oneshot::Sender<()>>>,
}

impl CallbackServer {
    pub fn new() -> Self {
        Self {
            shutdown_tx: RwLock::new(None),
        }
    }

    pub async fn start(&self, oauth_flow: Arc<OAuthFlow>) -> Result<(), String> {
        let (shutdown_tx, shutdown_rx) = oneshot::channel::<()>();
        
        {
            let mut tx = self.shutdown_tx.write();
            if tx.is_some() {
                return Ok(());
            }
            *tx = Some(shutdown_tx);
        }

        let app = Router::new()
            .route("/oauth/callback", get(handle_callback))
            .with_state(oauth_flow);

        let addr = format!("127.0.0.1:{}", CALLBACK_PORT);
        let listener = tokio::net::TcpListener::bind(&addr)
            .await
            .map_err(|e| format!("Failed to bind callback server: {}", e))?;

        println!("OAuth callback server listening on http://{}", addr);

        tokio::spawn(async move {
            axum::serve(listener, app)
                .with_graceful_shutdown(async {
                    let _ = shutdown_rx.await;
                })
                .await
                .ok();
        });

        Ok(())
    }

    pub fn stop(&self) {
        let mut tx = self.shutdown_tx.write();
        if let Some(sender) = tx.take() {
            let _ = sender.send(());
        }
    }

    pub fn callback_url() -> String {
        format!("http://localhost:{}/oauth/callback", CALLBACK_PORT)
    }
}

async fn handle_callback(
    State(oauth_flow): State<Arc<OAuthFlow>>,
    Query(params): Query<CallbackParams>,
) -> impl IntoResponse {
    if let Some(error) = params.error {
        let description = params.error_description.unwrap_or_default();
        return Html(error_page(&error, &description));
    }

    let (code, state) = match (params.code, params.state) {
        (Some(c), Some(s)) => (c, s),
        _ => {
            return Html(error_page(
                "Missing parameters",
                "The callback is missing required code or state parameters.",
            ));
        }
    };

    match oauth_flow.exchange_code(&state, &code).await {
        Ok(_) => Html(success_page()),
        Err(e) => Html(error_page("Token exchange failed", &e)),
    }
}

fn success_page() -> String {
    r#"<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Authentication Successful</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #e4e4e7;
        }
        .container {
            text-align: center;
            padding: 3rem;
            background: rgba(255,255,255,0.05);
            border-radius: 1rem;
            border: 1px solid rgba(255,255,255,0.1);
            max-width: 400px;
        }
        .icon {
            width: 64px;
            height: 64px;
            background: #22c55e;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 1.5rem;
            font-size: 2rem;
        }
        h1 { font-size: 1.5rem; margin-bottom: 0.5rem; }
        p { color: #a1a1aa; margin-bottom: 1.5rem; }
        .hint {
            font-size: 0.875rem;
            color: #71717a;
            padding-top: 1rem;
            border-top: 1px solid rgba(255,255,255,0.1);
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="icon">✓</div>
        <h1>Connected Successfully!</h1>
        <p>Your account has been linked to Launcher.</p>
        <div class="hint">You can close this window and return to the app.</div>
    </div>
    <script>setTimeout(() => window.close(), 3000);</script>
</body>
</html>"#.to_string()
}

fn error_page(error: &str, description: &str) -> String {
    format!(r#"<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Authentication Failed</title>
    <style>
        * {{ margin: 0; padding: 0; box-sizing: border-box; }}
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #e4e4e7;
        }}
        .container {{
            text-align: center;
            padding: 3rem;
            background: rgba(255,255,255,0.05);
            border-radius: 1rem;
            border: 1px solid rgba(255,255,255,0.1);
            max-width: 400px;
        }}
        .icon {{
            width: 64px;
            height: 64px;
            background: #ef4444;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 1.5rem;
            font-size: 2rem;
        }}
        h1 {{ font-size: 1.5rem; margin-bottom: 0.5rem; }}
        .error {{ color: #fca5a5; margin-bottom: 0.5rem; }}
        p {{ color: #a1a1aa; margin-bottom: 1.5rem; }}
        .hint {{
            font-size: 0.875rem;
            color: #71717a;
            padding-top: 1rem;
            border-top: 1px solid rgba(255,255,255,0.1);
        }}
    </style>
</head>
<body>
    <div class="container">
        <div class="icon">✕</div>
        <h1>Authentication Failed</h1>
        <p class="error">{}</p>
        <p>{}</p>
        <div class="hint">Please close this window and try again.</div>
    </div>
</body>
</html>"#, error, description)
}
