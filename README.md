# Content Studio

Chrome extension (Manifest V3) that attaches to self-hosted WordPress admin
(`/wp-admin/`) and signs in so later API calls can run as the signed-in user.

Immediate Media branded. Targets Gutenberg and Classic. Not WordPress.com Calypso.

The Laravel endpoints live in `content-exchange-v2` — see
`core/docs/Content-Studio-Plugin-Auth.md` (login, 202 chat kick-off, Reverb events).

Release history is in [`CHANGELOG.md`](CHANGELOG.md).

## Load unpacked

1. `chrome://extensions` → Developer mode → Load unpacked → this repo root.
2. Reload the extension after code changes. Reload the WordPress tab so content scripts reinject.

## Login

The popup (toolbar icon) is the sign-in screen and Workspace launcher. After you sign in it shows your name in the header next to a user icon and Settings, plus the Workspace feature buttons enabled for your assigned site (the same set as the Workspace dashboard). Open **Settings** (cog) to switch Workspace site when you have more than one. **Show advanced settings** holds the Laravel **Server** and the WordPress session dump. Click the user icon to log out.

1. Open the popup → **Settings** (cog) → **Show advanced settings** → set **Server** to the Laravel origin (this Sail app is often `http://localhost` on port 80; some READMEs say `http://localhost:8080`). Start Reverb locally with `docker compose exec laravel.test php artisan reverb:start` (host port **8081**) and a `generative` worker (`docker compose exec laravel.test php artisan horizon`, or `queue:work --queue=generative`). With `QUEUE_CONNECTION=sync`, chat POST waits on Flash instead of returning 202 immediately.
2. **Save host** and allow the API origin and the realtime origin when Chrome asks. Save host only requests permission: `http://localhost:8081` for a local server, or `https://ws.{hostname}` for any other saved host. Echo itself does not use that guess — after login it uses `broadcasting.host` from `POST /api/plugin/token` (Laravel derives the same `localhost:8081` / `ws.{API host}` unless `PLUGIN_REVERB_*` overrides it).
3. Close Settings, then **Log in** in the popup (or **Sign in** in the editor overlay). Chrome opens the sign-in window. Sign in if needed (`admin@immediate.co.uk` / `password123` locally), then **Connect**. Sessions saved before 0.6.0 must log in again.
4. The popup closes during the bounce. A Chrome notification should confirm the login, and the plugin popup should reopen with **Successfully logged in as {name}**. Clicking the notification also opens the popup. The popup then loads your Workspace features (`GET /api/plugin/workspace`) — if you are assigned to Radio Times, unmatched tabs default to that site's enabled feature buttons with the same glyphs as the Workspace hub. Click a button to open `/workspace/{siteId}?feature={key}` in a new tab.
5. If the WordPress editor is already open while signed out, the overlay hides the chat (greeting, checklist, composer) and shows **Sign in** instead. Click it to start the same identity bounce (a server host must already be saved). The chat returns as soon as the token is stored (no tab reload required). The overlay uses Immediate Media blue with the IM circle next to **Revision Assistant**, rolling-dot thinking loader, send spinner, and a short reply sound. The greeting uses the signed-in first name and lists related images and SEO backlinks under **I can also**. A draft checklist flags missing excerpt, SEO, Open Graph, keyphrase, or a thin body. Glyph buttons above the composer are labeled Images, Backlinks, SEO, and Headlines. Send kicks off `POST /api/plugin/chat` (202) and the reply arrives over Reverb (Gemini 3.7 Flash). When the agent returns `edits`, the extension writes title, selected copy, body, excerpt, SEO title/description, Open Graph title/description, and focus keyphrase into the open Gutenberg or Classic editor (Yoast and Rank Math when those plugins are present; matching ACF standfirst/SEO text fields when the site uses Advanced Custom Fields for those boxes) and marks the draft unsaved so Save/Update and the leave-page warning work. Related images and SEO backlinks are inserted into the body the same way. Paste an http(s) URL in chat to have OpenRouter fetch the page (the extension does not fetch it). Headline ideas appear as buttons on the bubble. It does not save or publish; use WordPress Undo to revert title/body. If the WordPress host matches one of the signed-in user's Content Exchange sites, that site's house style is injected into the chat and archive image/backlink search is scoped to that site. If the host does not match and the user has exactly one assigned site, that site's guide is used instead.

