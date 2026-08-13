# WordPress Vampire

Chrome extension (Manifest V3) that attaches to self-hosted WordPress admin (`/wp-admin/`) so agents can inspect the article editor session and its form fields. Immediate Media branded (IM cyan-to-royal icon). Target: Gutenberg and Classic. Not WordPress.com Calypso.

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
  → content/chat-modal.js (same isolated world, after detect.js)
  → #wp-vampire-chat host + Shadow DOM
  → CEX-look floating chat shell (visual only)
```

- **Content script** (`content/detect.js`) runs in the isolated world. It probes DOM only (no `window.wp`). On load it sends `SESSION_ATTACHED` so the service worker can paint a per-tab green status light on the toolbar icon. Other tabs stay red (disconnected). `GET_SESSION` returns attach state, editor type, post identity, REST root, and every `input` / `select` / `textarea` in the post form, Gutenberg chrome, and same-origin editor iframes.
- **Chat overlay** (`content/chat-modal.js` + `content/chat-modal.css`) mounts only on Gutenberg/Classic. It injects a Shadow DOM shell (header, greeting bubble, disabled composer, collapse/FAB) fixed to the bottom-right. No send, transcripts, or backend. Styles are inlined into the shadow `<style>` (page-origin `fetch()` of `chrome-extension://` is blocked). Keep `CHAT_MODAL_CSS` in sync with `content/chat-modal.css`. Do not add a manifest `content_scripts.css` entry.
- **Popup** (`popup/`) is the debug screen. The Content Exchange block at the top stores a configurable Laravel host, bounces through `chrome.identity.launchWebAuthFlow` to sign in, and shows the CEX user name. WordPress session debug remains below. Keep the popup unless switching to a side panel (which then needs an explicit open trigger).
- **Service worker** (`background/service-worker.js`) is stateless. No globals. Plugin login runs here (`background/plugin-auth.js`) so the identity window can outlive the popup. Persist host and token in `chrome.storage.local`, PKCE verifiers in `chrome.storage.session`, timers in `chrome.alarms`. It composites a green/red light onto the IM icon via `OffscreenCanvas` + `chrome.action.setIcon` (the badge API cannot draw a corner light).
- **Permissions**: `tabs` (so `tab.url` is not silently `undefined`), `storage` (host + Sanctum token), `identity` (Laravel OAuth bounce), `host_permissions` `*://*/wp-admin/*`, and `optional_host_permissions` `http://*/*` + `https://*/*` requested at runtime for the configured Laravel origin. Do not add `scripting` until a feature needs it.

## Conventions

- Manifest V3 only. External scripts, `addEventListener`, `async`/`await`, `return true` on async `onMessage` listeners.
- Icons: `icons/icon-16.png` (16×16), `icon-48.png` (48×48), `icon-128.png` (128×128) must exist if referenced. Source mark is the Immediate IM circle (sky `#3AB5F4` → royal `#0B61B6`, white condensed type). Restyle popup UI to that palette; keep `color-scheme: light dark` and `light-dark()` tokens.
- Form debug: redact password/nonce/secret/token values; truncate long values; skip submit/button/reset/image inputs. Batch DOM work with `requestAnimationFrame` and `scheduler.yield()`.
- Popup HTML: semantic landmarks, one `h1`, no inline handlers. Scrollable regions need `tabindex="0"` and an accessible name.

## Load and test

1. `chrome://extensions` → Developer mode → Load unpacked → repo root.
2. Reload the extension after code changes, then reload the WordPress tab so the content script reinjects.
3. Open a post/page editor (`post.php` / `post-new.php`). The chat shell should appear bottom-right; the toolbar icon still opens the debug popup.
4. Content Exchange login: this Sail app is `http://localhost` (port 80; README often says `http://localhost:8080`). Open the popup → Server `http://localhost` → Save host (allow access) → Log in → sign in to CEX (`admin@immediate.co.uk` / `password123` locally) → Connect. Reopen the popup; **Content Exchange** should show `Signed in as {name}`.

## Out of scope until asked

Chat send/transcripts, editor CRUD writes, WordPress.com, Chrome Web Store listing (`CHROMEWEBSTORE.md`).
