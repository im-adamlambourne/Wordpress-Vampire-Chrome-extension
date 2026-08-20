# Chrome Web Store Listing — Content Studio Plugin

> Last Updated: 2026-08-19

Private Immediate Media listing. Not searchable on the public Chrome Web Store.
Copy the fields below into the [Chrome Developer Dashboard](https://chrome.google.com/webstore/devconsole).
Do not upload this file in the ZIP.

## Publish as Private (do this)

Private still goes through Google review. It is **not** listed in search, and only the people you name can install it.

Use **Private**, not Unlisted. Unlisted is installable by anyone who has the URL.

1. Sign in at [chrome.google.com/webstore/devconsole](https://chrome.google.com/webstore/devconsole) with an **Immediate Media Google account** if you can (`@immediate.co.uk` or the Workspace domain IT uses for Chrome). A personal Gmail account can still publish Private to trusted testers or a Google Group you own, but it cannot use domain-only publishing.
2. Pay the one-time developer registration fee if the dashboard asks for it.
3. **Account** tab → **Trusted testers**: add staff Google accounts if you are not using domain publishing (each address must be a Google account).
4. Host `docs/privacy-policy.html` at a **public URL with no login wall**. Reviewers open this link. Intranet or Content Studio-behind-auth will fail review. Paste the live URL into **Privacy Policy URL** below and in the dashboard.
5. Run `./scripts/package-cws.sh` and upload `dist/content-studio-plugin-v0.6.0.zip` as a new item.
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
Content Studio Plugin

**Short Description** [REQUIRED]
Revise WordPress drafts from a chat overlay: title, body, excerpt, SEO, Open Graph, and focus keyphrase.

**Detailed Description** [REQUIRED]

Content Studio Plugin adds a revision assistant to your self-hosted WordPress post editor so you can chat about the open draft and apply suggested copy without leaving the page.

FEATURES
• Chat overlay on Gutenberg and Classic editors (posts and pages).
• Updates title, selected copy, body, excerpt, SEO title and description, Open Graph title and description, and focus keyphrase in the open draft.
• Works with Yoast, Rank Math, and matching Advanced Custom Fields text boxes for standfirst, excerpt, SEO, Open Graph, and keyphrase when those are the fields on screen.
• Draft checklist flags missing or over-long title, excerpt, SEO, Open Graph, keyphrase, and a thin body. Click a gap to send a targeted prompt.
• Quick actions for related archive images, SEO backlinks, SEO copy, and headline ideas. Headline ideas appear as buttons on the reply.
• If you have text selected, the rewrite targets that passage. An Advanced Custom Fields block keeps its type and updates its text.
• Sign in from the chat overlay or the toolbar popup. Set your Content Studio server in Settings. A notification confirms a successful login.
• Chat replies arrive in the overlay after you send a message; you do not wait on a frozen page while the assistant works.
• Does not save or publish. Use WordPress Undo to revert title and body. Use Save/Update in WordPress when you are ready.

HOW TO USE
1. Install this listing while signed into Chrome with your Immediate Media Google account (or an account on the allowed tester list / Google Group).
2. Pin Content Studio Plugin and open the toolbar popup.
3. Open Settings, enter your Content Studio server, save, and allow access when Chrome asks.
4. Click Log in, sign in to Content Studio, and Connect.
5. Open a post or page in WordPress admin. The Revision Assistant appears at the bottom right. If you are not signed in, click Sign in in the overlay (after the server is saved) or Log in in the popup.
6. Ask for a change, use a quick action, or click a checklist gap. Review the draft, then save in WordPress yourself.

PRIVACY
The extension stores your server address, sign-in token, display name, and a numeric user id on this computer. Chat and draft snapshots are sent only to the Content Studio server you configure, and only when you send a message. Assistant replies arrive over a realtime connection to the host that server returns at login (locally a port on that machine, otherwise a `ws.` hostname of the same server). There is no advertising or analytics SDK. See the privacy policy linked on this listing. Log out to clear the token and name from this browser.

PERMISSIONS
• “Read your browsing history” (tabs) — detect whether the current tab is WordPress admin so the toolbar icon can show connected or disconnected. The extension does not record a history of sites you visit.
• “Read and change your data on wordpress admin pages” — show the overlay and update the open draft.
• “Identity” — open the Content Studio sign-in window.
• “Storage” — remember server, token, display name, user id, and realtime connection settings.
• “Notifications” — confirm login after the sign-in window closes.
• “Offscreen documents” — keep a quiet background page open so chat replies can arrive after you send a message.
• Optional access to the server you enter — requested when you save a host, not at install, so login, chat, and the realtime connection can reach that origin and the matching realtime host (local port 8081, or `ws.` plus the hostname you saved).

This extension is for Immediate Media staff. It is not affiliated with Automattic or WordPress.com.

SUPPORT
Use the contact email on this listing or the Immediate Media Content Studio team.

Version 0.6.0 — chat replies arrive over a realtime connection so the overlay is not blocked on a long HTTP request.

**Category** [REQUIRED]
Productivity

**Single Purpose** [REQUIRED]
Lets a signed-in editor revise the open WordPress draft from a chat overlay (title, body, excerpt, SEO, Open Graph, and focus keyphrase) without saving or publishing.

**Primary Language** [REQUIRED]
English

## Graphics & Assets

| Asset | Dimensions | Status | Filename |
|-------|-----------|--------|----------|
| Store Icon [REQUIRED] | 128×128 PNG | ✅ Ready | `icons/icon-128.png` (copy in `store-assets/store-icon-128.png`) |
| Screenshot 1 [REQUIRED] | 1280×800 or 640×400 | ⬜ Not created | Capture the Revision Assistant overlay on a Gutenberg draft |
| Screenshot 2 [RECOMMENDED] | 1280×800 or 640×400 | ⬜ Not created | Capture a reply that applied title/body/SEO edits |
| Screenshot 3 [RECOMMENDED] | 1280×800 or 640×400 | ⬜ Not created | Capture the toolbar popup signed-in state (not Settings debug) |
| Screenshot 4 | 1280×800 or 640×400 | ⬜ Not created | |
| Screenshot 5 | 1280×800 or 640×400 | ⬜ Not created | |
| Small Promo Tile [RECOMMENDED] | 440×280 | ⬜ Not created | Optional; Private listings are rarely featured |
| Marquee Promo Tile | 1400×560 | ⬜ Not created | Not needed for Private |

### Screenshot Notes

Take these from a real editor session after login. Chrome Web Store rejects mock device frames and misleading UI.

1. Gutenberg post editor, Revision Assistant open, greeting plus checklist visible, Immediate Media header logo showing.
2. After a rewrite: assistant reply, draft title or body changed, Save/Update showing unsaved changes.
3. Toolbar popup: signed-in name and Log out only (not Log in). Crop out any secrets.

Save files as `store-assets/screenshot-1.png` (1280×800 preferred). Do not put screenshots in the extension ZIP.

## Permissions Justification

Paste these into the Privacy tab. Every line is a user-facing reason, not “needed to work”.

| Permission | Type | Justification |
|------------|------|---------------|
| `tabs` | permissions | Read the current tab URL to detect WordPress admin (`/wp-admin/`) so the toolbar icon can show a connected or disconnected status for that tab. The extension does not use the history API and does not keep a log of visited sites. |
| `storage` | permissions | Store the Content Studio server address the user saves, the sign-in token, the display name used for the chat avatar, a numeric user id used to join that user’s private chat channel, and public realtime connection settings returned at login (host, port, app key — never the server secret). Data stays in Chrome local storage on the device (not synced). |
| `identity` | permissions | Open the Content Studio sign-in window and return the authorization redirect to the extension so staff can connect their account. This is not Google account sign-in. |
| `notifications` | permissions | Show a “Successfully logged in” notification after the sign-in window closes, because the toolbar popup is already gone. Clicking the notification reopens the popup. |
| `offscreen` | permissions | Keep a background page open with a realtime connection to Content Studio so assistant replies can arrive after the toolbar service has gone idle. The page has no UI and does not read WordPress. |
| `*://*/wp-admin/*` | host_permissions | Run on self-hosted WordPress admin so the overlay can read the open draft and apply the user’s requested edits. Hosts vary by brand site, so the match is any `/wp-admin/` path rather than a single domain. The extension does not save or publish. |
| `http://*/*` and `https://*/*` | optional_host_permissions | Not granted at install. When the user clicks Save host, Chrome prompts for the Content Studio origin and a matching realtime origin guessed from that saved hostname (`http://localhost:8081/*` on loopback, otherwise `https://ws.{hostname}/*`). After login, Echo connects to the `broadcasting.host` returned by Content Studio (the same host Laravel derives from that API request). The grant is so login, profile, logout, chat kick-off, channel authorization, and replies can reach those hosts. The extension does not use this grant to read arbitrary websites. |

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
| Web history | No | No | Tab URL is read only to detect wp-admin for the toolbar light; not stored as history | — |
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

Host `docs/privacy-policy.html` somewhere public, then paste the URL here.

Suggested hosts (must load without signing in):

- A public page on an Immediate Media site
- A public GitHub gist of the HTML
- GitHub Pages on a **public** repo (this repo is not enough if it stays private)

The dashboard URL and this file must match the live page.

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
Same contact email, or an internal Content Studio help doc if you have a public URL.

**Homepage URL** [RECOMMENDED]
https://www.immediate.co.uk/

## Test instructions (dashboard)

Paste into the Test instructions tab. Replace the bracketed staging values before submit if you have a reviewer-reachable environment.

```
This item is a private Immediate Media staff tool. It is not meant for the public Chrome Web Store.

What it does
Opens a chat overlay on self-hosted WordPress post/page editors (post.php / post-new.php). After Content Studio login, the user can ask for copy changes. Suggested title, body, selection, excerpt, SEO, Open Graph, and focus keyphrase are written into the open draft. It does not save or publish.

How to install
Load the uploaded package. Pin the toolbar icon.

How to configure
1. Open the popup → Settings (cog).
2. Server: [STAGING CONTENT STUDIO ORIGIN]
3. Save host and allow the origin (and a second realtime origin if Chrome asks: local port 8081, or `ws.` plus the hostname you entered) when Chrome prompts.
4. Close Settings → Log in → sign in → Connect.
5. Expected: Chrome notification “Successfully logged in as …”, popup reopens, overlay chat (greeting, checklist, composer) appears on an editor tab. Signed-out overlay hides the chat and shows Sign in.

WordPress
Open [STAGING WP ADMIN] → Posts → Edit a draft (Gutenberg or Classic). The Revision Assistant should appear bottom-right.

Reviewer account (if provided)
Email: [THROWAY ACCOUNT]
Password: [THROWAY PASSWORD]
Use only this account. Do not publish the test post.

Try
• Send “Tighten the title”.
• Confirm the editor title changes and Save/Update shows unsaved changes.
• WordPress Undo should revert the title.
• Log out from the popup; overlay hides the chat and shows Sign in.

If you have no WordPress or Content Studio access
The popup still opens. Without a host, login explains that a server must be saved. Content scripts only match URLs whose path contains /wp-admin/.
```

## Version History

| Version | Date | Changes | Status |
|---------|------|---------|--------|
| 0.6.0 | 2026-08-19 | Chat replies arrive over a realtime connection. Echo uses `broadcasting.host` from login (`POST /api/plugin/token`); Save host also requests a matching realtime origin (`localhost:8081` or `ws.{saved hostname}`). | Draft |
| 0.5.0 | 2026-08-14 | First private Chrome Web Store submission. Revision Assistant overlay, Content Studio login from the overlay or popup, draft edits including ACF standfirst/SEO fields. | Draft |

## Review Notes

### Known Issues / Limitations

- Reviewers cannot fully test chat apply without a WordPress admin and a Content Studio host. Supply staging credentials if possible.
- After the store assigns an item ID, Content Studio must allow `https://<ITEM_ID>.chromiumapp.org/` or login from the store build fails while unpacked-dev login still works.
- `optional_host_permissions` are `http://*/*` and `https://*/*` so staff can point at local or production hosts. Install does not grant them; Save host requests the API origin and a guessed realtime origin (`localhost:8081` or `ws.{saved hostname}`) that must match `broadcasting.host` from login. Reviewers sometimes query broad optional hosts — use the justification table above.
- Content scripts match all `/wp-admin/` hosts because brand WordPress sites are not a single domain. Chat still requires a saved host and a valid token before anything is sent.
- The overlay does not appear on WordPress.com Calypso.
- Store icon is the Immediate Media IM circle on a black square (`icons/icon-128.png`).

### Laravel / identity checklist after first upload

1. Copy Item ID from the dashboard.
2. Confirm `chrome.identity.getRedirectURL()` for the store build is `https://<ITEM_ID>.chromiumapp.org/`.
3. Add that URI to the Content Studio plugin OAuth client (`content-studio-plugin`), alongside the unpacked-dev URI.
4. Install from the listing on a clean Chrome profile, save the production host, and log in once before inviting the rest of the team.

### Rejection History

None yet.
