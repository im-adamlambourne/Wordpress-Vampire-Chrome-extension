# Content Studio Chrome Plugin

**Codename:** Vampire · **Version:** 0.9.0 · **Status:** Beta

<p>
  <img src="icons/icon-128.png" width="96" height="96" alt="Content Studio">
</p>

A Manifest V3 Chrome extension for Immediate Media editorial teams. It sits on the WordPress draft you already have open and lets Content Studio suggest headlines, standfirsts, SEO copy, and internal links — reviewed by you before anything is written into the post.

It attaches to Immediate Media WordPress Cloud Platform admin (`*.production.wcp.imdserve.com` and `*.release.wcp.imdserve.com`) and local loopback. Gutenberg and Classic are both supported. It is not for WordPress.com.

## What it does

On a supported editor, **Content Studio Assistant** appears in the bottom-right of the page. Pick an action; the assistant reads the open draft, talks to Content Studio, and returns suggestions as cards.

| Action | Today |
| --- | --- |
| Internal links | Ready |
| Headline | Ready |
| Standfirst | Ready |
| SEO metadata | Ready |
| First sub | Coming soon |
| Footers | Coming soon |

Each suggestion can be **accepted**, **regenerated**, **rejected**, or **undone**. Accepting writes only that field into the draft (including matching ACF standfirst and SEO boxes when those are the fields on screen). Body, method-step, and list-item rewrites still apply as soon as they arrive. The plugin never saves or publishes — use WordPress Save/Update when you are ready, and WordPress Undo to revert title and body.

**Supported post types:** `post`, `sxs-recipe` (including Method Steps), and `list` (including list-item editorial comments). Other types, including `page`, do not show the assistant.

On a Good Food recipe, **Internal links** wrap an occurrence in a Method Step. On a Radio Times list, they wrap an occurrence in an editorial comment. On a standard post they wrap body copy. Headings, captions, and similar chrome are left alone.

## Getting started

### Staff

Install from Immediate Media’s **private** Chrome Web Store listing (not public search). Sign into Chrome with your work account, pin **Content Studio**, then sign in as below.

Store listing copy, distribution, and packaging live in [`CHROMEWEBSTORE.md`](CHROMEWEBSTORE.md). Merging a version bump to `main` tags a [GitHub release](https://github.com/im-adamlambourne/Wordpress-Vampire-Chrome-extension/releases) with the store ZIP.

### Load unpacked (development)

1. Open `chrome://extensions` → enable **Developer mode** → **Load unpacked** → this repository root.
2. After code changes, reload the extension, then reload the WordPress tab so the overlay reinjects.

The overlay only injects on Immediate Media WCP `/wp-admin/` and `http://localhost` / `http://127.0.0.1`.

## Sign in

The toolbar popup is the sign-in screen. You can also use **Sign in** on the assistant overlay when an editor is already open.

1. Open a WordPress editor tab, then open the popup and click **Log in**.
2. Allow access when Chrome asks (Content Studio and the matching realtime host).
3. Sign in to Content Studio and **Connect**. Local Sail: `admin@immediate.co.uk` / `password123`.
4. A notification confirms login, and the popup reopens with **Successfully logged in as {name}**.

The server follows the WordPress site you are on unless you have saved an override:

| WordPress | Content Studio |
| --- | --- |
| `*.release.wcp.imdserve.com` | [develop.content-studio.im](https://develop.content-studio.im) |
| `*.production.wcp.imdserve.com` | [content-studio.im](https://content-studio.im) |
| Local loopback | Develop, unless you choose **Local** in Settings |

**Settings** (cog) → **Show advanced settings** is where you change server and inspect the WordPress session dump. Saving a host that does not match the current tab sets an override; saving the matching origin clears it. Changing host signs you out.

If the overlay’s **Sign in** cannot request host access, it opens the toolbar popup so **Log in** can.

## Using the assistant

1. Open a `post`, `sxs-recipe`, or `list` in Gutenberg or Classic on WCP (or local WordPress).
2. Sign in if the shell is collapsed to **Sign in**.
3. Choose an action. The assistant thinks, then shows a reply and suggestion cards.
4. Accept the cards you want. Save in WordPress yourself.

House style is taken from the Content Studio site that matches the WordPress host, or from your only assigned site when you are on local WordPress.

## Local Content Studio

To point the plugin at a Sail app instead of Develop:

1. Start Reverb (`docker compose exec laravel.test php artisan reverb:start`, host port **8081**) and a `plugin` worker (`horizon`, or `queue:work --queue=plugin`).
2. In the popup: **Settings** → **Show advanced settings** → Server **Local (localhost)** → **Save host**. Allow `http://localhost` and `http://localhost:8081` when Chrome asks.
3. Sign in from the popup or the overlay.

Laravel auth and realtime endpoints are documented in `content-exchange-v2` (`core/docs/Content-Studio-Plugin-Auth.md`). The chat request/reply contract is [`docs/plugin-chat-api.md`](docs/plugin-chat-api.md). With `QUEUE_CONNECTION=sync`, chat waits on the model instead of returning 202 immediately.

## Documentation

| Doc | What it covers |
| --- | --- |
| [`CHANGELOG.md`](CHANGELOG.md) | Release history |
| [`AGENTS.md`](AGENTS.md) | Architecture and contributor notes |
| [`docs/plugin-chat-api.md`](docs/plugin-chat-api.md) | Chat API contract with Content Studio |
| [`CHROMEWEBSTORE.md`](CHROMEWEBSTORE.md) | Private store listing, permissions, packaging |
| [`docs/privacy-policy.html`](docs/privacy-policy.html) | Privacy policy copy (live at `/plugin/privacy` on Content Studio) |

After changing `offscreen/src/echo-client.js`, run `npm run build:echo` and commit `offscreen/echo-client.js`.

## Privacy

The plugin stores the server address, an optional host override, sign-in token, display name, user id, and public realtime settings on this computer. Draft snapshots and chat are sent only to that Content Studio server, and only when you run an action. There is no advertising or analytics SDK. Log out to clear the token and name.

Live policy: [content-studio.im/plugin/privacy](https://content-studio.im/plugin/privacy) and [develop.content-studio.im/plugin/privacy](https://develop.content-studio.im/plugin/privacy).

## Out of scope

Save/publish, taxonomies, featured image, Open Graph image, custom meta beyond SEO/Open Graph text, focus keyphrase, matching ACF text fields, recipe Method Steps, and list-item editorial comments. WordPress.com is not supported.
