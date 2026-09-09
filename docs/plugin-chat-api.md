# Plugin chat API — spec for Content Studio (Laravel)

How the Content Studio Chrome extension talks to `POST /api/plugin/chat`, and what the
Laravel side needs to return for the assistant overlay's action buttons and suggestion
cards.

Audience: whoever implements the Content Studio (`content-exchange-v2`) side. The
extension side of everything below is already shipped — see
[`AGENTS.md`](../AGENTS.md) for how the overlay uses it.

## Status

| Field | Direction | State |
| --- | --- | --- |
| `message`, `history`, `article`, `telemetry` | request | Shipped, unchanged |
| `article.method_steps` / `edits.method_steps` | both | **New.** Recipe (`sxs-recipe`) only. Applies immediately, like `content` |
| `action` | request | **New.** Sent by the extension now; Laravel may ignore it safely |
| `reply`, `edits`, `title_variants` | realtime reply | Shipped, unchanged |
| `suggestions` | realtime reply | **New.** Extension parses and renders it; nothing sends it yet |

Nothing here is a breaking change. A Content Studio that ignores `action` and never
sends `suggestions` keeps working exactly as it does today.

## Why this spec exists

The overlay used to be a free-text chat: the user typed, the agent replied with `edits`,
and the extension wrote those edits straight into the WordPress draft.

It is now an action-led panel. The user picks **Internal links**, **Headline**,
**Standfirst** or **SEO metadata**, and the reply is presented as **reviewable cards** —
the writer accepts or rejects each suggestion individually and nothing reaches the draft
until they do. Two things follow:

1. **The backend should know which action ran.** It used to only see prompt text. It now
   also gets an `action` id, so intent does not have to be inferred from wording.
2. **Suggestions want structure.** A flat `edits` object cannot express "here are three
   places you could add an internal link, with anchor text and target URL". The
   `suggestions` array can.

## Transport

Unchanged. The HTTP call only kicks the job off; the answer arrives over Reverb.

```
POST {host}/api/plugin/chat
Authorization: Bearer {sanctum token}
Content-Type: application/json
Accept: application/json
```

- **202** with `{ "request_id": "<string>" }` is the only success. Any other status is
  surfaced to the user as an error, using `message` or `errors.message[0]` from the body
  when present.
- **401** clears the stored token, name, user id and broadcasting config, and disconnects
  Echo. The user has to sign in again.
- The extension does **not** wait on the HTTP response for the reply, even when
  `QUEUE_CONNECTION=sync`.

The answer is broadcast on the private channel `plugin.{userId}` (`private-plugin.{userId}`
on the wire) as one of:

- `.plugin.chat.replied` — `{ request_id, reply, edits, title_variants, suggestions }`
- `.plugin.chat.failed` — `{ request_id, error }`

`request_id` must match the one returned by the 202, or the extension cannot route the
reply back to the right tab.

## Request body

```jsonc
{
  "message": "Write the SEO title, SEO description, …",
  "action": "seo",                       // new, optional — see table below
  "history": [                            // last 20 turns before this one, oldest first
    { "role": "user", "content": "…" },
    { "role": "assistant", "content": "…" }
  ],
  "article": {
    "title": "How to watch the British Open 2026",
    "content": "<p>…</p>",                // editor HTML, truncated
    "excerpt": "",
    "seo_title": "",
    "seo_description": "",
    "og_title": "",
    "og_description": "",
    "focus_keyphrase": "…",               // omitted when empty
    "selection": { "html": "…", "text": "…" },  // omitted when nothing is selected
    "editor_type": "gutenberg",           // or "classic"; omitted when unknown
    "post_id": "1234",
    "post_type": "post",
    "url": "https://…/wp-admin/post.php?post=1234&action=edit"
    // "method_steps": [{ "kind": "step", "text": "…" }]  // sxs-recipe only
  },
  "telemetry": {                          // omitted when nothing could be detected
    "extension_version": "0.8.0",
    "os": "macOS", "os_version": "15.6",
    "browser": "Google Chrome", "browser_version": "…"
  }
}
```

Notes:

- `article.selection` carries only `html` and `text`. Gutenberg client ids are stripped
  before the request leaves the page — they are an internal detail of applying the edit.
- Empty `editor_type`, `focus_keyphrase` and `selection` are removed rather than sent
  blank, so treat "absent" and "empty" as the same thing.
- On `post_type: "sxs-recipe"` the snapshot also sends `article.method_steps`, an array of
  `{ "kind": "heading"|"step", "text": "…" }` rows from the ACF method flexible field
  (max 30 rows, 2000 chars each). Omitted on every other post type. A method rewrite
  comes back on `edits.method_steps` and applies immediately, like `content`.
