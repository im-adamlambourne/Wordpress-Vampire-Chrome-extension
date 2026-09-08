# Changelog

All notable changes to Content Studio (the Chrome extension) are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html)
(`manifest.json` `version`).

## [Unreleased]

### Added

- Overlay action buttons for **Internal links**, **Headline**, **Standfirst** and **SEO metadata**. **First sub** and **Footers** are shown with a SOON pill and are not usable yet.
- Replies come back as reviewable suggestion cards. **Accept** writes only that field into the draft, **Regenerate** asks for a different value, **Reject** dismisses it, and **Undo** / **Reconsider** put it back. Headline suggestions stay a pick-one list that marks the applied option.
- Editor bridge accepts an opt-in `clear` list (title, excerpt, SEO, Open Graph, focus keyphrase) so **Undo** can restore a field that was blank before the suggestion was accepted. Body and selection are never cleared.
- Beta badge in the overlay header, behind `SHOW_BETA_BADGE` in `content/chat-modal.js`.

### Changed

- Overlay is named **Content Studio Assistant** (was Revision Assistant), and the welcome copy points at the action buttons.
- SEO, Open Graph, excerpt, focus keyphrase and headline replies are no longer written straight into the draft — they wait on a card until accepted. Body and selection rewrites still apply as soon as the reply lands.
- Internal links keeps its existing behaviour (reply plus the body edit) until `POST /api/plugin/chat` returns a `suggestions` array. Once it does, the overlay renders link cards and inserts the anchor itself.
- The panel sizes to its content instead of always being 40rem tall.
- Realtime connection failures show “Could not connect to Content Studio. Please try again later.” instead of asking the user to start Reverb.

### Removed

- Free-text composer is hidden for the beta behind `SHOW_FREE_CHAT`. The send path, prompt history and `PLUGIN_CHAT` wiring are unchanged, so the flag brings it back.
- Draft checklist is hidden behind `SHOW_DRAFT_CHECKLIST`. The Images action and the greeting’s **I can also** list are gone from the overlay; the related-images prompt stays in the source.

## [0.7.1] - 2026-08-26

### Added

- Classic Editor **Add Footers** button next to Add Media, branded with the Immediate Media IM logo and cyan-to-royal gradient. A click opens the revision overlay and asks the assistant to append house-style footers.
- Chrome Web Store privacy policy page (hosted at Content Studio `GET /plugin/privacy`; copy in `docs/privacy-policy.html`).

### Changed

- WordPress admin attach is Immediate Media WCP (`https://*.production.wcp.imdserve.com/wp-admin/*`, `https://*.release.wcp.imdserve.com/wp-admin/*`) and local loopback, not every `/wp-admin/` site. Overlay assets are only exposed on those hosts.
- Optional host access is the Content Studio origins and matching realtime hosts (`https://content-studio.im`, `https://develop.content-studio.im`, `https://ws.` of those hosts, and localhost / port 8081), requested on **Log in** or **Save host**. `http://*/*` and `https://*/*` are gone so Chrome Web Store no longer flags Broad Host Permissions. `activeTab` is not used: the overlay must inject on the editor without an action-icon click.
- Classic Editor **Add Footers** is hidden in the media-button row (`hidden`); the control and prompt wiring stay in place.
- Default Content Studio host is `https://develop.content-studio.im`. Log in requests access for that origin (or another allowed host saved in Settings). Existing saved hosts are left unchanged.
- Privacy policy names Immediate Media Company Limited as controller, states Chrome Web Store Limited Use, lists OpenRouter and Google Gemini as processors, and gives `dataprotection@immediate.co.uk` as the contact. Live URLs are `https://content-studio.im/plugin/privacy` and `https://develop.content-studio.im/plugin/privacy`.

### Fixed

- Toolbar status light uses pre-rendered IM icons instead of OffscreenCanvas `ImageData`, so `chrome.action.setIcon` no longer fails in the service worker. Closed, dragging, and non-http(s) tabs are skipped instead of logged as extension errors.

## [0.7.0] - 2026-08-20

### Added

- Signed-in toolbar popup is a Workspace launcher: it loads `GET /api/plugin/workspace` and shows the enabled feature buttons for the matched assigned site (same glyphs as the Workspace dashboard). Clicking a button opens `/workspace/{siteId}?feature={key}` in a new tab.
- Chat requests include telemetry (OS, browser, and extension version) so Content Studio can record the device environment.

### Changed

- Store and toolbar name is **Content Studio** (was Content Studio Plugin).
- Echo accepts both `ws` and `wss` transports so the realtime connection matches Laravel’s derived host.
- Chat overlay borders use the brand colour token instead of a hard-coded RGB value.

## [0.6.0] - 2026-08-19

### Added

- Chat replies arrive over a realtime connection (Laravel Reverb / Echo in an offscreen document) after `POST /api/plugin/chat` returns `202`.
- Login stores public Echo settings from `POST /api/plugin/token`. Echo uses `broadcasting.host` as `wsHost`.
- Save host also requests a matching realtime origin (`http://localhost:8081` on loopback, otherwise `https://ws.{hostname}`).
- `offscreen` permission so the WebSocket can stay open after the service worker sleeps.

## [0.5.0] - 2026-08-14

### Added

- Snapshot and apply for matching Advanced Custom Fields (ACF) standfirst, excerpt, SEO, Open Graph, and focus keyphrase text fields.
- Sign in from the Revision Assistant overlay (same identity bounce as the toolbar popup).
- IM circle logo in the overlay header; overlay title is **Revision Assistant**.
- Composer quick actions for related images, SEO backlinks, SEO copy, and headline ideas; paste an http(s) URL to have OpenRouter fetch the page.
- Private Chrome Web Store listing copy, packaging script, and privacy policy.

## [0.4.0] - 2026-08-14

### Added

- Focus keyphrase and selected-copy edits (Gutenberg selection or Classic/TinyMCE highlight).
- Draft checklist for missing or over-long title, excerpt, SEO, Open Graph, keyphrase, and a thin body.
- Confirmation of applied edits on the chat bubble.

## [0.3.0] - 2026-08-13

### Added

- SEO title/description and Open Graph title/description edits (Yoast and Rank Math when present).
- Chat loading indicators and Immediate Media cyan/royal overlay styling.

## [0.2.0] - 2026-08-13

### Added

- Content Studio login from the toolbar popup (PKCE identity bounce, Sanctum token).
- Revision chat overlay on Gutenberg and Classic editors.
- MAIN-world editor bridge to apply title, body, and excerpt edits without saving or publishing.
- Per-tab green/red toolbar status light.

### Changed

- Extension renamed from WordPress Vampire to Content Studio Plugin.

## [0.1.0] - 2026-08-13

### Added

- Initial Manifest V3 extension: attach to self-hosted WordPress admin (`/wp-admin/`) and inspect the article editor session from the toolbar popup.