The host is stored in `chrome.storage.local` so you can point at local, staging, or production without rebuilding. Changing host clears the stored token, display name, user id, and realtime settings.

WordPress session debug is in **Settings** → **Show advanced settings**, below the host field. It is not the plugin account name.

## How auth works

```
Save host
  → chrome.permissions.request for the API origin and a guessed Reverb origin
    (localhost:8081, or https://ws.{saved hostname}/*)
Log in (popup or overlay Sign in)
  → service worker chrome.identity.launchWebAuthFlow
  → GET {host}/plugin/authorize (PKCE)
  → Fortify login / 2FA / Connect
  → redirect https://<extension-id>.chromiumapp.org/?code=
  → POST {host}/api/plugin/token
  → store Sanctum token, display name, user id, and broadcasting { key, host, port, scheme }
  → offscreen Echo connects to broadcasting.host (not a client-invented URL)
  → subscribe to private-plugin.{userId} via POST {host}/broadcasting/auth
  → Chrome notification “Successfully logged in…”
  → reopen plugin popup with the same success message
Reopen popup
  → GET {host}/api/plugin/me  Authorization: Bearer (session check)
  → show name in the header (user icon logs out)
  → GET {host}/api/plugin/workspace?url={active tab}  Authorization: Bearer
  → feature grid for the matched site, otherwise Radio Times if assigned

Editor chat (signed in)
  → content/chat-modal.js asks content/editor-bridge.js (MAIN world) for a snapshot
  → PLUGIN_CHAT
  → service worker POST {host}/api/plugin/chat (message, draft snapshot, telemetry) → 202 request_id
  → Laravel ProcessPluginChatJob on the generative queue
  → Reverb PluginChatReplied / PluginChatFailed
  → offscreen Echo → PLUGIN_CHAT_RESULT → overlay (reply sound)
  → non-empty edits applied via the MAIN-world bridge (Gutenberg wp.data, Classic/TinyMCE, Yoast/Rank Math, and matching ACF fields)
```

Files: `background/pkce.js`, `background/plugin-auth.js`, `background/plugin-chat.js`, `background/plugin-echo.js`, `offscreen/offscreen.html`, `popup/popup.html`, `content/chat-modal.js`, `content/editor-bridge.js`, `assets/robot.png`, `assets/chat-notification.mp3`. After changing `offscreen/src/echo-client.js`, run `npm run build:echo` and keep `offscreen/echo-client.js` in the repo.

The WebSocket host is **only** `broadcasting` from the token response (stored in `chrome.storage.local`). Laravel endpoints and how that host is derived: `content-exchange-v2/core/docs/Content-Studio-Plugin-Auth.md`.

## Chrome Web Store (private)

Staff install is a **Private** Chrome Web Store listing (not public search). Unlisted is the wrong setting: anyone with the URL could install it.

Full dashboard copy, permission justifications, privacy disclosures, and the upload steps are in `CHROMEWEBSTORE.md`. Package with `./scripts/package-cws.sh` (writes `dist/content-studio-plugin-v0.7.0.zip`). Host `docs/privacy-policy.html` at a public URL before you submit.

After the store assigns an item ID, add `https://<item-id>.chromiumapp.org/` to the Content Studio OAuth client. Unpacked-dev and store builds use different extension IDs.

## Permissions

- `tabs` — read the active tab URL (WordPress attach, and to pick the matching Workspace site)
- `storage` — host, token, signed-in display name (for the chat avatar), user id, and public Echo settings
- `identity` — OAuth bounce
- `notifications` — confirm login after the identity window closes (popup is already gone)
- `offscreen` — keep a WebSocket open so chat replies can arrive after the service worker sleeps
- `host_permissions` `*://*/wp-admin/*` — WordPress admin attach
- `optional_host_permissions` `http://*/*` and `https://*/*` — requested at runtime for the configured Laravel origin and the guessed Reverb origin (`localhost:8081` or `ws.{saved hostname}`), which must match `broadcasting` from the token (not `<all_urls>`)
- `web_accessible_resources` — robot avatar, chat notification sound, and IM header logo (`http://*/*` and `https://*/*`; Chrome only allows a `/*` path here)

## Out of scope until asked

Save/publish, taxonomies, featured image, Open Graph image, custom meta (other than SEO/Open Graph text fields, focus keyphrase, and matching ACF text fields for those plus excerpt/standfirst), WordPress.com.
