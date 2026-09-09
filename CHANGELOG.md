# Changelog

All notable changes to Content Studio (the Chrome extension) are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html)
(`manifest.json` `version`).

## [Unreleased]

### Added

- Snapshot and apply follow the WordPress `post_type`. `post` keeps today's fields (headline, body, standfirst/Description, Open Graph, SEO, focus keyphrase). `sxs-recipe` also reads and writes **Method Steps** (Good Food ACF flexible `field_sxs-method-recipe-flex`). `list` also reads and writes **list item editorial comments** (Radio Times ACF flexible `field_acf_bs_show_listmeta-list_items`, `broadcast_shows_content` comments only). Method-step rewrites apply immediately, like body. Overlay action buttons are unchanged.

### Changed

- On `sxs-recipe`, **Internal links** apply to Method Steps. Accept wraps the first unlinked occurrence in a step instruction (not a heading, not Classic `#content`) and writes `method_steps`.
- On `list`, **Internal links** apply to list item editorial comments (not the "RT says:" heading, not the show picker, not Classic `#content`). Accept wraps the first unlinked occurrence and writes `list_items`.

### Fixed

- Accepting an **Internal links** card on a recipe now updates the Method Steps on screen. Apply was writing the hidden textarea and reporting success while TinyMCE still showed the old step; it now writes the visual editor in place (and does the same for list item comments).
- Accepting a suggestion card no longer fails with "Could not update the editor". The MAIN-world bridge called `normaliseMethodSteps` on every apply, but that helper lived in a separate content-script file whose functions are not in scope there. Helpers now install on `globalThis`, and apply still writes title/excerpt/SEO if they are missing.
- Recipe **Internal links** Accept now writes Method Steps when the MAIN-world allow-list helpers are missing. Snapshot and apply treated that as "not a recipe" (`method_steps: []`), so cards could still wrap the isolated DOM fallback while the bridge skipped the TinyMCE write. The bridge now falls back to `sxs-recipe` / `list` locally, and still reads/writes when the ACF flex field is on the page.

## [0.8.0] - 2026-09-09

### Added

- Overlay action buttons for **Internal links**, **Headline**, **Standfirst** and **SEO metadata**. **First sub** and **Footers** are shown with a SOON pill and are not usable yet.
- Replies come back as reviewable suggestion cards. **Accept** writes only that field into the draft, **Regenerate** asks for a different value, **Reject** dismisses it, and **Undo** / **Reconsider** put it back. A headline reply becomes one card per alternative rather than a pick-one list, so every suggestion carries the same three buttons. A field holds one value, so accepting a second headline returns the first card to pending and leaves **Undo** pointing at the headline the draft had before any of them. A regenerate is deliberately quiet — no bubble either way — so the card reports it: *Regenerating…* while the request is out, *Regenerated* when the new value lands, and *Nothing new came back* when the reply did not carry that field.
- Editor bridge accepts an opt-in `clear` list (title, excerpt, SEO, Open Graph, focus keyphrase) so **Undo** can restore a field that was blank before the suggestion was accepted. Body and selection are never cleared.
- Beta badge in the overlay header, behind `SHOW_BETA_BADGE` in `content/chat-modal.js`.
- Chat requests carry the `action` id of the overlay button that produced the prompt (`internal_links`, `headline`, `standfirst`, `seo`, and the reserved `first_sub`, `footers`, `images`), so Content Studio no longer has to infer intent from prompt wording. Omitted for free text.
- `docs/plugin-chat-api.md` specifies the chat request and reply contract for the Content Studio side, including the `suggestions` array, per-action expectations, limits and a rollout order.

### Changed

