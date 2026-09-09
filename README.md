# Content Studio

Chrome extension (Manifest V3) that attaches to Immediate Media WordPress Cloud Platform admin (`*.production.wcp.imdserve.com` and `*.release.wcp.imdserve.com` `/wp-admin/`) and signs in so later API calls can run as the signed-in user.

Immediate Media branded. Targets Gutenberg and Classic. Not WordPress.com Calypso.

The Laravel endpoints live in `content-exchange-v2` — see
`core/docs/Content-Studio-Plugin-Auth.md` (login, 202 chat kick-off, Reverb events).

Release history is in [`CHANGELOG.md`](CHANGELOG.md).

## Load unpacked

1. `chrome://extensions` → Developer mode → Load unpacked → this repo root.
2. Reload the extension after code changes. Reload the WordPress tab so content scripts reinject. The overlay only injects on Immediate Media WCP admin (`*.production.wcp.imdserve.com` or `*.release.wcp.imdserve.com`) and `http://localhost` / `http://127.0.0.1`.

## Login

The popup (toolbar icon) is the sign-in screen. After you sign in it shows your name in the header next to a user icon and Settings. The Workspace feature grid is hidden for the beta behind `SHOW_WORKSPACE_GRID` in `popup/popup.js`. Open **Settings** (cog) → **Show advanced settings** for the Laravel **Server host** dropdown and the WordPress session dump. Click the user icon to log out.

1. Open the popup and click **Log in**. New installs use **Server** `https://develop.content-studio.im` (shown under **Settings** → **Show advanced settings**). Allow the API origin and the realtime origin when Chrome asks (`https://ws.develop.content-studio.im` for that default, `https://ws.content-studio.im` for production, or `http://localhost:8081` for a local server). Echo itself does not use that guess — after login it uses `broadcasting.host` from `POST /api/plugin/token` (Laravel derives the same `localhost:8081` / `ws.{API host}` unless `PLUGIN_REVERB_*` overrides it).
2. To point at a Sail app instead, open **Settings** → **Show advanced settings**, choose **Local (localhost)**, **Save host**, and allow access. Start Reverb locally with `docker compose exec laravel.test php artisan reverb:start` (host port **8081**) and a `plugin` worker (`docker compose exec laravel.test php artisan horizon`, or `queue:work --queue=plugin`). With `QUEUE_CONNECTION=sync`, chat POST waits on Flash instead of returning 202 immediately.
3. After **Log in** (popup) or **Sign in** (editor overlay), Chrome opens the sign-in window. Sign in if needed (`admin@immediate.co.uk` / `password123` locally), then **Connect**. Sessions saved before 0.6.0 must log in again. Overlay **Sign in** uses the saved host (or the develop default); if Chrome has not granted that origin yet, it opens the toolbar popup so **Log in** can request access.
4. The popup closes during the bounce. A Chrome notification should confirm the login, and the plugin popup should reopen with **Successfully logged in as {name}**. Clicking the notification also opens the popup. The signed-in popup is a compact account shell (name, log out, Settings) — it does not load Workspace feature buttons while `SHOW_WORKSPACE_GRID` is false.
5. If the WordPress editor is already open while signed out, the overlay hides the greeting and action row and shows **Sign in** instead. Click it to start the same identity bounce (the develop default host is used when none is saved). The assistant returns as soon as the token is stored (no tab reload required). The overlay uses Immediate Media blue with the IM circle next to **Content Studio Assistant** and a **Beta** pill, plus the rolling-dot thinking loader and a short reply sound. The greeting uses the signed-in first name and points at the action row: **Internal links**, **Headline**, **Standfirst** and **SEO metadata**, with **First sub** and **Footers** shown as coming soon. There is no free-text chat box during the beta — it is hidden behind `SHOW_FREE_CHAT` in `content/chat-modal.js`, along with the draft checklist behind `SHOW_DRAFT_CHECKLIST`, and both come back by flipping the flag. Picking an action kicks off `POST /api/plugin/chat` (202) and the reply arrives over Reverb (Gemini 3.7 Flash). Suggestions land as cards you review one at a time: **Accept** writes just that field into the open Gutenberg or Classic editor (Yoast and Rank Math when those plugins are present; matching ACF standfirst/SEO text fields when the site uses Advanced Custom Fields for those boxes) and marks the draft unsaved so Save/Update and the leave-page warning work, **Regenerate** asks for a different value, **Reject** dismisses it, and **Undo** puts the field back to what it was. A headline reply arrives as one card per alternative, and accepting a second replaces the first. Internal links currently still insert into the body in one go; they become reviewable link cards once Content Studio returns a `suggestions` array. It does not save or publish; use WordPress Undo to revert title/body. If the WordPress host matches one of the signed-in user's Content Exchange sites, that site's house style is injected into the chat and archive image/backlink search is scoped to that site. If the host does not match and the user has exactly one assigned site, that site's guide is used instead.