- The snapshot is best-effort DOM/`wp.data` reading. Any field can be an empty string.

### `action`

One of `internal_links`, `headline`, `standfirst`, `seo`, `first_sub`, `footers`,
`images`. Absent when the user typed free text (which is hidden during the beta but still
wired) or when the request came from somewhere without an action context.

`first_sub`, `footers` and `images` are reserved: the overlay does not currently expose
them, but the ids are fixed so the backend can be built ahead of the UI.

Treat `action` as a **hint about intent, not a command**. The prompt text still carries
the full instruction, and an unrecognised value must not fail the request.

## `suggestions` — the new part

An optional array on `.plugin.chat.replied`, alongside `reply`. Each entry is one card the
writer can accept or reject.

```jsonc
{
  "request_id": "…",
  "reply": "I found 3 places in this draft that could link to related coverage.",
  "suggestions": [
    {
      "id": "link-1",
      "kind": "internal_link",
      "anchor": "World Snooker Tour",
      "target": "Live World Snooker Tour schedule guide",
      "url": "https://radiotimes.com/tv/sport/snooker/world-snooker-tour-schedule/"
    },
    {
      "id": "seo-title",
      "kind": "field",
      "field": "seo_title",
      "label": "SEO title",
      "value": "British Open 2026: How to Watch Snooker Live on TV & Stream"
    }
  ]
}
```

### `kind: "field"`

A single value proposed for one editor field.

| Key | Required | Notes |
| --- | --- | --- |
| `kind` | yes | `"field"` |
| `field` | yes | One of `title`, `excerpt`, `seo_title`, `seo_description`, `og_title`, `og_description`, `focus_keyphrase` |
| `value` | yes | Non-empty string. The exact text to write |
| `label` | no | Card heading. Defaults to the extension's own name for the field |
| `id` | no | Stable id for the card. Generated when absent |

Repeating the same `field` is allowed and is how you offer a choice: each entry becomes its
own card, the labels are numbered when they would otherwise read alike, and accepting one
returns whichever card was accepted before it to pending. That is what a headline reply
looks like, whether it arrives as `title_variants` or as repeated `field: "title"` entries.

`content`, `selection`, and `method_steps` are **not** valid `field` values. A body,
selection, or method rewrite cannot be reviewed sentence by sentence, so those stay on
`edits` and apply as soon as the reply lands.

### `kind: "internal_link"`

A proposed link, which the extension inserts itself.

| Key | Required | Notes |
| --- | --- | --- |
| `kind` | yes | `"internal_link"` |
| `anchor` | yes | Existing body text to link. Must appear verbatim in `article.content` |
| `url` | yes | Link target. A missing scheme is upgraded to `https://`; anything not http(s) is dropped |
| `target` | no | Human label for the destination, shown in bold on the card |
| `id` | no | Stable id for the card |

**Do not also rewrite the body.** On accept, the extension finds the first occurrence of
`anchor` in body prose and wraps it, then writes the result back as a body edit. Text already
inside a link is skipped, and so is anything inside a heading, caption, pull quote or code
block — a link does not belong in those, so an anchor that only appears there is refused. If the reply *also* contains `edits.content`, that body rewrite applies
immediately and defeats the whole review step.

Anchors that do not appear in body prose are shown as a card that fails on accept with
"Could not find … in the body to link", so anchor text must be copied exactly from
`article.content`, not paraphrased — and ideally taken from a paragraph rather than a heading.

### How `suggestions` interacts with `edits`

The extension merges both into one list, with `suggestions` winning:

1. Every valid `suggestions` entry becomes a card.
2. `title_variants` becomes one card per alternative — unless a suggestion already covers `title`.
3. Any `edits` key in the field list above that is **not** already covered becomes a card.
4. `edits.content`, `edits.selection`, and `edits.method_steps` are applied to the draft
   straight away.

So a reply that sends only `edits` still produces cards. Sending `suggestions` is about
control — labels, ordering, multiple values, and link metadata — not about whether cards
appear at all.

## What each action should return

