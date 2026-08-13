# WordPress Vampire

Chrome extension (Manifest V3) that attaches to self-hosted WordPress admin (`/wp-admin/`) so agents can inspect the article editor session and apply title, body, excerpt, SEO, and Open Graph edits to the open draft. Immediate Media branded (IM cyan-to-royal icon). Target: Gutenberg and Classic. Not WordPress.com Calypso.

## Agent skills (required)

Treat `.agents/skills/` as the project plugins. Read and follow them before changing code. Do not skip.

| Skill | Path | When |
| --- | --- | --- |
| Chrome Extensions | `.agents/skills/chrome-extensions/SKILL.md` | Any `manifest.json`, content script, service worker, popup, `chrome.*` API, or permissions change. Read the matching file in `.agents/skills/chrome-extensions/references/extensions/` first. |
| Modern Web Guidance | `.agents/skills/modern-web-guidance/SKILL.md` | Any popup/content HTML, CSS, or clientside JS. Search then retrieve guides with `npx -y modern-web-guidance@latest` before writing UI. |

`skills-lock.json` pins those skill sources. Do not invent APIs the skills forbid (Manifest V2, `.then()` chains, inline scripts, missing icon files, `<all_urls>` unless justified).

## Documentation

- After every behaviour, permission, storage, or workflow change, update the relevant documentation in the same change. Do not finish a task with stale docs.
- Keep `README.md` and the architecture notes in this file accurate. Add or extend a doc when a new user-facing or integration surface has no home.
- Content Exchange login for humans is in `README.md`. Laravel endpoints are in `content-exchange-v2/core/docs/Content-Studio-Plugin-Auth.md`.

## How the extension works

```
Toolbar icon click
  → popup/popup.html
  → chrome.tabs.query (active tab)
  → chrome.tabs.sendMessage { type: 'GET_SESSION' }
  → content/detect.js (injected on *://*/wp-admin/*)
  → session + form field payload rendered in the popup

Editor page (post.php / post-new.php)
  → content/chat-modal.js (isolated world, after detect.js)
  → #wp-vampire-chat host + Shadow DOM
  → CEX-look floating chat shell
  → snapshot via CustomEvent wpv-editor → content/editor-bridge.js (MAIN world)
  → send → chrome.runtime.sendMessage PLUGIN_CHAT
  → service worker POST {host}/api/plugin/chat (Bearer token)
  → reply bubble; if edits, apply via the MAIN-world bridge (Gutenberg wp.data or Classic/TinyMCE)
```

