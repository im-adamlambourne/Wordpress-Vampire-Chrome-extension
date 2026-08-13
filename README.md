# Content Studio Plugin

Chrome extension (Manifest V3) that attaches to self-hosted WordPress admin
(`/wp-admin/`) and signs in to Content Exchange so later API calls can run as
the CEX user.

Immediate Media branded. Targets Gutenberg and Classic. Not WordPress.com Calypso.

The Laravel endpoints live in `content-exchange-v2` — see
`core/docs/Content-Studio-Plugin-Auth.md` (login plus `POST /api/plugin/chat`).

## Load unpacked

1. `chrome://extensions` → Developer mode → Load unpacked → this repo root.
2. Reload the extension after code changes. Reload the WordPress tab so content scripts reinject.

## Content Exchange login

The popup (toolbar icon) signs in to Content Exchange. Open **Settings** (cog) to set the Laravel **Server** and inspect the WordPress session dump.

1. Open the popup → **Settings** (cog) → set **Server** to the Laravel origin (this Sail app is often `http://localhost` on port 80; some READMEs say `http://localhost:8080`).
2. **Save host** and allow the origin when Chrome asks.
3. Close Settings, then **Log in**. Chrome opens Content Exchange. Sign in if needed (`admin@immediate.co.uk` / `password123` locally), then **Connect**.
4. The popup closes during the bounce. Reopen it. Status should read **Signed in as {name}**.
5. If the WordPress editor is already open, the **Chat with Agent** composer enables as soon as the token is stored (no tab reload required). The overlay uses Immediate Media blue with the Content Exchange chat behaviours: rolling-dot thinking loader, send spinner, and a short reply sound. Messages go to `POST /api/plugin/chat` (Gemini 3.5 Flash Lite). Replies show in the overlay. When the agent returns `edits`, the extension writes title, body, excerpt, SEO title/description, and Open Graph title/description into the open Gutenberg or Classic editor (Yoast and Rank Math when those plugins are present) and marks the draft unsaved so Save/Update and the leave-page warning work. It does not save or publish; use WordPress Undo to revert title/body.

The host is stored in `chrome.storage.local` so you can point at local, staging, or production without rebuilding. Changing host clears the stored token and display name.

WordPress session debug is in **Settings**, below the host field (wp-admin attach state: site, editor, form fields). It is not the CEX user.

## How auth works

```
Save host
  → chrome.permissions.request for that origin
Log in
  → service worker chrome.identity.launchWebAuthFlow
  → GET {host}/plugin/authorize (PKCE)
  → Fortify login / 2FA / Connect
  → redirect https://<extension-id>.chromiumapp.org/?code=
  → POST {host}/api/plugin/token
  → store Sanctum token and display name
Reopen popup
  → GET {host}/api/plugin/me  Authorization: Bearer
  → show name

Editor chat (signed in)
  → content/chat-modal.js asks content/editor-bridge.js (MAIN world) for a snapshot
  → PLUGIN_CHAT
  → service worker POST {host}/api/plugin/chat
  → thinking loader, then { reply, edits } in the overlay (reply sound)
  → non-empty edits applied via the MAIN-world bridge (Gutenberg wp.data or Classic/TinyMCE)
```

Files: `background/pkce.js`, `background/plugin-auth.js`, `background/plugin-chat.js`, `popup/popup.html`, `content/chat-modal.js`, `content/editor-bridge.js`, `assets/robot.png`, `assets/chat-notification.mp3`.

## Permissions

- `tabs` — read the active tab URL
- `storage` — host, token, and signed-in display name (for the chat avatar)
- `identity` — OAuth bounce
- `host_permissions` `*://*/wp-admin/*` — WordPress admin attach
- `optional_host_permissions` `http://*/*` and `https://*/*` — requested at runtime for the configured Laravel origin (not `<all_urls>`)
- `web_accessible_resources` — robot avatar and chat notification sound (`http://*/*` and `https://*/*`; Chrome only allows a `/*` path here)

## Out of scope until asked

Save/publish, taxonomies, featured image, Open Graph image, focus keyphrase, custom meta (other than SEO/Open Graph text fields), WordPress.com, Chrome Web Store listing (`CHROMEWEBSTORE.md`).