| `action` | Prompt the extension sends | Expected reply |
| --- | --- | --- |
| `internal_links` | "Suggest relevant internal links for this draft. Don't change the draft, the post title or the body, and leave any existing internal links as they are." | `suggestions` of `kind: "internal_link"`, and **no** `edits.content`. Until this ships the extension scrapes the anchors and URLs out of the prose reply, which works but is fragile — this is the action that most wants the structured array |
| `headline` | "Suggest 5 alternative headlines for this draft. Do not change the draft yet." | `title_variants` (already supported), or one `suggestions` entry per alternative with `field: "title"`. One card each |
| `standfirst` | "Write a standfirst for this draft for the excerpt / description field. Do not change the post title or body." | `edits.excerpt`, or `suggestions` with `field: "excerpt"` |
| `seo` | "Write the SEO title, SEO description, Open Graph title, Open Graph description, and focus keyphrase for this draft. Do not change the post title, body or excerpt." | `edits.seo_*` / `og_*` / `focus_keyphrase`, or the same as `suggestions`. One card per field |
| `first_sub` | *(not yet exposed)* | Reserved |
| `footers` | "Add article footers to this draft according to the house style…" | `edits.content`. Body-level, so it applies on arrival rather than as a card |
| `images` | "Find related images from our archive to add to the article" | `edits.content`. Hidden in the overlay for now |

### Regenerate

The card's **Regenerate** button re-sends a single-field prompt with the same `action`,
for example *"Write a different SEO title of 60 characters or fewer. Do not change the post
title, body or excerpt."* The extension takes the first suggestion matching that field and
swaps the value in place. Returning the full set again is fine — the others are ignored.

**A regenerate reply must carry the field**, in `suggestions`, `edits`, or
`title_variants`. Answering in prose ("Sure — how about …?") leaves the card
unchanged, because there is nothing to put in it; the card then says *Nothing
new came back* and the prose is shown as an ordinary reply bubble.

**Headline** is the exception that used to look like that failure: the model
often lists alternatives as a numbered list in `reply` and leaves
`title_variants` empty. Content Studio scrapes those lines into `title_variants`,
and the overlay does the same if they still arrive as prose, so **Regenerate**
on a headline card can swap a value.

`history` holds the turns *before* the message it is sent with — `message` is not repeated
in it.

## Validation and limits

The extension sanitises everything before it reaches the WordPress page, and truncates
again before writing to the editor. Matching these server-side keeps the UI honest, but
nothing breaks if a value is longer — it is cut, not rejected.

| Field | Cap |
| --- | --- |
| `suggestions` entries | 20 |
| `suggestion.value` | 2000 chars |
| `suggestion.anchor` | 200 chars |
| `suggestion.url` | 2000 chars |
| `suggestion.target` | 300 chars |
| `suggestion.label` / `id` | 100 chars |
| `title_variants` | 5 entries |
| `edits.title` | 500 chars |
| `edits.excerpt` | 2000 chars |
| `edits.content` | 20000 chars |
| `edits.method_steps` | 30 rows, 2000 chars per `text`, ~20000 chars combined |
| `edits.selection` | 8000 chars |
| `seo_title`, `og_title`, `focus_keyphrase` | 200 chars |
| `seo_description`, `og_description` | 500 chars |

Rejection rules the extension applies, so malformed entries fail quietly rather than
breaking the panel:

- Entries that are not objects, or whose `kind` is neither `field` nor `internal_link`,
  are dropped.
- `field` entries with an unknown `field` or a blank `value` are dropped.
- `internal_link` entries missing `anchor` or `url` are dropped.
- Unknown keys on an entry are stripped — the page only ever sees the keys above.
- `<script>` tags are removed from any HTML before it reaches the editor.

## Rollout

The pieces are independent and can land in any order:

1. **Accept and log `action`.** No behaviour change; confirms it arrives.
2. **Use `action` to pick the prompt/tooling path** instead of matching on prompt text.
3. **Return `suggestions` for `seo`, `headline`, `standfirst`.** These already work via
   `edits`, so this is a refinement — better labels and ordering.
4. **Return `suggestions` for `internal_links`, and stop rewriting the body for it.** This
   is the one that changes user-visible behaviour, and the one the overlay is waiting on.

Step 4 is the payoff: internal links become reviewable one at a time instead of arriving as
an opaque body rewrite.

## Open questions for the Content Studio side

- **Where do link targets come from?** The card shows `target` as the destination's name,
  so the archive search needs to return a title alongside the URL.
- **Should links be scoped to the matched site?** Archive image and backlink search is
  already scoped to the assigned site when the wp-admin host matches. Internal links
  presumably should be too.
- **First sub** has no prompt or response shape yet — the action id is reserved but the
  behaviour is undefined.
- **Should other fields offer a choice?** Repeated `field` entries already work, so
  three SEO titles would render as three cards today. Whether that is useful or just noise
  is a call for step 3.
