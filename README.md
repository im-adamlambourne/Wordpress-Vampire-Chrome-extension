# Content Studio Plugin

Chrome extension (Manifest V3) that attaches to self-hosted WordPress admin
(`/wp-admin/`) and signs in so later API calls can run as the signed-in user.

Immediate Media branded. Targets Gutenberg and Classic. Not WordPress.com Calypso.

The Laravel endpoints live in `content-exchange-v2` — see
`core/docs/Content-Studio-Plugin-Auth.md` (login plus `POST /api/plugin/chat`).

## Load unpacked

1. `chrome://extensions` → Developer mode → Load unpacked → this repo root.
2. Reload the extension after code changes. Reload the WordPress tab so content scripts reinject.

## Login

The popup (toolbar icon) is the sign-in screen. Open **Settings** (cog) to set the Laravel **Server** and inspect the WordPress session dump.

1. Open the popup → **Settings** (cog) → set **Server** to the Laravel origin (this Sail app is often `http://localhost` on port 80; some READMEs say `http://localhost:8080`).
2. **Save host** and allow the origin when Chrome asks.
3. Close Settings, then **Log in**. Chrome opens the sign-in window. Sign in if needed (`admin@immediate.co.uk` / `password123` locally), then **Connect**.
4. The popup closes during the bounce. A Chrome notification should confirm the login, and the plugin popup should reopen with **Successfully logged in as {name}**. Clicking the notification also opens the popup.
5. If the WordPress editor is already open, the **Revision Assistant** composer enables as soon as the token is stored (no tab reload required). The overlay uses Immediate Media blue with the IM circle next to **Revision Assistant**, rolling-dot thinking loader, send spinner, and a short reply sound. The greeting uses the signed-in first name and lists related images and SEO backlinks under **I can also**. A draft checklist flags missing excerpt, SEO, Open Graph, keyphrase, or a thin body. Glyph buttons above the composer are labeled Images, Backlinks, SEO, and Headlines. Messages go to `POST /api/plugin/chat` (Gemini 3.7 Flash). Replies show in the overlay. When the agent returns `edits`, the extension writes title, selected copy, body, excerpt, SEO title/description, Open Graph title/description, and focus keyphrase into the open Gutenberg or Classic editor (Yoast and Rank Math when those plugins are present; matching ACF standfirst/SEO text fields when the site uses Advanced Custom Fields for those boxes) and marks the draft unsaved so Save/Update and the leave-page warning work. Related images and SEO backlinks are inserted into the body the same way. Paste an http(s) URL in chat to have OpenRouter fetch the page (the extension does not fetch it). Headline ideas appear as buttons on the bubble. It does not save or publish; use WordPress Undo to revert title/body. If the WordPress host matches one of the signed-in user's Content Exchange sites, that site's house style is injected into the chat and archive image/backlink search is scoped to that site. If the host does not match and the user has exactly one assigned site, that site's guide is used instead.

The host is stored in `chrome.storage.local` so you can point at local, staging, or production without rebuilding. Changing host clears the stored token and display name.

WordPress session debug is in **Settings**, below the host field (wp-admin attach state: site, editor, form fields). It is not the plugin account name.

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
  → Chrome notification “Successfully logged in…”
  → reopen plugin popup with the same success message
Reopen popup
  → GET {host}/api/plugin/me  Authorization: Bearer
  → show name

Editor chat (signed in)
  → content/chat-modal.js asks content/editor-bridge.js (MAIN world) for a snapshot
  → PLUGIN_CHAT
  → service worker POST {host}/api/plugin/chat
  → Laravel applies writing_style_guide from a matching assigned site (or the user's only site)
  → thinking loader, then { reply, edits, title_variants } in the overlay (reply sound)
  → non-empty edits applied via the MAIN-world bridge (Gutenberg wp.data, Classic/TinyMCE, Yoast/Rank Math, and matching ACF fields)
```

Files: `background/pkce.js`, `background/plugin-auth.js`, `background/plugin-chat.js`, `popup/popup.html`, `content/chat-modal.js`, `content/editor-bridge.js`, `assets/robot.png`, `assets/chat-notification.mp3`.

## Chrome Web Store (private)

Staff install is a **Private** Chrome Web Store listing (not public search). Unlisted is the wrong setting: anyone with the URL could install it.

Full dashboard copy, permission justifications, privacy disclosures, and the upload steps are in `CHROMEWEBSTORE.md`. Package with `./scripts/package-cws.sh` (writes `dist/content-studio-plugin-v0.5.0.zip`). Host `docs/privacy-policy.html` at a public URL before you submit.

After the store assigns an item ID, add `https://<item-id>.chromiumapp.org/` to the Content Studio OAuth client. Unpacked-dev and store builds use different extension IDs.

## Permissions

- `tabs` — read the active tab URL
- `storage` — host, token, and signed-in display name (for the chat avatar)
- `identity` — OAuth bounce
- `notifications` — confirm login after the identity window closes (popup is already gone)
- `host_permissions` `*://*/wp-admin/*` — WordPress admin attach
- `optional_host_permissions` `http://*/*` and `https://*/*` — requested at runtime for the configured Laravel origin (not `<all_urls>`)
- `web_accessible_resources` — robot avatar, chat notification sound, and IM header logo (`http://*/*` and `https://*/*`; Chrome only allows a `/*` path here)

## Out of scope until asked

Save/publish, taxonomies, featured image, Open Graph image, custom meta (other than SEO/Open Graph text fields, focus keyphrase, and matching ACF text fields for those plus excerpt/standfirst), WordPress.com.