- **Content script** (`content/detect.js`) runs in the isolated world. It probes DOM only (no `window.wp`). On load it sends `SESSION_ATTACHED` so the service worker can paint a per-tab green status light on the toolbar icon. Other tabs stay red (disconnected). `GET_SESSION` returns attach state, editor type, post identity, REST root, and every `input` / `select` / `textarea` in the post form, Gutenberg chrome, and same-origin editor iframes. `detectArticleSnapshot()` is the DOM fallback for chat (title, truncated body, excerpt, SEO/Open Graph text fields, editor type). Prefer the MAIN-world snapshot when the bridge is ready.
- **Editor bridge** (`content/editor-bridge.js`) is a second content script with `"world": "MAIN"` so it can call `window.wp` and TinyMCE. Isolated overlay code talks to it with `CustomEvent` (`wpv-editor` / `wpv-editor-result`). Snapshot uses `wp.data.select('core/editor')` or TinyMCE/`#content`, plus Yoast (`yoast-seo/editor`) / Rank Math (`rank-math`) stores and matching hidden inputs for SEO title, SEO description, Open Graph title, and Open Graph description. Apply uses `resetEditorBlocks` plus `editPost` for title/excerpt (Gutenberg, so the draft is marked dirty and native Undo still works; `resetBlocks` alone updates the canvas but leaves Save/Update as saved). SEO/OG writes go through the plugin store when present, registered post meta, and the hidden inputs (native value setter so React-controlled fields update). Do not pass serialized `content` or a second `blocks` payload into `editPost` after `resetEditorBlocks` — entity subscribers can throw and the overlay then reports failure even though the canvas already updated. Classic uses field/TinyMCE writes with `setDirty`/`isNotDirty` and `input`/`change` (autosave compare and beforeunload). Dirty-marking side effects are best-effort and must not fail a successful write. It never saves or publishes. Incoming HTML has `<script>` tags stripped. Do not add the `scripting` permission for this; the static MAIN-world entry is enough.
- **Chat overlay** (`content/chat-modal.js` + `content/chat-modal.css`) mounts only on Gutenberg/Classic. It injects a Shadow DOM shell (header, greeting bubble, composer, collapse/FAB) fixed to the bottom-right. Layout, motion, loader, spinner, and reply sound match the Content Exchange chat modal; colour stays Immediate Media cyan/royal (navy header/composer, `#0267c5` user bubbles/send/FAB, sky `#3AB5F4` thinking dots). Robot avatar on agent turns; initials avatar for the signed-in user. While a reply is in flight it shows the CEX `line-loader` thinking dots and a send-button spinner. A new assistant bubble plays `assets/chat-notification.mp3` (volume 0.3). Open/close uses the same slide+fade motion as CEX (`@starting-style` + `allow-discrete`), with a short fade when `prefers-reduced-motion` is set. The composer is enabled when a Content Exchange token is in `chrome.storage.local`. Send goes through the service worker (`PLUGIN_CHAT`) so the Sanctum token never enters the WordPress page. After a reply, non-empty `edits` are applied through the bridge and a short status line is shown on the bubble. Transcripts stay in memory for the editor page session. Styles are inlined into the shadow `<style>` (page-origin `fetch()` of `chrome-extension://` is blocked). Keep `CHAT_MODAL_CSS` in sync with `content/chat-modal.css`. Do not add a manifest `content_scripts.css` entry. The robot PNG and notification sound are listed in `web_accessible_resources` (`http://*/*` and `https://*/*`; Chrome rejects WAR paths other than `/*`) so `<img>` / `Audio` can load them from the overlay.
- **Popup** (`popup/`) is the debug screen. The Content Exchange block at the top stores a configurable Laravel host, bounces through `chrome.identity.launchWebAuthFlow` to sign in, and shows the CEX user name. WordPress session debug remains below. Keep the popup unless switching to a side panel (which then needs an explicit open trigger).
- **Service worker** (`background/service-worker.js`) is stateless. No globals. Plugin login runs here (`background/plugin-auth.js`) so the identity window can outlive the popup. After a successful token exchange it also stores `apiUserName` from `GET /api/plugin/me` so the overlay can draw the user avatar without putting the Sanctum token on the WordPress page. Chat HTTP runs here (`background/plugin-chat.js`) so optional host permissions apply and the token stays out of the content script. Persist host, token, and `apiUserName` in `chrome.storage.local`, PKCE verifiers in `chrome.storage.session`, timers in `chrome.alarms`. Logout and 401 responses clear token and name together. It composites a green/red light onto the IM icon via `OffscreenCanvas` + `chrome.action.setIcon` (the badge API cannot draw a corner light).
- **Permissions**: `tabs` (so `tab.url` is not silently `undefined`), `storage` (host + Sanctum token + display name), `identity` (Laravel OAuth bounce), `host_permissions` `*://*/wp-admin/*`, `optional_host_permissions` `http://*/*` + `https://*/*` requested at runtime for the configured Laravel origin, and `web_accessible_resources` for `assets/robot.png` and `assets/chat-notification.mp3` on `http://*/*` and `https://*/*` (Chrome rejects WAR match paths other than `/*`). Do not add `scripting` until a feature needs it.

## Conventions

- Manifest V3 only. External scripts, `addEventListener`, `async`/`await`, `return true` on async `onMessage` listeners.
- Icons: `icons/icon-16.png` (16×16), `icon-48.png` (48×48), `icon-128.png` (128×128) must exist if referenced. Source mark is the Immediate IM circle (sky `#3AB5F4` → royal `#0B61B6`, white condensed type). Restyle popup UI to that palette; keep `color-scheme: light dark` and `light-dark()` tokens.
- Form debug: redact password/nonce/secret/token values; truncate long values; skip submit/button/reset/image inputs. Batch DOM work with `requestAnimationFrame` and `scheduler.yield()`.
- Popup HTML: semantic landmarks, one `h1`, no inline handlers. Scrollable regions need `tabindex="0"` and an accessible name.

## Load and test

1. `chrome://extensions` → Developer mode → Load unpacked → repo root.
2. Reload the extension after code changes, then reload the WordPress tab so the content scripts reinject (isolated overlay and MAIN-world bridge).
3. Open a post/page editor (`post.php` / `post-new.php`). The chat shell should slide up bottom-right (navy header, cyan send/FAB); the toolbar icon still opens the debug popup.
4. Content Exchange login: this Sail app is `http://localhost` (port 80; README often says `http://localhost:8080`). Open the popup → Server `http://localhost` → Save host (allow access) → Log in → sign in to CEX (`admin@immediate.co.uk` / `password123` locally) → Connect. Reopen the popup; **Content Exchange** should show `Signed in as {name}`. The editor chat composer enables after login. Ask a question about the draft for a `FlashLite_3_5` reply: the overlay shows the rolling-dot thinking loader, then the reply bubble, a short notification sound, and the user's initials avatar on your turns. Ask to rewrite the title, body, excerpt, SEO, or Open Graph copy and the open editor should update, Save/Update should show unsaved changes, and Undo in WordPress reverts title/body. The post is not saved or published.

## Out of scope until asked

Save/publish, taxonomies, featured image, Open Graph image, focus keyphrase, custom meta (other than SEO/Open Graph text fields), WordPress.com, Chrome Web Store listing (`CHROMEWEBSTORE.md`).