- Local Sail testing of chat now needs the Horizon `plugin` queue (`php artisan horizon`, or `queue:work --queue=plugin`), not `generative`.
- The overlay action buttons sit in a two-column grid so long labels no longer leave a ragged last row.
- The signed-in toolbar popup no longer shows the Workspace feature grid. Sign-in, the header account control, and Settings stay; the catalog fetch, grid, and Settings site picker remain behind `SHOW_WORKSPACE_GRID` in `popup/popup.js`.
- A regenerating suggestion card shows the overlay spinner next to *Regenerating…*.
- Settings **Server host** is a dropdown of Production, Develop, and Local (`localhost`) instead of a typed URL.
- Overlay is named **Content Studio Assistant** (was Revision Assistant), and the welcome copy points at the action buttons.
- SEO, Open Graph, excerpt, focus keyphrase and headline replies are no longer written straight into the draft — they wait on a card until accepted. Body and selection rewrites still apply as soon as the reply lands.
- Internal links keeps its existing behaviour (reply plus the body edit) until `POST /api/plugin/chat` returns a `suggestions` array. Once it does, the overlay renders link cards and inserts the anchor itself.
- The panel sizes to its content instead of always being 40rem tall.
- Realtime connection failures show “Could not connect to Content Studio. Please try again later.” instead of asking the user to start Reverb.

### Removed

- Free-text composer is hidden for the beta behind `SHOW_FREE_CHAT`. The send path, prompt history and `PLUGIN_CHAT` wiring are unchanged, so the flag brings it back.
- Draft checklist is hidden behind `SHOW_DRAFT_CHECKLIST`. The Images action and the greeting’s **I can also** list are gone from the overlay; the related-images prompt stays in the source.

### Fixed

- Chat requests no longer hand the agent the same instruction twice. `history` was sliced from the transcript *after* the new prompt had been pushed onto it, so every request carried the prompt both as the last history turn and as `message`. Single-field prompts suffer most — a repeated instruction invites an acknowledgement instead of an answer, which is why **Regenerate** so often came back with nothing usable. `history` is now the turns before this one, which is what `docs/plugin-chat-api.md` already described.
- An empty reply no longer renders an empty bubble. `reply` is normalised to `''` when the assistant sends none, and the overlay appended it regardless, so "answered with nothing" looked exactly like "never answered". A reply with nothing to show now says so, and the bubble is skipped altogether when the cards or the applied-edit status are the answer.
- **Internal links** produces cards again. The action's prompt asks the agent not to touch the body, so it answers with a bullet list instead of a body rewrite — and Content Studio does not send `suggestions` yet, which left the reply as unusable prose. Those bullets are now read into link cards (`parseLinkSuggestionsFromReply`), preferring the anchor alternative that is actually linkable in the draft, and the bullet list is stripped from the reply bubble. This is interim: `normaliseReply()` still prefers a real `suggestions` array, and the parser can be deleted once the API sends one.
- **Headline** produces cards again on **Regenerate**. The agent often lists alternatives as a numbered list in `reply` and leaves `title_variants` empty, which left the quiet swap with nothing to put in the card. Those lines are now read into title cards (`parseHeadlineVariantsFromReply`), the same interim approach as internal-link bullets. Content Studio also recovers `title_variants` from that list when the array is empty.
- Standfirst, SEO metadata and focus keyphrase now reach Immediate WCP article fields. ACF semantics were matched by exact field name or exact label only, so `im-wp-core-description` (labelled "Description") matched neither and the standfirst was written to the hidden native excerpt box instead of the visible **Description** field — reporting success while nothing changed on screen. The snapshot could not read it either, so the assistant never saw the existing standfirst. `im_seo-main-keyword-phrase` was unmatched for the same reason. Matching is now three passes over a most-specific-first order (exact name, then label, then trailing name segment), which also keeps the three rival "Description" fields — standfirst, Open Graph and SEO meta — from claiming each other.
- Chat requests no longer carry a stale `action` id. `state.activeAction` was only ever set, never cleared, so a free-text message or a draft-checklist prompt reported whichever action button ran last. Both surfaces are behind flags today, but the id is exactly what Content Studio is meant to branch on. Regenerate now passes the action explicitly.
- Accepting an internal link no longer targets headings, captions, pull quotes or code blocks. The first match in the document was winning even when it was an `<h2>`, which is not where a link belongs; an anchor found only in those places is refused instead.
- Realtime replies now carry `suggestions` through to the overlay. The offscreen Echo client and `deliverPluginChatResult` both rebuild the payload from a fixed key list, so the array was dropped twice before reaching the page and the suggestion-card contract could never have worked. Entries are sanitised in the service worker (unknown kinds, unknown fields and unknown keys are stripped, capped at 20) so the WordPress page only sees what the overlay can render.

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
