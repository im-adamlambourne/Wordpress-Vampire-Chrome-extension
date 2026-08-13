# Content Studio Plugin

Chrome extension (Manifest V3) that attaches to self-hosted WordPress admin
(`/wp-admin/`) and signs in to Content Exchange so later API calls can run as
the CEX user.

Immediate Media branded. Targets Gutenberg and Classic. Not WordPress.com Calypso.

The Laravel endpoints live in `content-exchange-v2` — see
`core/docs/Content-Studio-Plugin-Auth.md`.

## Load unpacked

1. `chrome://extensions` → Developer mode → Load unpacked → this repo root.
2. Reload the extension after code changes. Reload the WordPress tab so content scripts reinject.

## Content Exchange login

The debug popup (toolbar icon) has a **Content Exchange** block above the WordPress session dump.

1. Set **Server** to the Laravel origin (this Sail app is often `http://localhost` on port 80; some READMEs say `http://localhost:8080`).
2. **Save host** and allow the origin when Chrome asks.
3. **Log in**. Chrome opens Content Exchange. Sign in if needed (`admin@immediate.co.uk` / `password123` locally), then **Connect**.
4. The popup closes during the bounce. Reopen it. Status should read **Signed in as {name}**.

The host is stored in `chrome.storage.local` so you can point at local, staging, or production without rebuilding. Changing host clears the stored token.

WordPress session debug below that is the wp-admin attach state (site, editor, form fields). It is not the CEX user.

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
  → store Sanctum token
Reopen popup
  → GET {host}/api/plugin/me  Authorization: Bearer
  → show name
```

Files: `background/pkce.js`, `background/plugin-auth.js`, `popup/popup.html`.

## Permissions

- `tabs` — read the active tab URL
- `storage` — host + token
- `identity` — OAuth bounce
- `host_permissions` `*://*/wp-admin/*` — WordPress admin attach
- `optional_host_permissions` `http://*/*` and `https://*/*` — requested at runtime for the configured Laravel origin (not `<all_urls>`)

## Out of scope until asked

Chat send/transcripts, editor CRUD writes, WordPress.com, Chrome Web Store listing (`CHROMEWEBSTORE.md`).
