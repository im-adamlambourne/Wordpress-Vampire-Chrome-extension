# Chrome Web Store Listing — Content Studio

> Last Updated: 2026-09-09

Private Immediate Media listing. Not searchable on the public Chrome Web Store.
Copy the fields below into the [Chrome Developer Dashboard](https://chrome.google.com/webstore/devconsole).
Do not upload this file in the ZIP.

## Publish as Private (do this)

Private still goes through Google review. It is **not** listed in search, and only the people you name can install it.

Use **Private**, not Unlisted. Unlisted is installable by anyone who has the URL.

1. Sign in at [chrome.google.com/webstore/devconsole](https://chrome.google.com/webstore/devconsole) with an **Immediate Media Google account** if you can (`@immediate.co.uk` or the Workspace domain IT uses for Chrome). A personal Gmail account can still publish Private to trusted testers or a Google Group you own, but it cannot use domain-only publishing.
2. Pay the one-time developer registration fee if the dashboard asks for it.
3. **Account** tab → **Trusted testers**: add staff Google accounts if you are not using domain publishing (each address must be a Google account).
4. Confirm `https://content-studio.im/plugin/privacy` (and `https://develop.content-studio.im/plugin/privacy`) load **without signing in**. Reviewers open this link. Intranet or a login wall will fail review. Paste the production URL into **Privacy Policy URL** below and in the dashboard. Local Sail is `{APP_URL}/plugin/privacy` (this file is also at `docs/privacy-policy.html` if you need a gist fallback).
5. Run `./scripts/package-cws.sh` and upload `dist/content-studio-plugin-v0.8.0.zip` as a new item.
6. As soon as the item exists, copy the **Item ID**. That ID is the production extension ID. Register this redirect on Content Studio (Laravel) before staff try store-build login:

   `https://<ITEM_ID>.chromiumapp.org/`

   Unpacked-dev and store builds have different IDs. Keep the unpacked redirect for local work; add the store redirect for the published item.
7. Fill **Store listing**, **Privacy**, and **Distribution** from this file. Add at least one screenshot (see Graphics).
8. **Distribution → Visibility → Private**, then pick one:
   - **Everyone at [Immediate Media Workspace domain]** — best fit. Only appears if a Workspace admin enabled domain publishing (**Admin console → Devices → Chrome → Apps & extensions → Users & browsers → Additional settings → Chrome Web Store permissions → Allow publishing domain-restricted private apps**). Staff must be signed into Chrome with their work account.
   - **Google Group** you own or manage — any group member signed into Chrome with a member Google account can install.
   - **Trusted testers only** — smallest audience; emails from step 3.
9. Regions: **All regions** (visibility is already limited by Private).
10. **Test instructions**: paste the block in this file. If reviewers cannot reach a WordPress admin and Content Studio, they may bounce the item — provide a staging host and a throwaway account when you have them.
11. Submit for review. Uncheck “publish automatically” if you want to confirm Laravel redirects first (**deferred publishing**; you then have 30 days after approval to publish).
12. After it is live, share the listing URL with staff, or ask Chrome admins to pin/force-install the item ID. The public store search will not show it.

Official visibility docs: [Set up distribution](https://developer.chrome.com/docs/webstore/cws-dashboard-distribution).

## Store Listing

**Extension Name** [REQUIRED]
Content Studio

**Short Description** [REQUIRED]
Revise WordPress drafts from a chat overlay. Sign in from the toolbar popup.

**Detailed Description** [REQUIRED]

Content Studio adds a revision assistant to Immediate Media WordPress Cloud Platform post editors (`*.production.wcp.imdserve.com` and `*.release.wcp.imdserve.com`) so you can improve the open draft without leaving the page.

FEATURES
• Assistant overlay on Gutenberg and Classic editors (posts and pages), named Content Studio Assistant.
• Action buttons for Internal links, Headline, Standfirst, and SEO metadata. Suggestions arrive as reviewable cards: Accept writes that field into the draft, Regenerate asks for another value, Reject dismisses it, Undo puts the previous value back.
• Updates title, selected copy, body, excerpt, SEO title and description, Open Graph title and description, and focus keyphrase in the open draft (body and selection apply as soon as the reply lands; other fields wait until you Accept a card).
• Works with Yoast, Rank Math, and matching Advanced Custom Fields text boxes for standfirst, excerpt, SEO, Open Graph, and keyphrase when those are the fields on screen.
• Sign in from the chat overlay or the toolbar popup. The default server is https://develop.content-studio.im; choose Production or Local from the Server host list in Settings → Show advanced settings. A notification confirms a successful login.
• The signed-in toolbar popup shows your name, log out, and Settings. It does not show Workspace feature buttons in this build.
• Replies arrive in the overlay after you pick an action; you do not wait on a frozen page while the assistant works.
• Does not save or publish. Use WordPress Undo to revert title and body. Use Save/Update in WordPress when you are ready.

HOW TO USE
1. Install this listing while signed into Chrome with your Immediate Media Google account (or an account on the allowed tester list / Google Group).
2. Pin Content Studio and open the toolbar popup.
3. Click **Log in** and allow access when Chrome asks (the default server is https://develop.content-studio.im). To use another host, open Settings, choose **Show advanced settings**, pick a Server host, save, and allow access.
4. Sign in to Content Studio, and Connect.
5. Open a post or page in WordPress admin on Immediate Media WCP (`*.production.wcp.imdserve.com` or `*.release.wcp.imdserve.com`). The Content Studio Assistant appears at the bottom right. If you are not signed in, click Sign in in the overlay or Log in in the popup.
6. Choose an action (for example Headline or SEO metadata). Review the cards, Accept what you want, then save in WordPress yourself.

PRIVACY
The extension stores your server address (https://content-studio.im or https://develop.content-studio.im unless you change it to a local server), sign-in token, display name, and a numeric user id on this computer. Chat and draft snapshots are sent only to that Content Studio server, and only when you send a message. Assistant replies arrive over a realtime connection to the host that server returns at login (locally a port on that machine, otherwise a `ws.` hostname of the same server). There is no advertising or analytics SDK. See the privacy policy linked on this listing. Log out to clear the token and name from this browser.

PERMISSIONS
• “Read your browsing history” (tabs) — detect whether the current tab is Immediate Media WordPress Cloud Platform admin so the toolbar icon can show connected or disconnected. The extension does not record a history of sites you visit.
• “Read and change your data on Immediate Media WordPress Cloud Platform admin” — show the overlay and update the open draft on `*.production.wcp.imdserve.com` and `*.release.wcp.imdserve.com` (and local loopback for development).
• “Identity” — open the Content Studio sign-in window.
• “Storage” — remember server, token, display name, user id, and realtime connection settings.
• “Notifications” — confirm login after the sign-in window closes.
• “Offscreen documents” — keep a quiet background page open so chat replies can arrive after you send a message.
• Optional access to Content Studio — requested when you log in or save a host, not at install, so login, chat, and the realtime connection can reach https://content-studio.im, https://develop.content-studio.im, the matching `ws.` realtime host, or localhost (including port 8081). The extension does not request access to all websites.

This extension is for Immediate Media staff. It is not affiliated with Automattic or WordPress.com.

SUPPORT
Use the contact email on this listing or the Immediate Media Content Studio team.

Version 0.8.0 — Action-led overlay with reviewable suggestion cards (Internal links, Headline, Standfirst, SEO metadata); Workspace feature grid hidden for the beta.

**Category** [REQUIRED]
Productivity

**Single Purpose** [REQUIRED]
Lets a signed-in editor revise the open WordPress draft from an overlay (title, body, excerpt, SEO, Open Graph, and focus keyphrase) without saving or publishing.

**Primary Language** [REQUIRED]
English

## Graphics & Assets

| Asset | Dimensions | Status | Filename |
|-------|-----------|--------|----------|
| Store Icon [REQUIRED] | 128×128 PNG | ✅ Ready | `icons/icon-128.png` (copy in `store-assets/store-icon-128.png`) |
| Screenshot 1 [REQUIRED] | 1280×800 or 640×400 | ⬜ Not created | Capture the Content Studio Assistant overlay on a Gutenberg draft |
| Screenshot 2 [RECOMMENDED] | 1280×800 or 640×400 | ⬜ Not created | Capture a reply that applied title/body/SEO edits |
| Screenshot 3 [RECOMMENDED] | 1280×800 or 640×400 | ⬜ Not created | Capture the toolbar popup signed-in state (not Settings debug) |
| Screenshot 4 | 1280×800 or 640×400 | ⬜ Not created | |
| Screenshot 5 | 1280×800 or 640×400 | ⬜ Not created | |
| Small Promo Tile [RECOMMENDED] | 440×280 | ⬜ Not created | Optional; Private listings are rarely featured |
| Marquee Promo Tile | 1400×560 | ⬜ Not created | Not needed for Private |

### Screenshot Notes

Take these from a real editor session after login. Chrome Web Store rejects mock device frames and misleading UI.

1. Gutenberg post editor, Content Studio Assistant open, greeting plus action row visible, Immediate Media header logo showing.
2. After Headline or SEO: suggestion cards visible; after Accept, draft field changed and Save/Update showing unsaved changes.
3. Toolbar popup: signed-in name and user icon in the header, Log in hidden (no Workspace feature grid). Crop out any secrets.

Save files as `store-assets/screenshot-1.png` (1280×800 preferred). Do not put screenshots in the extension ZIP.

## Permissions Justification

Paste these into the Privacy tab. Every line is a user-facing reason, not “needed to work”.

| Permission | Type | Justification |
|------------|------|---------------|
| `tabs` | permissions | Read the current tab URL to detect Immediate Media WordPress Cloud Platform admin (`*.production.wcp.imdserve.com` and `*.release.wcp.imdserve.com` `/wp-admin/`, plus local loopback) so the toolbar icon can show a connected or disconnected status for that tab. The extension does not use the history API and does not keep a log of visited sites. |
| `storage` | permissions | Store the Content Studio server address the user saves, the sign-in token, the display name used for the chat avatar, a numeric user id used to join that user’s private chat channel, and public realtime connection settings returned at login (host, port, app key — never the server secret). Data stays in Chrome local storage on the device (not synced). |
| `identity` | permissions | Open the Content Studio sign-in window and return the authorization redirect to the extension so staff can connect their account. This is not Google account sign-in. |
| `notifications` | permissions | Show a “Successfully logged in” notification after the sign-in window closes, because the toolbar popup is already gone. Clicking the notification reopens the popup. |
| `offscreen` | permissions | Keep a background page open with a realtime connection to Content Studio so assistant replies can arrive after the toolbar service has gone idle. The page has no UI and does not read WordPress. |
| `https://*.production.wcp.imdserve.com/wp-admin/*` and `https://*.release.wcp.imdserve.com/wp-admin/*` | content_scripts.matches | Run on Immediate Media WordPress Cloud Platform admin so the overlay can read the open draft and apply the user’s requested edits. Brand sites are subdomains of those two WCP hosts, not arbitrary websites. Loopback `/wp-admin/` is included only for local development. This is not listed under `host_permissions` because Chrome ignores the path on that key. The extension does not save or publish. `activeTab` cannot replace this: it only grants access after an action-icon click, and the overlay must appear when the editor page loads. |
| `https://content-studio.im/*`, `https://develop.content-studio.im/*`, `https://ws.content-studio.im/*`, `https://ws.develop.content-studio.im/*`, and localhost (including ports 8080 and 8081) | optional_host_permissions | Not granted at install. When the user clicks Log in or Save host, Chrome prompts only for the chosen Content Studio origin and its matching realtime origin (`https://ws.develop.content-studio.im` or `https://ws.content-studio.im`, or `http://localhost:8081/*` on loopback). After login, Echo connects to the `broadcasting.host` returned by Content Studio. The grant is so login, profile, logout, chat kick-off, channel authorization, and replies can reach those hosts. The extension does not request `http://*/*`, `https://*/*`, or `<all_urls>`. |

## Privacy & Data Use

### Data Collection

**Does the extension collect user data?** Yes

| Data Type | Collected? | Transmitted Off-Device? | Purpose | Shared with Third Parties? |
|-----------|-----------|------------------------|---------|---------------------------|
| Personally identifiable info | Yes | Yes — display name (or email if no name) to the configured Content Studio host during profile fetch; name also stored locally | Show the signed-in name in the popup and initials on chat turns | No, other than the user’s Content Studio server |
| Health info | No | No | — | — |
| Financial info | No | No | — | — |
| Authentication info | Yes | Yes — authorization code exchange and bearer token to the configured host; token stored locally | Sign in, stay signed in, sign out | No, other than the user’s Content Studio server |
| Personal communications | Yes | Yes — chat message, recent overlay transcript, and assistant replies via the configured host (HTTP kick-off plus a realtime connection for the reply) | Generate revision suggestions | No, other than the user’s Content Studio server (which may call Immediate Media’s AI providers) |
| Location | No | No | — | — |
| Web history | No | No | Tab URL is read to detect Immediate Media WCP wp-admin for the toolbar light; not stored as history | — |
| User activity | Yes | Yes — sending a chat turn, plus OS, browser, and extension version | Operate the revision assistant and record which client sent the turn | No, other than the user’s Content Studio server |
| Website content | Yes | Yes — draft snapshot (title, body, excerpt, SEO/OG text, keyphrase, selection) when the user sends a message | Ground replies and apply edits to the open editor | No, other than the user’s Content Studio server |

Dashboard checkboxes to tick **Yes** for: personally identifiable info, authentication info, personal communications, user activity, website content.

Remote code: **No**. All JavaScript ships in the ZIP. Chat responses are JSON (reply text and suggested field values), not executable scripts. Incoming HTML has script tags stripped before it is applied to the editor.

`chrome.storage.sync` is **not** used.

### Data Use Certification

- [x] Data is NOT sold to third parties
- [x] Data is NOT used for purposes unrelated to the extension's core functionality
- [x] Data is NOT used for creditworthiness or lending purposes

## Privacy Policy

**Privacy Policy URL** [REQUIRED]

https://content-studio.im/plugin/privacy

Also served at `https://develop.content-studio.im/plugin/privacy`. This is `GET /plugin/privacy` on Content Studio (`plugin.privacy`). It must stay **unauthenticated**. Deploy the Laravel change before submitting. Local: `{APP_URL}/plugin/privacy`. Fallback copy: `docs/privacy-policy.html` (public gist or GitHub Pages if both hosts are behind a VPN).

The dashboard URL and this file must match the live page. Paste the production URL unless that host is not yet public.

## Distribution

**Visibility**: Private
**Regions**: All regions

Audience (pick one in the dashboard):

1. Immediate Media Workspace domain (preferred)
2. A staff Google Group you own
3. Trusted testers listed on the Account tab

Do not set Public. Do not set Unlisted unless product explicitly accepts “anyone with the link”.

## Developer Info

**Publisher Name** [REQUIRED]
Immediate Media

**Contact Email** [REQUIRED]
Use a monitored Immediate Media address on the dashboard (Google sends rejections and policy mail here). This address is shown on the listing.

**Support URL / Email** [RECOMMENDED]
Same contact email, or an internal Content Studio help doc if you have a public URL. Privacy requests: dataprotection@immediate.co.uk.

**Homepage URL** [RECOMMENDED]
https://www.immediate.co.uk/

## Test instructions (dashboard)

Paste into the Test instructions tab. Replace the bracketed staging values before submit if you have a reviewer-reachable environment.

```
This item is a private Immediate Media staff tool. It is not meant for the public Chrome Web Store.

What it does
Opens a Content Studio Assistant overlay on Immediate Media WordPress Cloud Platform post/page editors (`*.production.wcp.imdserve.com` and `*.release.wcp.imdserve.com`, post.php / post-new.php). After Content Studio login, the editor picks an action (Internal links, Headline, Standfirst, SEO metadata). Headline, standfirst, and SEO suggestions are reviewable cards; Accept writes that field into the open draft. It does not save or publish.

How to install
Load the uploaded package. Pin the toolbar icon.

How to configure
1. Open the popup. The default server is https://develop.content-studio.im (Settings → Show advanced settings → Server host to change it to Production or Local).
2. Click Log in and allow the origin (and a second realtime origin if Chrome asks: `ws.` plus the hostname, or local port 8081) when Chrome prompts.
3. Sign in → Connect.
4. Expected: Chrome notification “Successfully logged in as …”, popup reopens, overlay (greeting and action row) appears on an editor tab. Signed-out overlay hides the actions and shows Sign in.

WordPress
Open [STAGING WP ADMIN on *.production.wcp.imdserve.com or *.release.wcp.imdserve.com] → Posts → Edit a draft (Gutenberg or Classic). The Content Studio Assistant should appear bottom-right.

Reviewer account (if provided)
Email: [THROWAY ACCOUNT]
Password: [THROWAY PASSWORD]
Use only this account. Do not publish the test post.

Try
• Click Headline. Wait for suggestion cards. Accept one.
• Confirm the editor title changes and Save/Update shows unsaved changes.
• Undo on the card should restore the previous title. WordPress Undo should also revert the title.
• Click the user icon in the popup header to log out; overlay hides the chat and shows Sign in.

If you have no WordPress or Content Studio access
The popup still opens. Log in prompts for access to https://develop.content-studio.im (or https://content-studio.im / localhost saved in Settings). Content scripts only match Immediate Media WCP admin (`*.production.wcp.imdserve.com` and `*.release.wcp.imdserve.com`) and local loopback.
```

## Version History

| Version | Date | Changes | Status |
|---------|------|---------|--------|
| 0.8.0 | 2026-09-09 | Action-led overlay: Internal links, Headline, Standfirst and SEO metadata as reviewable cards (Accept / Regenerate / Reject / Undo). Workspace feature grid and free-text chat hidden for the beta. Regenerating a card stays on that card. Popup host is a Production / Develop / Local dropdown. Default server remains Develop (`https://develop.content-studio.im`). | Released |
| 0.7.1 | 2026-08-26 | Content scripts and overlay assets limited to Immediate Media WCP admin (`*.production.wcp.imdserve.com`, `*.release.wcp.imdserve.com`) and loopback. Optional hosts limited to Content Studio and realtime origins (no `http://*/*` / `https://*/*`) to clear Chrome Web Store Broad Host Permissions. Classic Editor **Add Footers** control stays in the media-button row but is hidden. Default Content Studio host is `https://develop.content-studio.im`. Public privacy policy at `https://content-studio.im/plugin/privacy` and `https://develop.content-studio.im/plugin/privacy`. | Draft |
| 0.7.0 | 2026-08-20 | Signed-in toolbar popup shows Workspace feature buttons for the user’s assigned site (`GET /api/plugin/workspace`), using the same glyphs as the Workspace dashboard. Clicking a button opens `/workspace/{siteId}?feature={key}`. | Draft |
| 0.6.0 | 2026-08-19 | Chat replies arrive over a realtime connection. Echo uses `broadcasting.host` from login (`POST /api/plugin/token`); Save host also requests a matching realtime origin (`localhost:8081` or `ws.{saved hostname}`). | Draft |
| 0.5.0 | 2026-08-14 | First private Chrome Web Store submission. Revision Assistant overlay, Content Studio login from the overlay or popup, draft edits including ACF standfirst/SEO fields. | Draft |

## Review Notes

### Known Issues / Limitations

- Reviewers cannot fully test chat apply without a WordPress admin on Immediate Media WCP and a Content Studio host. Supply staging credentials if possible.
- After the store assigns an item ID, Content Studio must allow `https://<ITEM_ID>.chromiumapp.org/` or login from the store build fails while unpacked-dev login still works.
- `optional_host_permissions` are the Content Studio origins and matching realtime hosts, not `http://*/*` / `https://*/*`. Install does not grant them; Log in or Save host requests the API origin and a guessed realtime origin (`localhost:8081`, `ws.develop.content-studio.im`, or `ws.content-studio.im`) that must match `broadcasting.host` from login. New installs default the API origin to `https://develop.content-studio.im`.
- Content scripts match Immediate Media WCP admin (`*.production.wcp.imdserve.com` and `*.release.wcp.imdserve.com`) plus loopback. That pattern is not also in `host_permissions` (Chrome ignores the path on that key). Chat still requires a granted Content Studio host and a valid token before anything is sent.
- `activeTab` is not used. It only grants access after an explicit action-icon click (or equivalent gesture) and would not inject the overlay when an editor tab loads.
- The overlay does not appear on WordPress.com Calypso or on WordPress admin hosts outside WCP / loopback.
- Store icon is the Immediate Media IM circle on a black square (`icons/icon-128.png`).

### Laravel / identity checklist after first upload

1. Copy Item ID from the dashboard.
2. Confirm `chrome.identity.getRedirectURL()` for the store build is `https://<ITEM_ID>.chromiumapp.org/`.
3. Add that URI to the Content Studio plugin OAuth client (`content-studio-plugin`), alongside the unpacked-dev URI.
4. Install from the listing on a clean Chrome profile, log in (default host `https://develop.content-studio.im`, or save another host in Settings), and confirm once before inviting the rest of the team.

### Rejection History

| Date | Issue | Resolution |
|------|-------|------------|
| 2026-08-26 | Chrome Web Store: “Broad Host Permissions” may require in-depth review. Suggested `activeTab` or specific `host_permissions`. | `activeTab` is not suitable (overlay must inject on editor load, not on an action-icon click). Content scripts and web-accessible resources now match only Immediate Media WCP admin (`https://*.production.wcp.imdserve.com`, `https://*.release.wcp.imdserve.com`) and loopback. Optional host permissions are the Content Studio and realtime origins, not `http://*/*` / `https://*/*`. |
