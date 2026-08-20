# Changelog

All notable changes to Content Studio (the Chrome extension) are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html)
(`manifest.json` `version`).

## [Unreleased]

### Added

- Project changelog. Agent rules in `AGENTS.md` and `CLAUDE.md` require every change to be recorded here.

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