The host is stored in `chrome.storage.local` so you can point at local, develop, or production Content Studio without rebuilding. **Server host** in Settings is a dropdown of those origins (Production, Develop, Local). New installs default to Develop (`https://develop.content-studio.im`). Changing host clears the stored token, display name, user id, and realtime settings.

WordPress session debug is in **Settings** → **Show advanced settings**, below the host dropdown. It is not the plugin account name.

## How auth works

```
Save host or Log in
  → chrome.permissions.request for the API origin and a guessed Reverb origin
    (localhost:8081, or https://ws.content-studio.im / https://ws.develop.content-studio.im)
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
     (only when SHOW_WORKSPACE_GRID is true)
  → feature grid for the matched site, otherwise Radio Times if assigned

Editor chat (signed in)
  → content/chat-modal.js asks content/editor-bridge.js (MAIN world) for a snapshot
  → PLUGIN_CHAT
  → service worker POST {host}/api/plugin/chat (message, draft snapshot, telemetry) → 202 request_id
  → Laravel ProcessPluginChatJob on the plugin queue
  → Reverb PluginChatReplied / PluginChatFailed
  → offscreen Echo → PLUGIN_CHAT_RESULT → overlay (reply sound)
  → non-empty edits applied via the MAIN-world bridge (Gutenberg wp.data, Classic/TinyMCE, Yoast/Rank Math, and matching ACF fields)
```

Files: `background/pkce.js`, `background/plugin-auth.js`, `background/plugin-chat.js`, `background/plugin-echo.js`, `offscreen/offscreen.html`, `popup/popup.html`, `content/chat-modal.js`, `content/editor-bridge.js`, `assets/robot.png`, `assets/chat-notification.mp3`. After changing `offscreen/src/echo-client.js`, run `npm run build:echo` and keep `offscreen/echo-client.js` in the repo.

The WebSocket host is **only** `broadcasting` from the token response (stored in `chrome.storage.local`). Laravel endpoints and how that host is derived: `content-exchange-v2/core/docs/Content-Studio-Plugin-Auth.md`.

## Chrome Web Store (private)

Staff install is a **Private** Chrome Web Store listing (not public search). Unlisted is the wrong setting: anyone with the URL could install it.

Full dashboard copy, permission justifications, privacy disclosures, and the upload steps are in `CHROMEWEBSTORE.md`. Package with `./scripts/package-cws.sh` (writes `dist/content-studio-plugin-v0.8.0.zip`). The privacy policy is `https://content-studio.im/plugin/privacy` and `https://develop.content-studio.im/plugin/privacy` (`GET /plugin/privacy` on Content Studio; copy in `docs/privacy-policy.html`). It must load without signing in.

After the store assigns an item ID, add `https://<item-id>.chromiumapp.org/` to the Content Studio OAuth client. Unpacked-dev and store builds use different extension IDs.

## Permissions

- `tabs` — read the active tab URL (WordPress attach, and to pick the matching Workspace site)
- `storage` — host, token, signed-in display name (for the chat avatar), user id, and public Echo settings
- `identity` — OAuth bounce
- `notifications` — confirm login after the identity window closes (popup is already gone)
- `offscreen` — keep a WebSocket open so chat replies can arrive after the service worker sleeps
- `content_scripts.matches` Immediate Media WCP admin (`https://*.production.wcp.imdserve.com/wp-admin/*`, `https://*.release.wcp.imdserve.com/wp-admin/*`) plus local loopback — WordPress admin attach. Do not put a `*://*/wp-admin/*` pattern in `host_permissions`: Chrome ignores the path there and treats it as all http(s) sites.
- `optional_host_permissions` Content Studio and realtime origins (`https://content-studio.im/*`, `https://develop.content-studio.im/*`, `https://ws.content-studio.im/*`, `https://ws.develop.content-studio.im/*`, and localhost including ports 8080 and 8081) — requested at runtime on **Log in** or **Save host** for the configured Laravel origin and the guessed Reverb origin (`localhost:8081` or `ws.{hostname}`), which must match `broadcasting` from the token
- `web_accessible_resources` — robot avatar, chat notification sound, and IM header logo on the same WCP and loopback hosts (Chrome only allows a `/*` path here)

## Out of scope until asked

Save/publish, taxonomies, featured image, Open Graph image, custom meta (other than SEO/Open Graph text fields, focus keyphrase, and matching ACF text fields for those plus excerpt/standfirst), WordPress.com.
