const HOST_ID = 'wp-vampire-chat';
const PANEL_ID = 'wpv-chat-panel';
const INPUT_ID = 'wpv-chat-input';
const CHAT_TITLE = 'Content Studio Assistant';
const BETA_LABEL = 'Beta';
/** Beta badge beside the title. Set to false once the trial group is done. */
const SHOW_BETA_BADGE = true;
/**
 * Free-text composer. Hidden for the action-led beta; every send path stays
 * wired, so flipping this back to true restores the input and Send button.
 */
const SHOW_FREE_CHAT = false;
/** Draft checklist. Hidden for now; checklistItems() is kept for its return. */
const SHOW_DRAFT_CHECKLIST = false;
const GREETING_HI = 'Hi! 👋';
const GREETING_BODY = 'Use the buttons below to get suggestions for internal links, a headline, a standfirst, or SEO metadata.';
const IDLE_HINT = 'Choose an action above to get started';
const SIGNED_IN_PLACEHOLDER = 'What should change?';
const DEFAULT_USER_NAME = 'User';
const MAX_HISTORY = 20;
const EDITOR_COMMAND_EVENT = 'wpv-editor';
const EDITOR_RESULT_EVENT = 'wpv-editor-result';
const SNAPSHOT_TIMEOUT_MS = 4000;
const APPLY_TIMEOUT_MS = 10000;
const AUTH_KEYS = ['apiToken', 'apiUserName'];
const PLUGIN_CHAT_RESULT_TIMEOUT_MS = 120000;
const pluginChatResultWaiters = new Map();
const pluginChatResultBuffer = new Map();

chrome.runtime.onMessage.addListener((message) => {
  if (message?.type !== 'PLUGIN_CHAT_RESULT') return;

  const requestId = message.request_id;
  if (!requestId) return;

  const waiter = pluginChatResultWaiters.get(requestId);
  if (waiter) {
    pluginChatResultWaiters.delete(requestId);
    waiter(message);
    return;
  }

  pluginChatResultBuffer.set(requestId, message);
});

function waitForPluginChatResult(requestId) {
  const buffered = pluginChatResultBuffer.get(requestId);
  if (buffered) {
    pluginChatResultBuffer.delete(requestId);
    return Promise.resolve(buffered);
  }

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      pluginChatResultWaiters.delete(requestId);
      reject(new Error('The assistant took too long to reply. Try again.'));
    }, PLUGIN_CHAT_RESULT_TIMEOUT_MS);

    pluginChatResultWaiters.set(requestId, (payload) => {
      clearTimeout(timer);
      resolve(payload);
    });
  });
}

const EDIT_KEYS = [
  'title',
  'content',
  'selection',
  'excerpt',
  'seo_title',
  'seo_description',
  'og_title',
  'og_description',
  'focus_keyphrase',
];
const SEO_PACK_PROMPT = 'Write the SEO title, SEO description, Open Graph title, Open Graph description, and focus keyphrase for this draft. Do not change the post title, body or excerpt.';
const HEADLINES_PROMPT = 'Suggest 5 alternative headlines for this draft. Do not change the draft yet.';
const STANDFIRST_PROMPT = 'Write a standfirst for this draft for the excerpt / description field. Do not change the post title or body.';
const INTERNAL_LINKS_PROMPT = "Suggest relevant internal links for this draft. Don't change the draft, the post title or the body, and leave any existing internal links as they are.";
const RELATED_IMAGES_PROMPT = 'Find related images from our archive to add to the article';
const ADD_FOOTERS_PROMPT = 'Add article footers to this draft according to the house style. Place them immediately before References if that heading is present; otherwise append them at the end. Do not rewrite the rest of the body.';
const FOOTERS_HOST_ID = 'wpv-add-footers';
/** Classic Add Footers stays in the media-button row; set true to show it. */
const ADD_FOOTERS_BUTTON_VISIBLE = false;

/**
 * The action bar. `status` is one of:
 *   ready  — live button that sends `prompt`
 *   soon   — visible but not usable yet (SOON pill, aria-disabled)
 *   hidden — kept in source with its prompt, but not rendered
 */
const ACTIONS = [
  { id: 'internal_links', icon: 'link', label: 'Internal links', status: 'ready', prompt: INTERNAL_LINKS_PROMPT },
  { id: 'headline', icon: 'sparkles', label: 'Headline', status: 'ready', prompt: HEADLINES_PROMPT },
  { id: 'standfirst', icon: 'lines', label: 'Standfirst', status: 'ready', prompt: STANDFIRST_PROMPT },
  { id: 'seo', icon: 'search', label: 'SEO metadata', status: 'ready', prompt: SEO_PACK_PROMPT },
  { id: 'first_sub', icon: 'article', label: 'First sub', status: 'soon' },
  { id: 'footers', icon: 'footer', label: 'Footers', status: 'soon', prompt: ADD_FOOTERS_PROMPT },
  { id: 'images', icon: 'photo', label: 'Images', status: 'hidden', prompt: RELATED_IMAGES_PROMPT },
];
const SOON_LABEL = 'Soon';

/** Editor fields a reply can offer as a reviewable card. */
const CARD_FIELDS = [
  'title',
  'excerpt',
  'seo_title',
  'seo_description',
  'og_title',
  'og_description',
  'focus_keyphrase',
];
const FIELD_LABELS = {
  title: 'Headline',
  excerpt: 'Standfirst',
  seo_title: 'SEO title',
  seo_description: 'SEO description',
  og_title: 'Open Graph title',
  og_description: 'Open Graph description',
  focus_keyphrase: 'Focus keyphrase',
};
const FIELD_ICONS = {
  title: 'sparkles',
  excerpt: 'lines',
  seo_title: 'search',
  seo_description: 'search',
  og_title: 'search',
  og_description: 'search',
  focus_keyphrase: 'search',
};
const REGENERATING_NOTE = 'Regenerating…';
const REGENERATED_NOTE = 'Regenerated';
const REGENERATE_FAILED_NOTE = 'Nothing new came back. Try again.';
const EMPTY_REPLY_TEXT = 'The assistant replied with nothing to show. Try again.';
const REGENERATE_PROMPTS = {
  title: 'Write a different headline for this draft. Do not change the draft yet.',
  excerpt: 'Write a different standfirst for this draft. Do not change the post title or body.',
  seo_title: 'Write a different SEO title of 60 characters or fewer. Do not change the post title, body or excerpt.',
  seo_description: 'Write a different SEO description of 155 characters or fewer. Do not change the post title, body or excerpt.',
  og_title: 'Write a different Open Graph title of 70 characters or fewer. Do not change the post title, body or excerpt.',
  og_description: 'Write a different Open Graph description of 200 characters or fewer. Do not change the post title, body or excerpt.',
  focus_keyphrase: 'Suggest a different focus keyphrase for this draft. Do not change the post title, body or excerpt.',
};
const ICON_PATHS = {
  photo: 'm2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z',
  link: 'M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244',
  search: 'M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m5.231 13.481L15 17.25m-4.5-15H5.625c-.621 0-1.125.504-1.125 1.125v16.5c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Zm3.75 11.625a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z',
  sparkles: 'M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z',
  lines: 'M3.75 6.75h16.5M3.75 12h16.5M3.75 17.25h10.5',
  article: 'M3.75 5.25h16.5v13.5H3.75zM3.75 9.75h16.5M7.5 13.5h3.75M7.5 16.5h6.75',
  footer: 'M3.75 3.75h16.5v16.5H3.75zM3.75 16.5h16.5',
  refresh: 'M3.75 12a8.25 8.25 0 0 1 13.75-6.14l2.75 2.39M20.25 4.5v5.25H15M20.25 12a8.25 8.25 0 0 1-13.75 6.14L3.75 15.75M3.75 19.5v-5.25H9',
  check: 'M4.5 12.75l6 6 9-13.5',
};

// Inlined from chat-modal.css. Content-script fetch() of chrome-extension://
// URLs uses the page origin and is blocked (page CSP / no WAR), so the
// stylesheet must ship in this file.
const CHAT_MODAL_CSS = `/* Source of truth for the overlay look. Runtime uses the CHAT_MODAL_CSS
   copy in chat-modal.js — content-script fetch of this file is blocked
   by the host page. Update both when changing styles.

   Layout, motion, loader, and spinner match the existing chat modal.
   Colour is Immediate Media cyan/royal. */

:host {
  position: fixed;
  bottom: 1rem;
  right: 1rem;
  z-index: 1000100;
  display: block;
  font-family: system-ui, sans-serif;
  color-scheme: dark;
}

*,
*::before,
*::after {
  box-sizing: border-box;
}

.wpv-chat {
  --ws-panel: #0b61b6;
  --ws-well-4: #022240;
  --ws-well-5: #021d36;
  --ws-hairline: rgba(255, 255, 255, 0.14);
  --brand-600: #0267c5;
  --brand-700: #0156a6;
  --window-fill: rgba(31, 41, 55, 0.6);
  --window-border: #374151;
  --bubble-fill: #374151;
  --text: #f3f4f6;
  --text-muted: rgba(255, 255, 255, 0.55);
  --focus-ring: #7ee2fc;

  color: var(--text);
  font-size: 14px;
  line-height: 1.45;
}

.wpv-chat__window {
  display: none;
  flex-direction: column;
  overflow: hidden;
  width: 21rem;
  height: auto;
  max-height: calc(100vh - 2rem);
  background: var(--window-fill);
  backdrop-filter: blur(4px);
  border: 1px solid var(--window-border);
  border-radius: 1rem;
  box-shadow: 0 25px 50px -12px rgb(0 0 0 / 0.35);
  opacity: 0;
  transform: translateY(1rem);
  transition:
    display 0.2s ease-in allow-discrete,
    overlay 0.2s ease-in allow-discrete,
    opacity 0.2s ease-in,
    transform 0.2s ease-in;
}

/* The panel sizes to its content (action bar + whatever cards have arrived)
   and is capped by the base max-height, rather than always being 40rem tall. */
.wpv-chat--signed-in .wpv-chat__window {
  min-height: 17rem;
}

.wpv-chat--signed-in .wpv-chat__signin {
  display: none;
}

.wpv-chat--open .wpv-chat__window {
  display: flex;
  opacity: 1;
  transform: translateY(0);
  transition:
    display 0.7s ease-out allow-discrete,
    overlay 0.7s ease-out allow-discrete,
    opacity 0.7s ease-out,
    transform 0.7s ease-out;

  @starting-style {
    opacity: 0;
    transform: translateY(4rem);
  }
}

.wpv-chat__fab-wrap {
  display: none;
  opacity: 0;
  transition:
    display 0.2s ease allow-discrete,
    opacity 0.2s ease;
}

.wpv-chat:not(.wpv-chat--open) .wpv-chat__fab-wrap {
  display: block;
  opacity: 1;

  @starting-style {
    opacity: 0;
  }
}

.wpv-chat__header,
.wpv-chat__composer {
  flex-shrink: 0;
  background: var(--ws-well-5);
}

.wpv-chat__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--ws-hairline);
}

.wpv-chat__title {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-width: 0;
  margin: 0;
  font-size: 0.9375rem;
  font-weight: 700;
  color: #fff;
}

.wpv-chat__logo {
  flex: none;
  display: block;
  width: 1.25rem;
  height: 1.25rem;
  border-radius: 50%;
}

.wpv-chat__title-text {
  text-box: trim-both cap alphabetic;
}

.wpv-chat__beta {
  flex: none;
  padding: 0.125rem 0.35rem;
  border-radius: 0.25rem;
  background: var(--brand-600);
  color: #fff;
  font-size: 0.625rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.wpv-chat__icon-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
}

.wpv-chat__icon-button:hover:not(:disabled) {
  color: #fff;
}

.wpv-chat__icon-button:focus-visible,
.wpv-chat__fab:focus-visible,
.wpv-chat__send:focus-visible,
.wpv-chat__signin-link:focus-visible,
.wpv-chat__action:focus-visible,
.wpv-chat__card-button:focus-visible,
.wpv-chat__undo:focus-visible {
  outline: 2px solid var(--focus-ring);
  outline-offset: 2px;
}

.wpv-chat__messages {
  flex: 1;
  overflow-y: auto;
  margin: 0;
  padding: 0.75rem;
  list-style: none;
  scrollbar-width: none;
}

.wpv-chat__messages::-webkit-scrollbar {
  display: none;
}

.wpv-chat__row {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
}

.wpv-chat__row + .wpv-chat__row {
  margin-top: 0.75rem;
}

.wpv-chat__row--user {
  flex-direction: row-reverse;
}

.wpv-chat__row--thinking {
  align-items: center;
}

.wpv-chat__avatar {
  display: block;
  flex-shrink: 0;
  width: 1.75rem;
  height: 1.75rem;
  border-radius: 999px;
  object-fit: cover;
  background: var(--ws-panel);
}

.wpv-chat__avatar--robot {
  border-radius: 0;
  object-fit: contain;
  background: transparent;
}

.wpv-chat__bubble {
  display: flex;
  flex-direction: column;
  max-width: 90%;
  padding: 0.5rem 0.75rem;
  line-height: 1.5;
  background: var(--bubble-fill);
  border-radius: 0 0.75rem 0.75rem 0.75rem;
}

.wpv-chat__row--user .wpv-chat__bubble {
  background: var(--brand-600);
  border-radius: 0.75rem 0 0.75rem 0.75rem;
}

.wpv-chat__row--user .wpv-chat__bubble > p {
  color: #fff;
}

.wpv-chat__row--error .wpv-chat__bubble {
  background: #7f1d1d;
}

.wpv-chat__bubble > p {
  margin: 0;
  font-size: 0.875rem;
  font-weight: 400;
  color: var(--text);
  overflow-wrap: anywhere;
}

.wpv-chat__bubble--greeting > p {
  line-height: 1.625;
}

.wpv-chat__bubble .wpv-chat__status {
  margin: 0.35rem 0 0;
  font-size: 0.75rem;
  color: var(--text-muted);
}

.wpv-chat__bubble .wpv-chat__status--error {
  color: #fca5a5;
}

.wpv-chat__line-loader {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  display: block;
  margin: 15px 0;
  position: relative;
  color: #fff;
  left: 0;
  box-sizing: border-box;
  animation: wpv-shadow-rolling 2s linear infinite;
}

@keyframes wpv-shadow-rolling {
  0% {
    box-shadow: 0 0 rgba(58, 181, 244, 0), 0 0 rgba(255, 255, 255, 0), 0 0 rgba(58, 181, 244, 0), 0 0 rgba(255, 255, 255, 0);
  }

  12% {
    box-shadow: 60px 0 rgb(58, 181, 244), 0 0 rgba(255, 255, 255, 0), 0 0 rgba(58, 181, 244, 0), 0 0 rgba(255, 255, 255, 0);
  }

  25% {
    box-shadow: 66px 0 white, 60px 0 rgb(58, 181, 244), 0 0 rgba(255, 255, 255, 0), 0 0 rgba(58, 181, 244, 0);
  }

  36% {
    box-shadow: 72px 0 rgb(58, 181, 244), 66px 0 white, 60px 0 rgb(58, 181, 244), 0 0 rgba(255, 255, 255, 0);
  }

  50% {
    box-shadow: 78px 0 white, 72px 0 rgb(58, 181, 244), 66px 0 white, 60px 0 rgb(58, 181, 244);
  }

  62% {
    box-shadow: 120px 0 rgba(58, 181, 244, 0), 78px 0 white, 72px 0 rgb(58, 181, 244), 66px 0 white;
  }

  75% {
    box-shadow: 120px 0 rgba(255, 255, 255, 0), 120px 0 rgba(58, 181, 244, 0), 78px 0 white, 72px 0 rgb(58, 181, 244);
  }

  87% {
    box-shadow: 120px 0 rgba(58, 181, 244, 0), 120px 0 rgba(255, 255, 255, 0), 120px 0 rgba(58, 181, 244, 0), 78px 0 white;
  }

  100% {
    box-shadow: 120px 0 rgba(255, 255, 255, 0), 120px 0 rgba(58, 181, 244, 0), 120px 0 rgba(255, 255, 255, 0), 120px 0 rgba(58, 181, 244, 0);
  }
}

.wpv-chat__composer {
  padding: 0.75rem 1rem;
  border-top: 1px solid var(--ws-hairline);
}

.wpv-chat__form {
  position: relative;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.wpv-chat__form[hidden],
.wpv-chat__composer-tools[hidden],
.wpv-chat__signin[hidden],
.wpv-chat__signin-status[hidden],
.wpv-chat__messages[hidden],
.wpv-chat__checklist[hidden] {
  display: none;
}

.wpv-chat__signin {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  gap: 0.35rem;
  min-height: 3rem;
}

.wpv-chat__signin-copy {
  margin: 0;
  font-size: 0.875rem;
  color: var(--text);
}

.wpv-chat__signin-link {
  display: inline;
  margin: 0;
  padding: 0;
  border: 0;
  background: transparent;
  color: #7ee2fc;
  font: inherit;
  font-weight: 600;
  text-decoration: underline;
  text-underline-offset: 0.12em;
  cursor: pointer;
}

.wpv-chat__signin-link:hover:not(:disabled) {
  color: #fff;
}

.wpv-chat__signin-link:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.wpv-chat__signin-status {
  margin: 0;
  font-size: 0.75rem;
  color: var(--text-muted);
}

.wpv-chat__signin-status--error {
  color: #f87171;
}

.wpv-chat__field {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.wpv-chat__visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
  border: 0;
}

.wpv-chat__input {
  flex: 1;
  min-width: 0;
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--brand-600);
  border-radius: 0.75rem;
  background: var(--ws-well-4);
  color: #fff;
  font: inherit;
  font-size: 0.875rem;
}

.wpv-chat__input::placeholder {
  color: rgb(255 255 255 / 0.48);
}

.wpv-chat__input:focus {
  background: var(--ws-well-5);
  border-color: rgb(126 226 252 / 0.75);
  box-shadow: 0 0 0 3px rgb(58 181 244 / 0.28);
  outline: none;
}

.wpv-chat__input:user-invalid {
  border-color: #f87171;
}

.wpv-chat__input:disabled,
.wpv-chat__send:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.wpv-chat__send {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 6rem;
  padding: 0.5rem 1rem;
  border: 0;
  border-radius: 0.75rem;
  background: var(--brand-600);
  color: #fff;
  font: inherit;
  font-size: 0.875rem;
  font-weight: 600;
  transition: background-color 0.15s ease;
}

.wpv-chat__send:hover:not(:disabled) {
  background: var(--brand-700);
}

.wpv-chat__spinner {
  width: 1.25rem;
  height: 1.25rem;
  animation: wpv-spin 1s linear infinite;
}

.wpv-chat__spinner-track {
  opacity: 0.25;
}

.wpv-chat__spinner-head {
  opacity: 0.75;
}

@keyframes wpv-spin {
  to {
    transform: rotate(360deg);
  }
}

.wpv-chat__fab {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  border: 0;
  border-radius: 999px;
  background: var(--brand-600);
  color: #fff;
  box-shadow: 0 25px 50px -12px rgb(0 0 0 / 0.35);
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.wpv-chat__fab:hover:not(:disabled) {
  background: var(--brand-700);
}

.wpv-chat__checklist {
  flex-shrink: 0;
  border-bottom: 1px solid var(--ws-hairline);
  background: var(--ws-well-4);
}

.wpv-chat__checklist > summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.4rem 1rem;
  font-size: 0.75rem;
  color: var(--text-muted);
  cursor: pointer;
  list-style: none;
}

.wpv-chat__checklist > summary::-webkit-details-marker {
  display: none;
}

.wpv-chat__checklist-count {
  font-variant-numeric: tabular-nums;
}

.wpv-chat__checklist-items {
  margin: 0;
  padding: 0 0.75rem 0.5rem;
  list-style: none;
}

.wpv-chat__check {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  width: 100%;
  padding: 0.2rem 0.25rem;
  border: 0;
  border-radius: 0.35rem;
  background: transparent;
  color: var(--text);
  font: inherit;
  font-size: 0.75rem;
  text-align: left;
  cursor: pointer;
}

.wpv-chat__check:hover:not(:disabled) {
  background: rgb(255 255 255 / 0.06);
}

.wpv-chat__check:disabled {
  cursor: default;
}

.wpv-chat__check:focus-visible {
  outline: 2px solid var(--focus-ring);
  outline-offset: 2px;
}

.wpv-chat__dot {
  width: 0.45rem;
  height: 0.45rem;
  border-radius: 999px;
  background: #4ade80;
}

.wpv-chat__dot--warn {
  background: #fbbf24;
}

.wpv-chat__dot--gap {
  background: #f87171;
}

.wpv-chat__composer-tools {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  margin-bottom: 0.5rem;
}

.wpv-chat__hint {
  margin: 0;
  font-size: 0.7rem;
  color: var(--text-muted);
}

.wpv-chat__actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.5rem;
}

.wpv-chat__action {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  column-gap: 0.35rem;
  min-inline-size: 0;
  padding-block: 0.5rem;
  padding-inline: 0.6rem;
  border: 1px solid var(--ws-hairline);
  border-radius: 0.45rem;
  background: var(--ws-well-4);
  color: #e5e7eb;
  font: inherit;
  font-size: 0.8125rem;
  font-weight: 500;
  text-align: start;
  cursor: pointer;
  user-select: none;
  transition:
    background-color 0.15s ease,
    border-color 0.15s ease,
    color 0.15s ease;
}

.wpv-chat__action:hover:not(:disabled, [aria-disabled='true']),
.wpv-chat__action:focus-visible {
  background: var(--ws-well-5);
  border-color: rgb(58 181 244 / 0.45);
  color: #fff;
}

.wpv-chat__action:hover:not(:disabled, [aria-disabled='true']) .wpv-chat__action-icon,
.wpv-chat__action:focus-visible .wpv-chat__action-icon {
  color: #3ab5f4;
}

.wpv-chat__action[aria-pressed='true'] {
  background: var(--brand-700);
  border-color: var(--brand-600);
  color: #fff;
  font-weight: 700;
}

.wpv-chat__action[aria-pressed='true'] .wpv-chat__action-icon {
  color: #7ee2fc;
}

/* Coming-soon actions stay focusable (aria-disabled, not disabled) so keyboard
   users can reach them and hear that they are not ready yet. */
.wpv-chat__action[aria-disabled='true'] {
  background: rgb(255 255 255 / 0.03);
  border-color: rgb(255 255 255 / 0.06);
  color: rgb(255 255 255 / 0.38);
  cursor: not-allowed;
}

.wpv-chat__action[aria-disabled='true'] .wpv-chat__action-icon {
  color: rgb(255 255 255 / 0.28);
}

.wpv-chat__action:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.wpv-chat__action-icon {
  flex-shrink: 0;
  width: 0.95rem;
  height: 0.95rem;
  color: #a5b4fc;
}

.wpv-chat__action-label {
  min-inline-size: 0;
  text-wrap: nowrap;
  overflow: clip;
  text-overflow: ellipsis;
  text-box: trim-both cap alphabetic;
}

.wpv-chat__soon {
  flex: none;
  padding: 0.05rem 0.3rem;
  border-radius: 0.25rem;
  background: rgb(255 255 255 / 0.08);
  color: rgb(255 255 255 / 0.5);
  font-size: 0.5625rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.wpv-chat__idle-hint {
  margin: 0.5rem 0 0;
  font-size: 0.75rem;
  font-style: italic;
  color: var(--text-muted);
}

.wpv-chat__idle-hint[hidden] {
  display: none;
}

.wpv-chat__suggestions {
  display: block;
}

.wpv-chat__suggestions + .wpv-chat__row {
  margin-top: 0.75rem;
}

.wpv-chat__cards {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.wpv-chat__card {
  padding: 0.6rem 0.7rem;
  border: 1px solid var(--ws-hairline);
  border-radius: 0.625rem;
  background: var(--ws-well-4);
}

.wpv-chat__card--accepted {
  border-color: var(--brand-600);
}

.wpv-chat__card--rejected {
  border-color: rgb(255 255 255 / 0.06);
  color: var(--text-muted);
}

.wpv-chat__card-label {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  margin: 0 0 0.35rem;
  font-size: 0.6875rem;
  font-weight: 600;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  color: #93c5fd;
}

.wpv-chat__card-label-icon {
  flex-shrink: 0;
  width: 0.75rem;
  height: 0.75rem;
}

.wpv-chat__card-value {
  margin: 0;
  font-size: 0.8125rem;
  line-height: 1.45;
  color: #fff;
  overflow-wrap: anywhere;
}

.wpv-chat__card-meta {
  margin: 0.2rem 0 0;
  font-size: 0.7rem;
  color: var(--text-muted);
  overflow-wrap: anywhere;
}

.wpv-chat__card-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.3rem;
  margin-top: 0.5rem;
}

.wpv-chat__card-button {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.3rem 0.5rem;
  border: 1px solid var(--ws-hairline);
  border-radius: 0.375rem;
  background: transparent;
  color: #e5e7eb;
  font: inherit;
  font-size: 0.6875rem;
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.wpv-chat__card-button:hover:not(:disabled) {
  background: var(--ws-well-5);
}

.wpv-chat__card-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.wpv-chat__card-button--accept {
  border-color: var(--brand-600);
  background: var(--brand-600);
  color: #fff;
  font-weight: 600;
}

.wpv-chat__card-button--accept:hover:not(:disabled) {
  background: var(--brand-700);
}

.wpv-chat__card-button-icon {
  flex-shrink: 0;
  width: 0.7rem;
  height: 0.7rem;
}

.wpv-chat__card-state {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.35rem;
  margin: 0.5rem 0 0;
  font-size: 0.75rem;
  color: var(--text-muted);
}

.wpv-chat__card-state .wpv-chat__spinner {
  flex-shrink: 0;
  width: 0.85rem;
  height: 0.85rem;
  color: rgb(58, 181, 244);
}

.wpv-chat__card-state--added {
  color: #4ade80;
}

.wpv-chat__card-state--error {
  color: #fca5a5;
}

.wpv-chat__undo {
  padding: 0;
  border: 0;
  background: transparent;
  color: #7ee2fc;
  font: inherit;
  font-size: 0.75rem;
  text-decoration: underline;
  text-underline-offset: 0.12em;
  cursor: pointer;
}

.wpv-chat__undo:hover:not(:disabled) {
  color: #fff;
}

.wpv-chat__undo:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

@media (prefers-reduced-motion: reduce) {
  .wpv-chat__window,
  .wpv-chat--open .wpv-chat__window,
  .wpv-chat__fab-wrap {
    transform: none;
    transition-duration: 0.1s;
  }

  .wpv-chat--open .wpv-chat__window {
    @starting-style {
      transform: none;
    }
  }

  .wpv-chat__line-loader {
    animation: none;
    width: 4.5rem;
    height: 6px;
    margin: 0.5rem 0;
    border-radius: 0;
    background:
      radial-gradient(circle closest-side, rgb(58, 181, 244) 90%, transparent) 0 / 33% 100% no-repeat,
      radial-gradient(circle closest-side, #fff 90%, transparent) 50% / 33% 100% no-repeat,
      radial-gradient(circle closest-side, rgb(58, 181, 244) 90%, transparent) 100% / 33% 100% no-repeat;
    box-shadow: none;
  }

  .wpv-chat__spinner {
    animation: none;
    opacity: 0.7;
  }

  .wpv-chat__action,
  .wpv-chat__card-button {
    transition-duration: 0.05s;
  }
}
`;

const FOOTERS_BUTTON_CSS = `:host {
  display: inline-block;
  vertical-align: top;
  margin-block: 0 4px;
  margin-inline: 0 5px;
  font-family: inherit;
  color-scheme: light;
}

:host([hidden]) {
  display: none;
}

button {
  box-sizing: border-box;
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  min-height: 30px;
  padding-block: 0;
  padding-inline: 0.55rem 0.7rem;
  border: 0;
  border-radius: 3px;
  background: linear-gradient(135deg, #3ab5f4 0%, #0b61b6 100%);
  color: #fff;
  font: 600 13px / 1.2 inherit;
  letter-spacing: -0.01em;
  white-space: nowrap;
  cursor: pointer;
  transition: filter 0.15s ease;
}

button:hover:not(:disabled) {
  filter: brightness(0.92);
}

button:focus-visible {
  outline: 2px solid #7ee2fc;
  outline-offset: 2px;
}

button:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

img {
  flex: none;
  width: 18px;
  height: 18px;
  border-radius: 50%;
}

.label {
  text-box: trim-both cap alphabetic;
}

@media (prefers-reduced-motion: reduce) {
  button {
    transition: none;
  }
}

@media (forced-colors: active) {
  button {
    background: ButtonFace;
    color: ButtonText;
    border: 1px solid ButtonText;
    filter: none;
  }
}
`;

let footersOnClick = null;
let footersBusy = false;
let footersToolbarQueued = false;
let footersToolbarObserver = null;

function footersToolbarRow() {
  return document.getElementById('wp-content-media-buttons')
    || document.querySelector('#wp-content-editor-tools .wp-media-buttons')
    || document.querySelector('.wp-media-buttons:has(#insert-media-button)');
}

function setFootersToolbar({ busy = false, onClick } = {}) {
  if (typeof onClick === 'function') footersOnClick = onClick;
  footersBusy = Boolean(busy);
  ensureFootersToolbar();
}

function ensureFootersToolbar() {
  if (footersToolbarQueued) return;
  footersToolbarQueued = true;
  requestAnimationFrame(() => {
    footersToolbarQueued = false;
    injectFootersToolbar();
  });
}

function injectFootersToolbar() {
  if (typeof footersOnClick !== 'function') return;

  const row = footersToolbarRow();
  if (!row) return;

  let host = document.getElementById(FOOTERS_HOST_ID);
  if (host && host.parentElement !== row) {
    host.remove();
    host = null;
  }
  if (!host) {
    host = buildFootersToolbarHost();
    row.appendChild(host);
  }

  host.hidden = !ADD_FOOTERS_BUTTON_VISIBLE;
  const button = host.shadowRoot?.querySelector('button');
  if (button) button.disabled = footersBusy;
}

function buildFootersToolbarHost() {
  const host = document.createElement('span');
  host.id = FOOTERS_HOST_ID;
  host.className = 'wpv-add-footers';
  host.hidden = !ADD_FOOTERS_BUTTON_VISIBLE;
  const shadow = host.attachShadow({ mode: 'open' });
  const style = document.createElement('style');
  style.textContent = FOOTERS_BUTTON_CSS;
  const button = document.createElement('button');
  button.type = 'button';
  const logo = document.createElement('img');
  logo.src = chrome.runtime.getURL('icons/icon-48.png');
  logo.alt = '';
  logo.width = 18;
  logo.height = 18;
  logo.setAttribute('aria-hidden', 'true');
  const label = document.createElement('span');
  label.className = 'label';
  label.textContent = 'Add Footers';
  button.append(logo, label);
  button.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    footersOnClick?.();
  });
  shadow.append(style, button);
  return host;
}

function watchFootersToolbar() {
  if (footersToolbarObserver || !document.body) return;

  footersToolbarObserver = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type !== 'childList') continue;
      for (const node of mutation.addedNodes) {
        if (!(node instanceof Element)) continue;
        if (
          node.id === 'wp-content-media-buttons'
          || node.id === 'wp-content-editor-tools'
          || node.classList.contains('wp-media-buttons')
          || node.querySelector?.('#wp-content-media-buttons, .wp-media-buttons')
        ) {
          ensureFootersToolbar();
          return;
        }
      }
      for (const node of mutation.removedNodes) {
        if (node instanceof Element && (node.id === FOOTERS_HOST_ID || node.querySelector?.(`#${FOOTERS_HOST_ID}`))) {
          ensureFootersToolbar();
          return;
        }
      }
    }
  });

  footersToolbarObserver.observe(document.body, { childList: true, subtree: true });
  ensureFootersToolbar();
}

function isEditorPath() {
  const file = location.pathname.split('/').pop() || '';
  return file === 'post.php' || file === 'post-new.php';
}

function editorType() {
  return typeof detectEditorType === 'function' ? detectEditorType() : null;
}

function shouldMount() {
  const type = editorType();
  return type === 'gutenberg' || type === 'classic' || isEditorPath();
}

function editorChromePresent() {
  return !!document.getElementById('editor')
    || document.body?.classList.contains('block-editor-page')
    || !!document.querySelector('.block-editor, .edit-post-layout');
}

function svgIcon(paths, { size = 24, strokeWidth = 2 } = {}) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('width', String(size));
  svg.setAttribute('height', String(size));

  for (const d of paths) {
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('stroke-linecap', 'round');
    path.setAttribute('stroke-linejoin', 'round');
    path.setAttribute('stroke-width', String(strokeWidth));
    path.setAttribute('d', d);
    svg.appendChild(path);
  }

  return svg;
}

function firstName(name) {
  return String(name || '').trim().split(/\s+/, 1)[0] || '';
}

function greetingText(rawUserName) {
  const name = firstName(rawUserName);
  const hi = name ? `Hi ${name}! 👋` : GREETING_HI;
  return `${hi} ${GREETING_BODY}`;
}

function strokeIcon(name, className) {
  const d = ICON_PATHS[name] || ICON_PATHS.sparkles;
  const svg = svgIcon([d], { size: 16, strokeWidth: 1.5 });
  svg.setAttribute('class', className);
  return svg;
}

function visibleActions() {
  return ACTIONS.filter((action) => action.status !== 'hidden');
}

function actionButton(action) {
  const soon = action.status === 'soon';
  const children = [
    strokeIcon(action.icon, 'wpv-chat__action-icon'),
    el('span', { className: 'wpv-chat__action-label', text: action.label }),
  ];
  if (soon) children.push(el('span', { className: 'wpv-chat__soon', text: SOON_LABEL }));

  // Coming-soon actions use aria-disabled, not disabled, so keyboard users can
  // still land on them and hear that they are not ready.
  return el('button', {
    type: 'button',
    className: soon ? 'wpv-chat__action wpv-chat__action--soon' : 'wpv-chat__action',
    'data-action-id': action.id,
    'aria-disabled': soon ? 'true' : false,
    'aria-pressed': soon ? false : 'false',
    disabled: !soon,
  }, children);
}

function greetingRow(rawUserName) {
  return el('li', {
    className: 'wpv-chat__row',
    'data-greeting': '',
  }, [
    robotAvatar(),
    el('div', { className: 'wpv-chat__bubble wpv-chat__bubble--greeting' }, [
      el('p', { 'data-greeting-text': '', text: greetingText(rawUserName) }),
    ]),
  ]);
}

function signInGate({ hidden = false } = {}) {
  const link = el('button', {
    type: 'button',
    className: 'wpv-chat__signin-link',
    text: 'Sign in',
  });
  const copy = el('p', { className: 'wpv-chat__signin-copy' });
  copy.append(link, ' to use assistant.');
  const status = el('p', {
    className: 'wpv-chat__signin-status',
    role: 'status',
    'aria-live': 'polite',
    hidden: true,
  });
  return el('div', {
    className: 'wpv-chat__signin',
    hidden,
  }, [copy, status]);
}

function setSignInStatus(root, message, { error = false } = {}) {
  const status = root.querySelector('.wpv-chat__signin-status');
  if (!status) return;
  const text = String(message || '').trim();
  status.hidden = !text;
  status.textContent = text;
  status.classList.toggle('wpv-chat__signin-status--error', Boolean(error && text));
}

function updateGreeting(root, rawUserName) {
  const text = root.querySelector('[data-greeting-text]');
  if (text) text.textContent = greetingText(rawUserName);
}

function sendSpinner() {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'wpv-chat__spinner');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('aria-hidden', 'true');

  const track = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  track.setAttribute('class', 'wpv-chat__spinner-track');
  track.setAttribute('cx', '12');
  track.setAttribute('cy', '12');
  track.setAttribute('r', '10');
  track.setAttribute('stroke', 'currentColor');
  track.setAttribute('stroke-width', '4');

  const head = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  head.setAttribute('class', 'wpv-chat__spinner-head');
  head.setAttribute('fill', 'currentColor');
  head.setAttribute('d', 'M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z');

  svg.append(track, head);
  return svg;
}

function robotAvatar() {
  const img = document.createElement('img');
  img.className = 'wpv-chat__avatar wpv-chat__avatar--robot';
  img.src = chrome.runtime.getURL('assets/robot.png');
  img.alt = 'Agent';
  img.width = 28;
  img.height = 28;
  return img;
}

function brandLogo() {
  const img = document.createElement('img');
  img.className = 'wpv-chat__logo';
  img.src = chrome.runtime.getURL('icons/icon-48.png');
  img.alt = '';
  img.width = 24;
  img.height = 24;
  return img;
}

function initialsFromName(name) {
  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return 'U';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function escapeXml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function userAvatarUrl(name) {
  const initials = escapeXml(initialsFromName(name));
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28"><circle cx="14" cy="14" r="14" fill="#0267c5"/><text x="14" y="15" text-anchor="middle" dominant-baseline="middle" fill="#fff" font-family="system-ui,sans-serif" font-size="11" font-weight="600">${initials}</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function userAvatar(name) {
  const img = document.createElement('img');
  img.className = 'wpv-chat__avatar';
  img.src = userAvatarUrl(name);
  img.alt = '';
  img.width = 28;
  img.height = 28;
  return img;
}

function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value === false || value == null) continue;
    if (value === true) {
      node.setAttribute(key, '');
      continue;
    }
    if (key === 'className') {
      node.className = value;
      continue;
    }
    if (key === 'text') {
      node.textContent = value;
      continue;
    }
    node.setAttribute(key, value);
  }
  for (const child of children) node.appendChild(child);
  return node;
}

function setOpen(root, open, { focus = true } = {}) {
  const collapse = root.querySelector('[data-action="collapse"]');
  const expand = root.querySelector('[data-action="expand"]');

  root.classList.toggle('wpv-chat--open', open);
  collapse.setAttribute('aria-expanded', String(open));
  expand.setAttribute('aria-expanded', String(open));

  if (!focus) return;
  const next = open ? collapse : expand;
  next.focus();
}

function installAutoScroll(messages) {
  const state = { autoStickBottom: true };
  const snap = () => {
    if (state.autoStickBottom) messages.scrollTop = messages.scrollHeight;
  };

  snap();
  new ResizeObserver(snap).observe(messages);
  messages.addEventListener('load', snap, true);
  messages.addEventListener('scroll', () => {
    const distance = messages.scrollHeight - messages.scrollTop - messages.clientHeight;
    state.autoStickBottom = distance < 50;
  });

  return {
    scrollToBottom() {
      state.autoStickBottom = true;
      snap();
    },
  };
}

function createReplySound() {
  try {
    const sound = new Audio(chrome.runtime.getURL('assets/chat-notification.mp3'));
    sound.volume = 0.3;
    return sound;
  } catch {
    return null;
  }
}

function playReplySound(sound) {
  if (!sound) return;
  sound.currentTime = 0;
  sound.play().catch(() => {});
}

function fallbackArticleSnapshot() {
  if (typeof detectArticleSnapshot === 'function') {
    return detectArticleSnapshot();
  }
  return {
    title: '',
    content: '',
    excerpt: '',
    seo_title: '',
    seo_description: '',
    og_title: '',
    og_description: '',
    focus_keyphrase: '',
    selection: { html: '', text: '', client_ids: [] },
    editor_type: '',
    post_id: '',
    post_type: '',
    url: location.href,
    method_steps: [],
    list_items: [],
  };
}

function callEditorBridge(type, extra = {}, timeoutMs = SNAPSHOT_TIMEOUT_MS) {
  return new Promise((resolve, reject) => {
    const requestId = crypto.randomUUID();
    const timer = setTimeout(() => {
      window.removeEventListener(EDITOR_RESULT_EVENT, onResult);
      reject(new Error('Editor bridge timed out.'));
    }, timeoutMs);

    function onResult(event) {
      if (event.detail?.requestId !== requestId) return;
      clearTimeout(timer);
      window.removeEventListener(EDITOR_RESULT_EVENT, onResult);
      resolve(event.detail);
    }

    window.addEventListener(EDITOR_RESULT_EVENT, onResult);
    window.dispatchEvent(new CustomEvent(EDITOR_COMMAND_EVENT, {
      detail: { requestId, type, ...extra },
    }));
  });
}

async function articleSnapshot() {
  const fallback = fallbackArticleSnapshot();
  try {
    const result = await callEditorBridge('snapshot', {}, SNAPSHOT_TIMEOUT_MS);
    if (!result?.ok || !result.snapshot || typeof result.snapshot !== 'object') {
      return fallback;
    }
    return {
      ...fallback,
      title: result.snapshot.title || fallback.title,
      content: result.snapshot.content || fallback.content,
      excerpt: result.snapshot.excerpt || fallback.excerpt,
      seo_title: result.snapshot.seo_title || fallback.seo_title,
      seo_description: result.snapshot.seo_description || fallback.seo_description,
      og_title: result.snapshot.og_title || fallback.og_title,
      og_description: result.snapshot.og_description || fallback.og_description,
      focus_keyphrase: result.snapshot.focus_keyphrase || fallback.focus_keyphrase,
      selection: result.snapshot.selection || fallback.selection,
      editor_type: result.snapshot.editor_type || fallback.editor_type,
      post_type: result.snapshot.post_type || fallback.post_type,
      method_steps: pickSnapshotRows(result.snapshot.method_steps, fallback.method_steps),
      list_items: pickSnapshotRows(result.snapshot.list_items, fallback.list_items),
    };
  } catch {
    return fallback;
  }
}

function pickSnapshotRows(primary, fallback) {
  if (Array.isArray(primary) && primary.length > 0) return primary;
  return Array.isArray(fallback) ? fallback : [];
}

function compactArticle(article) {
  const next = { ...article };
  if (!next.editor_type) delete next.editor_type;
  if (!next.focus_keyphrase) delete next.focus_keyphrase;
  if (next.selection) {
    const html = String(next.selection.html || '').trim();
    const text = String(next.selection.text || '').trim();
    if (!html && !text) delete next.selection;
    else next.selection = { html, text };
  }
  if (fieldsForPostType(next.post_type).includes('method_steps')) {
    next.method_steps = normaliseMethodSteps(next.method_steps);
  } else {
    delete next.method_steps;
  }
  if (fieldsForPostType(next.post_type).includes('list_items')) {
    next.list_items = normaliseListItems(next.list_items);
  } else {
    delete next.list_items;
  }
  return next;
}

function hasSelection(article) {
  const selection = article?.selection;
  if (!selection || typeof selection !== 'object') return false;
  return String(selection.html || '').trim() !== '' || String(selection.text || '').trim() !== '';
}

function checklistItems(article) {
  const title = String(article.title || '').trim();
  const excerpt = String(article.excerpt || '').trim();
  const seoTitle = String(article.seo_title || '').trim();
  const seoDescription = String(article.seo_description || '').trim();
  const ogTitle = String(article.og_title || '').trim();
  const ogDescription = String(article.og_description || '').trim();
  const keyphrase = String(article.focus_keyphrase || '').trim();
  const body = plainText(article.content);
  return [
    {
      id: 'title',
      label: 'Title',
      ok: title.length > 0,
      warn: title.length > 70,
      prompt: 'Write a stronger post title. Do not change the body.',
    },
    {
      id: 'excerpt',
      label: 'Excerpt',
      ok: excerpt.length > 0,
      prompt: 'Write a standfirst / excerpt from this draft. Do not change the title or body.',
    },
    {
      id: 'seo_title',
      label: 'SEO title',
      ok: seoTitle.length > 0,
      warn: seoTitle.length > 60,
      prompt: 'Write an SEO title of 60 characters or fewer. Do not change the post title or body.',
    },
    {
      id: 'seo_description',
      label: 'SEO description',
      ok: seoDescription.length > 0,
      warn: seoDescription.length > 155,
      prompt: 'Write an SEO meta description of 155 characters or fewer. Do not change the title or body.',
    },
    {
      id: 'og_title',
      label: 'OG title',
      ok: ogTitle.length > 0,
      warn: ogTitle.length > 70,
      prompt: 'Write an Open Graph title of 70 characters or fewer. Do not change the post title or body.',
    },
    {
      id: 'og_description',
      label: 'OG description',
      ok: ogDescription.length > 0,
      warn: ogDescription.length > 200,
      prompt: 'Write an Open Graph description of 200 characters or fewer. Do not change the title or body.',
    },
    {
      id: 'focus_keyphrase',
      label: 'Keyphrase',
      ok: keyphrase.length > 0,
      prompt: 'Set a focus keyphrase from this draft. Do not change the title or body.',
    },
    {
      id: 'body',
      label: 'Body',
      ok: body.length >= 200,
      prompt: 'Expand the draft with a stronger intro and more detail. Keep existing facts.',
    },
  ];
}

function hasEdits(edits) {
  if (!edits || typeof edits !== 'object') return false;
  if (Array.isArray(edits.method_steps) && edits.method_steps.length > 0) return true;
  if (Array.isArray(edits.list_items) && edits.list_items.length > 0) return true;
  return EDIT_KEYS.some((key) => (
    typeof edits[key] === 'string' && edits[key].trim() !== ''
  ));
}

function describeApplied(applied) {
  const labels = {
    title: 'title',
    body: 'body',
    selection: 'selected copy',
    excerpt: 'excerpt',
    seo_title: 'SEO title',
    seo_description: 'SEO description',
    og_title: 'Open Graph title',
    og_description: 'Open Graph description',
    focus_keyphrase: 'focus keyphrase',
    method_steps: 'method steps',
    list_items: 'list items',
  };
  const parts = (Array.isArray(applied) ? applied : [])
    .map((key) => labels[key])
    .filter(Boolean);
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0];
  if (parts.length === 2) return `${parts[0]} and ${parts[1]}`;
  return `${parts.slice(0, -1).join(', ')}, and ${parts[parts.length - 1]}`;
}

async function applyEditorEdits(edits, context = {}) {
  const payload = { ...edits };
  if (payload.selection && context.selection) {
    payload.selection_client_ids = context.selection.client_ids || [];
    payload.selection_original = context.selection.html || context.selection.text || '';
  }
  try {
    const result = await callEditorBridge('apply', { edits: payload }, APPLY_TIMEOUT_MS);
    const what = describeApplied(result?.applied);
    if (what) return applySuccessStatus(what);
    if (result?.ok) {
      return { status: 'No editor fields were changed.', statusError: false };
    }
  } catch {
    // Bridge timeout/error — the editor may still have accepted the writes.
  }
  const inferred = describeApplied(await inferAppliedFields(edits));
  if (inferred) return applySuccessStatus(inferred);
  return applyFailedStatus();
}

function applySuccessStatus(what) {
  return {
    status: `Updated ${what} in the editor.`,
    statusError: false,
  };
}

function applyFailedStatus() {
  return {
    status: 'Could not update the editor. Copy the suggested text in if you still want it.',
    statusError: true,
  };
}

/**
 * Put a field back to what it stood at before an accepted suggestion. An empty
 * previous value has to go through the bridge's opt-in `clear` list, because
 * normaliseEdits() drops empty strings on the way in.
 */
async function restoreEditorField(field, previous) {
  if (nonEmptyString(previous)) return applyEditorEdits({ [field]: previous });
  return applyEditorEdits({ clear: [field] });
}

async function inferAppliedFields(edits) {
  const article = await articleSnapshot();
  const applied = [];
  if (edits.title && sameText(article.title, edits.title)) applied.push('title');
  if (edits.excerpt && sameText(article.excerpt, edits.excerpt)) applied.push('excerpt');
  if (edits.seo_title && sameText(article.seo_title, edits.seo_title)) applied.push('seo_title');
  if (edits.seo_description && sameText(article.seo_description, edits.seo_description)) {
    applied.push('seo_description');
  }
  if (edits.og_title && sameText(article.og_title, edits.og_title)) applied.push('og_title');
  if (edits.og_description && sameText(article.og_description, edits.og_description)) {
    applied.push('og_description');
  }
  if (edits.focus_keyphrase && sameText(article.focus_keyphrase, edits.focus_keyphrase)) {
    applied.push('focus_keyphrase');
  }
  if (edits.selection && contentLooksApplied(article.content, edits.selection)) {
    applied.push('selection');
  }
  if (edits.content && contentLooksApplied(article.content, edits.content)) {
    applied.push('body');
  }
  if (Array.isArray(edits.method_steps) && edits.method_steps.length > 0
    && methodStepsLookApplied(article.method_steps, edits.method_steps)) {
    applied.push('method_steps');
  }
  if (Array.isArray(edits.list_items) && edits.list_items.length > 0
    && listItemsLookApplied(article.list_items, edits.list_items)) {
    applied.push('list_items');
  }
  return applied;
}

function methodStepsLookApplied(current, next) {
  const a = normaliseMethodSteps(current);
  const b = normaliseMethodSteps(next);
  if (a.length === 0 || b.length === 0) return false;
  if (a.length !== b.length) return false;
  return a.every((row, index) => row.kind === b[index].kind && row.text === b[index].text);
}

function listItemsLookApplied(current, next) {
  const a = typeof normaliseListItems === 'function' ? normaliseListItems(current) : [];
  const b = typeof normaliseListItems === 'function' ? normaliseListItems(next) : [];
  if (a.length === 0 || b.length === 0) return false;
  if (a.length !== b.length) return false;
  return a.every((row, index) => row.kind === b[index].kind && row.text === b[index].text);
}

function sameText(a, b) {
  return String(a || '').trim() === String(b || '').trim();
}

function contentLooksApplied(current, next) {
  const a = plainText(current);
  const b = plainText(next);
  if (a.length < 20 || b.length < 20) return a !== '' && a === b;
  return a.includes(b.slice(0, 80)) || b.includes(a.slice(0, 80));
}

function plainText(html) {
  return String(html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function syncAriaInvalid(input) {
  if (!input.checkValidity()) {
    input.setAttribute('aria-invalid', 'true');
  } else {
    input.removeAttribute('aria-invalid');
  }
}

function thinkingRow() {
  return el('li', {
    className: 'wpv-chat__row wpv-chat__row--thinking',
    'data-thinking': '',
    'aria-hidden': 'true',
  }, [
    robotAvatar(),
    el('div', { className: 'wpv-chat__line-loader' }),
  ]);
}

function setThinking(messages, scroller, on) {
  const existing = messages.querySelector('[data-thinking]');
  if (on) {
    if (!existing) messages.appendChild(thinkingRow());
    scroller.scrollToBottom();
    return;
  }
  existing?.remove();
}

function appendMessage(messages, scroller, {
  role,
  text,
  userName = DEFAULT_USER_NAME,
  error = false,
  status = '',
  statusError = false,
}) {
  const isUser = role === 'user';
  const className = error
    ? 'wpv-chat__row wpv-chat__row--error'
    : isUser
      ? 'wpv-chat__row wpv-chat__row--user'
      : 'wpv-chat__row';
  const bubble = el('div', { className: 'wpv-chat__bubble' }, [el('p', { text })]);
  if (status) {
    bubble.appendChild(el('p', {
      className: statusError ? 'wpv-chat__status wpv-chat__status--error' : 'wpv-chat__status',
      text: status,
    }));
  }
  messages.appendChild(el('li', { className }, [
    isUser ? userAvatar(userName) : robotAvatar(),
    bubble,
  ]));
  scroller.scrollToBottom();
  return bubble;
}

function nonEmptyString(value) {
  return typeof value === 'string' && value.trim() !== '';
}

/** http(s) only, and tolerant of the scheme-less URLs the agent tends to return. */
function safeLinkHref(url) {
  const raw = String(url || '').trim();
  if (!raw) return '';
  const candidate = /^https?:\/\//i.test(raw) ? raw : `https://${raw.replace(/^\/+/, '')}`;
  try {
    const parsed = new URL(candidate);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? parsed.href : '';
  } catch {
    return '';
  }
}

function normaliseSuggestion(raw, index) {
  if (!raw || typeof raw !== 'object') return null;

  if (raw.kind === 'internal_link') {
    const anchor = String(raw.anchor || '').trim();
    const href = safeLinkHref(raw.url);
    if (!anchor || !href) return null;
    return {
      id: nonEmptyString(raw.id) ? String(raw.id) : `link-${index}`,
      kind: 'internal_link',
      label: 'Suggested internal link',
      anchor,
      href,
      target: String(raw.target || '').trim(),
      status: 'pending',
      note: '',
      noteError: false,
    };
  }

  const field = CARD_FIELDS.includes(raw.field) ? raw.field : '';
  const value = String(raw.value ?? '').trim();
  if (!field || !value) return null;
  return {
    id: nonEmptyString(raw.id) ? String(raw.id) : `field-${field}-${index}`,
    kind: 'field',
    field,
    label: nonEmptyString(raw.label) ? String(raw.label).trim() : FIELD_LABELS[field],
    value,
    status: 'pending',
    note: '',
    noteError: false,
  };
}

/**
 * Several cards can propose the same field — five headline alternatives, say.
 * Left alone they would give every Accept button the same accessible name, so
 * number them once it is known how many there are.
 */
function numberRepeatedLabels(suggestions) {
  const totals = new Map();
  for (const item of suggestions) {
    if (item.kind !== 'field') continue;
    totals.set(item.label, (totals.get(item.label) || 0) + 1);
  }
  const seen = new Map();
  for (const item of suggestions) {
    if (item.kind !== 'field' || (totals.get(item.label) || 0) < 2) continue;
    const position = (seen.get(item.label) || 0) + 1;
    seen.set(item.label, position);
    item.label = `${item.label} ${position}`;
  }
}

/**
 * One shape for the card renderer, whether the reply carried an explicit
 * `suggestions` array (what Content Studio should send) or only today's
 * `edits` / `title_variants`.
 *
 * Field edits become pending cards rather than being written straight into the
 * draft. Body and selection rewrites cannot be reviewed field by field, so they
 * stay on the pre-card path and are returned as `direct`.
 */
function normaliseReply(result) {
  const edits = result?.edits && typeof result.edits === 'object' && !Array.isArray(result.edits)
    ? result.edits
    : {};
  const suggestions = [];

  if (Array.isArray(result?.suggestions)) {
    result.suggestions.forEach((raw, index) => {
      const suggestion = normaliseSuggestion(raw, index);
      if (suggestion) suggestions.push(suggestion);
    });
  }

  const covered = new Set(suggestions.map((item) => item.field).filter(Boolean));

  // A headline reply is a list of alternatives. Each one becomes its own card
  // so it gets the same Accept / Regenerate / Reject treatment as every other
  // suggestion, rather than a pick-one row that behaves differently.
  const variants = (Array.isArray(result?.title_variants) ? result.title_variants : [])
    .filter(nonEmptyString)
    .map((title) => title.trim())
    .slice(0, 8);
  if (variants.length > 0 && !covered.has('title')) {
    variants.forEach((value, index) => {
      suggestions.push({
        id: `title-${index}`,
        kind: 'field',
        field: 'title',
        label: FIELD_LABELS.title,
        value,
        status: 'pending',
        note: '',
        noteError: false,
      });
    });
    covered.add('title');
  }

  for (const field of CARD_FIELDS) {
    if (covered.has(field) || !nonEmptyString(edits[field])) continue;
    suggestions.push({
      id: `edit-${field}`,
      kind: 'field',
      field,
      label: FIELD_LABELS[field],
      value: edits[field].trim(),
      status: 'pending',
      note: '',
      noteError: false,
    });
  }

  const direct = {};
  for (const key of ['content', 'selection']) {
    if (nonEmptyString(edits[key])) direct[key] = edits[key];
  }
  const methodSteps = normaliseMethodSteps(edits.method_steps);
  if (methodSteps.length > 0) direct.method_steps = methodSteps;
  const listItems = typeof normaliseListItems === 'function' ? normaliseListItems(edits.list_items) : [];
  if (listItems.length > 0) direct.list_items = listItems;

  numberRepeatedLabels(suggestions);
  return { suggestions, direct };
}

/** Places a link must never be inserted into, whatever the anchor matches. */
const LINK_EXCLUDED_ANCESTORS = 'a, h1, h2, h3, h4, h5, h6, figcaption, blockquote, code, pre';

/**
 * Wrap the first occurrence of `anchor` in body prose. Returns null when the
 * anchor text is not there, is already inside a link, or only appears somewhere
 * a link does not belong — a heading, a caption, a pull quote.
 */
function findLinkableText(html, anchor) {
  const needle = String(anchor || '').trim();
  if (!needle) return null;

  const doc = new DOMParser().parseFromString(`<body>${String(html || '')}</body>`, 'text/html');
  const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (node.parentElement?.closest(LINK_EXCLUDED_ANCESTORS)) continue;
    const index = node.data.indexOf(needle);
    if (index >= 0) return { doc, node, index, needle };
  }
  return null;
}

function insertLinkIntoBody(html, anchor, href) {
  if (!href) return null;
  const found = findLinkableText(html, anchor);
  if (!found) return null;

  const match = found.node.splitText(found.index);
  match.splitText(found.needle.length);
  const link = found.doc.createElement('a');
  link.setAttribute('href', href);
  link.textContent = found.needle;
  match.replaceWith(link);
  return found.doc.body.innerHTML;
}

function articleLinksApplyToMethodSteps(article) {
  return typeof linksApplyToMethodSteps === 'function'
    && linksApplyToMethodSteps(article?.post_type);
}

function articleLinksApplyToListItems(article) {
  return typeof linksApplyToListItems === 'function'
    && linksApplyToListItems(article?.post_type);
}

function cloneMethodSteps(steps) {
  const normalise = typeof normaliseMethodSteps === 'function' ? normaliseMethodSteps : () => [];
  return normalise(steps).map((row) => ({ kind: row.kind, text: row.text }));
}

function insertLinkIntoMethodSteps(steps, anchor, href) {
  const next = cloneMethodSteps(steps);
  for (const row of next) {
    if (row.kind !== 'step') continue;
    const linked = insertLinkIntoBody(row.text, anchor, href);
    if (linked === null) continue;
    row.text = linked;
    return next;
  }
  return null;
}

function cloneListItems(items) {
  const normalise = typeof normaliseListItems === 'function' ? normaliseListItems : () => [];
  return normalise(items).map((row) => ({ kind: row.kind, text: row.text }));
}

function insertLinkIntoListItems(items, anchor, href) {
  const next = cloneListItems(items);
  for (const row of next) {
    const linked = insertLinkIntoBody(row.text, anchor, href);
    if (linked === null) continue;
    row.text = linked;
    return next;
  }
  return null;
}

function findLinkableInArticle(article, anchor) {
  if (articleLinksApplyToMethodSteps(article)) {
    const texts = typeof methodStepLinkTexts === 'function'
      ? methodStepLinkTexts(article.method_steps)
      : [];
    return texts.some((text) => findLinkableText(text, anchor));
  }
  if (articleLinksApplyToListItems(article)) {
    const texts = typeof listItemLinkTexts === 'function'
      ? listItemLinkTexts(article.list_items)
      : [];
    return texts.some((text) => findLinkableText(text, anchor));
  }
  return !!findLinkableText(article?.content, anchor);
}

function linkTargetLabel(article) {
  if (articleLinksApplyToMethodSteps(article)) return 'method steps';
  if (articleLinksApplyToListItems(article)) return 'list items';
  return 'body';
}

function applyInternalLink(article, suggestion) {
  if (articleLinksApplyToMethodSteps(article)) {
    const linked = insertLinkIntoMethodSteps(article.method_steps, suggestion.anchor, suggestion.href);
    if (!linked) return null;
    return {
      previous: { method_steps: cloneMethodSteps(article.method_steps) },
      edits: { method_steps: linked },
    };
  }

  if (articleLinksApplyToListItems(article)) {
    const linked = insertLinkIntoListItems(article.list_items, suggestion.anchor, suggestion.href);
    if (!linked) return null;
    return {
      previous: { list_items: cloneListItems(article.list_items) },
      edits: { list_items: linked },
    };
  }

  const body = String(article.content || '');
  const linked = insertLinkIntoBody(body, suggestion.anchor, suggestion.href);
  if (!linked) return null;
  return {
    previous: { content: body },
    edits: { content: linked },
  };
}

/**
 * Interim: read link suggestions out of a prose reply.
 *
 * The action asks the agent not to touch the body, so it answers with a bullet
 * list rather than a body rewrite, and Content Studio does not send the
 * `suggestions` array yet (see docs/plugin-chat-api.md). Until it does, pull the
 * anchors and URLs out of the text so the cards work. Delete this once the API
 * returns `suggestions` — `normaliseReply()` already prefers that.
 *
 * A line has to be a bullet carrying an http(s) URL and at least one quoted
 * anchor; anything else is left in the reply untouched.
 */
function parseLinkSuggestionsFromReply(reply, article) {
  const lines = String(reply || '').split('\n');
  const suggestions = [];
  const kept = [];

  lines.forEach((line, index) => {
    const bullet = line.match(/^\s*(?:[-*\u2022\u00b7\u2013\u2014]|\d+[.)])\s+(.*)$/);
    const url = bullet && bullet[1].match(/(https?:\/\/[^\s)<>"'`]+)/);
    if (!bullet || !url) {
      kept.push(line);
      return;
    }

    const before = bullet[1].slice(0, url.index);
    const after = bullet[1].slice(url.index + url[0].length);
    const anchors = [...before.matchAll(/["\u201c]([^"\u201c\u201d]{2,160})["\u201d]/g)]
      .map((match) => match[1].trim())
      .filter(Boolean);
    const href = safeLinkHref(url[0].replace(/[.,;:]+$/, ''));
    if (anchors.length === 0 || !href) {
      kept.push(line);
      return;
    }

    // The agent often offers alternatives ("a" / "b"); take one that is really
    // in the draft so the card does not fail the moment it is accepted.
    const haystack = typeof article === 'object' && article !== null
      ? article
      : { content: article };
    const anchor = anchors.find((candidate) => findLinkableInArticle(haystack, candidate)) || anchors[0];
    const target = (after.match(/\(([^)]{3,200})\)/) || [])[1] || '';

    suggestions.push({
      id: `parsed-${index}`,
      kind: 'internal_link',
      label: 'Suggested internal link',
      anchor,
      href,
      target: target.trim(),
      status: 'pending',
      note: '',
      noteError: false,
    });
  });

  return {
    suggestions,
    reply: kept.join('\n').replace(/\n{3,}/g, '\n\n').trim(),
  };
}

/**
 * Headline regenerate (and a first Headline click whose `title_variants` were
 * empty) often answers with a numbered list in `reply`. Read those lines into
 * title cards so Accept / Regenerate have a value to swap. Structured
 * `title_variants` already become cards in `normaliseReply()`; this is only
 * the prose fallback.
 */
function parseHeadlineVariantsFromReply(reply) {
  const lines = String(reply || '').split('\n');
  const suggestions = [];
  const kept = [];

  lines.forEach((line, index) => {
    const bullet = line.match(/^\s*(?:[-*\u2022\u00b7\u2013\u2014]|\d+[.)])\s+(.+)$/);
    const title = bullet ? bullet[1].trim().replace(/^["\u201c]|["\u201d]$/g, '') : '';
    if (!bullet || title.length < 8 || /^(let me know|would you like|if you want)\b/i.test(title)) {
      kept.push(line);
      return;
    }

    suggestions.push({
      id: `parsed-title-${index}`,
      kind: 'field',
      field: 'title',
      label: FIELD_LABELS.title,
      value: title,
      status: 'pending',
      note: '',
      noteError: false,
    });
  });

  return {
    suggestions: suggestions.slice(0, 8),
    reply: kept.join('\n').replace(/\n{3,}/g, '\n\n').trim(),
  };
}

function cardButton(label, fieldLabel, { className = '', icon = '' } = {}) {
  const children = [];
  if (icon) children.push(strokeIcon(icon, 'wpv-chat__card-button-icon'));
  children.push(el('span', { text: label }));
  // Visually hidden context so a screen reader hears "Accept SEO title" rather
  // than one of several identical "Accept" buttons.
  children.push(el('span', {
    className: 'wpv-chat__visually-hidden',
    text: ` ${fieldLabel}`,
  }));
  return el('button', {
    type: 'button',
    className: className ? `wpv-chat__card-button ${className}` : 'wpv-chat__card-button',
  }, children);
}

function cardStateLine(text, { tone = '', undoLabel = '', fieldLabel = '', onUndo = null, busy = false } = {}) {
  const line = el('p', {
    className: tone ? `wpv-chat__card-state wpv-chat__card-state--${tone}` : 'wpv-chat__card-state',
    ...(busy ? { 'aria-busy': 'true', role: 'status' } : {}),
  });
  if (busy) line.appendChild(sendSpinner());
  if (tone === 'added') line.appendChild(strokeIcon('check', 'wpv-chat__card-button-icon'));
  line.appendChild(el('span', { text }));
  if (undoLabel && onUndo) {
    const undo = el('button', {
      type: 'button',
      className: 'wpv-chat__undo',
    }, [
      el('span', { text: undoLabel }),
      el('span', { className: 'wpv-chat__visually-hidden', text: ` ${fieldLabel}` }),
    ]);
    undo.addEventListener('click', onUndo);
    line.appendChild(undo);
  }
  return line;
}

/** A single reviewable suggestion. Re-renders itself in place on state change. */
function suggestionCard(suggestion, handlers, group = null) {
  const card = el('div', { className: 'wpv-chat__card' });
  const isLink = suggestion.kind === 'internal_link';
  const fieldLabel = isLink ? `internal link to ${suggestion.target || suggestion.href}` : suggestion.label;

  function render() {
    card.className = suggestion.status === 'pending'
      ? 'wpv-chat__card'
      : `wpv-chat__card wpv-chat__card--${suggestion.status}`;

    const children = [
      el('p', { className: 'wpv-chat__card-label' }, [
        strokeIcon(isLink ? 'link' : FIELD_ICONS[suggestion.field] || 'sparkles', 'wpv-chat__card-label-icon'),
        el('span', { text: suggestion.label }),
      ]),
    ];

    if (isLink) {
      const value = el('p', { className: 'wpv-chat__card-value' });
      value.append(`"${suggestion.anchor}" → `);
      value.appendChild(el('strong', { text: suggestion.target || suggestion.href }));
      children.push(value, el('p', { className: 'wpv-chat__card-meta', text: suggestion.href }));
    } else {
      children.push(el('p', { className: 'wpv-chat__card-value', text: suggestion.value }));
    }

    if (suggestion.regenerating) {
      children.push(cardStateLine(REGENERATING_NOTE, { busy: true }));
    } else if (suggestion.note) {
      children.push(cardStateLine(suggestion.note, { tone: suggestion.noteError ? 'error' : '' }));
    }

    if (suggestion.status === 'pending') {
      const actions = el('div', { className: 'wpv-chat__card-actions' });
      const accept = cardButton('Accept', fieldLabel, { className: 'wpv-chat__card-button--accept' });
      accept.addEventListener('click', () => handlers.onAccept(suggestion, view));
      actions.appendChild(accept);
      if (!isLink && REGENERATE_PROMPTS[suggestion.field]) {
        const regenerate = cardButton('Regenerate', fieldLabel, { icon: 'refresh' });
        regenerate.addEventListener('click', () => handlers.onRegenerate(suggestion, view));
        actions.appendChild(regenerate);
      }
      const reject = cardButton('Reject', fieldLabel);
      reject.addEventListener('click', () => handlers.onReject(suggestion, view));
      actions.appendChild(reject);
      children.push(actions);
    } else if (suggestion.status === 'accepted') {
      children.push(cardStateLine(isLink ? 'Added to the article' : 'Added', {
        tone: 'added',
        undoLabel: 'Undo',
        fieldLabel,
        onUndo: () => handlers.onUndo(suggestion, view),
      }));
    } else {
      children.push(cardStateLine('Dismissed', {
        undoLabel: 'Reconsider',
        fieldLabel,
        onUndo: () => handlers.onReconsider(suggestion, view),
      }));
    }

    card.replaceChildren(...children);
    handlers.onRendered?.();
  }

  const view = { card, render, suggestion, group };
  render();
  return view;
}

/**
 * The other cards in this reply proposing a value for the same field. A field
 * holds one value, so only one of them can be the accepted card.
 */
function fieldSiblings(view) {
  const { field } = view.suggestion;
  if (!field) return [];
  return (view.group?.views || []).filter((item) => item !== view && item.suggestion.field === field);
}

function renderSuggestions(messages, model, handlers) {
  const group = { views: [] };
  const row = el('li', { className: 'wpv-chat__suggestions' });
  const cards = el('div', {
    className: 'wpv-chat__cards',
    role: 'group',
    'aria-label': 'Suggestions',
  });

  for (const suggestion of model.suggestions) {
    const view = suggestionCard(suggestion, handlers, group);
    cards.appendChild(view.card);
    group.views.push(view);
  }

  row.appendChild(cards);
  messages.appendChild(row);
  return group.views;
}

function setComposerEnabled(root, {
  signedIn,
  busy,
  signingIn = false,
  activeAction = null,
}) {
  const input = root.querySelector(`#${INPUT_ID}`);
  const send = root.querySelector('.wpv-chat__send');
  const label = root.querySelector('.wpv-chat__send-label');
  const spinner = root.querySelector('.wpv-chat__send-spinner');
  const form = root.querySelector('.wpv-chat__form');
  const tools = root.querySelector('.wpv-chat__composer-tools');
  const idleHint = root.querySelector('.wpv-chat__idle-hint');
  const signin = root.querySelector('.wpv-chat__signin');
  const signInLink = root.querySelector('.wpv-chat__signin-link');
  const messages = root.querySelector('.wpv-chat__messages');
  const checklist = root.querySelector('.wpv-chat__checklist');
  const disabled = !signedIn || busy;

  root.classList.toggle('wpv-chat--signed-in', signedIn);
  // The composer and checklist are absent while their flags are off, so every
  // node here is optional.
  if (form) form.hidden = !signedIn;
  if (tools) tools.hidden = !signedIn;
  if (idleHint) idleHint.hidden = !signedIn || Boolean(activeAction);
  if (messages) messages.hidden = !signedIn;
  if (checklist) checklist.hidden = !signedIn;
  if (signin) {
    signin.hidden = signedIn;
    signin.setAttribute('aria-busy', signingIn ? 'true' : 'false');
  }
  if (signInLink) signInLink.disabled = signingIn;
  if (signedIn) setSignInStatus(root, '');

  if (input) {
    input.disabled = disabled;
    input.required = signedIn && !busy;
    input.placeholder = SIGNED_IN_PLACEHOLDER;
    if (disabled) input.removeAttribute('aria-invalid');
  }
  if (send) send.disabled = disabled;
  if (form) form.setAttribute('aria-busy', busy ? 'true' : 'false');
  if (label) label.hidden = busy;
  if (spinner) spinner.hidden = !busy;

  for (const action of root.querySelectorAll('.wpv-chat__action:not([aria-disabled="true"])')) {
    action.disabled = disabled;
    action.setAttribute('aria-pressed', String(action.dataset.actionId === activeAction));
  }
  // Cards re-render themselves, so re-sync their controls every refresh.
  for (const control of root.querySelectorAll('.wpv-chat__card-button, .wpv-chat__undo')) {
    control.disabled = disabled;
  }
}

function renderChecklist(root, article, { signedIn, busy, onFix }) {
  const count = root.querySelector('.wpv-chat__checklist-count');
  const list = root.querySelector('.wpv-chat__checklist-items');
  if (!count || !list) return;

  const items = checklistItems(article);
  const gaps = items.filter((item) => !item.ok || item.warn).length;
  count.textContent = gaps === 0 ? 'Ready' : `${gaps} to fix`;
  list.replaceChildren(...items.map((item) => {
    const tone = !item.ok ? 'gap' : item.warn ? 'warn' : 'ok';
    const needsFix = !item.ok || item.warn;
    const button = el('button', {
      type: 'button',
      className: 'wpv-chat__check',
      disabled: !signedIn || busy || !needsFix,
    }, [
      el('span', {
        className: tone === 'ok' ? 'wpv-chat__dot' : `wpv-chat__dot wpv-chat__dot--${tone}`,
        'aria-hidden': 'true',
      }),
      el('span', { text: item.label }),
    ]);
    if (needsFix) {
      button.addEventListener('click', () => onFix(item.prompt));
    }
    return el('li', {}, [button]);
  }));
}
function updateSelectionHint(root, article) {
  const hint = root.querySelector('.wpv-chat__hint');
  if (!hint) return;
  hint.hidden = !hasSelection(article);
}

function displayName(value) {
  return typeof value === 'string' && value.trim() !== ''
    ? value.trim()
    : DEFAULT_USER_NAME;
}

function rawUserName(value) {
  return typeof value === 'string' ? value.trim() : '';
}

async function readAuthState() {
  const { apiToken, apiUserName } = await chrome.storage.local.get(AUTH_KEYS);
  return {
    signedIn: typeof apiToken === 'string' && apiToken.length > 0,
    userName: displayName(apiUserName),
    rawUserName: rawUserName(apiUserName),
  };
}

function bindComposer(root, initialAuth = {}) {
  const form = root.querySelector('.wpv-chat__form');
  const input = root.querySelector(`#${INPUT_ID}`);
  const messages = root.querySelector('.wpv-chat__messages');
  const scroller = installAutoScroll(messages);
  const replySound = createReplySound();
  const transcript = [];
  const state = {
    signedIn: false,
    busy: false,
    signingIn: false,
    userName: DEFAULT_USER_NAME,
    rawUserName: '',
    lastArticle: null,
    activeAction: null,
    ...initialAuth,
  };

  const refreshComposer = () => {
    setComposerEnabled(root, state);
    setFootersToolbar({
      busy: state.busy || state.signingIn,
      onClick: handleFootersClick,
    });
  };
  refreshComposer();

  async function startSignIn() {
    if (state.signedIn || state.signingIn) return;

    state.signingIn = true;
    setSignInStatus(root, 'Opening the sign-in window…');
    refreshComposer();

    let result;
    try {
      result = await chrome.runtime.sendMessage({ type: 'PLUGIN_LOGIN' });
    } catch (err) {
      result = { ok: false, error: err.message || 'Login failed.' };
    }

    state.signingIn = false;
    Object.assign(state, await readAuthState());
    if (!result?.ok && !state.signedIn) {
      setSignInStatus(root, result?.error || 'Login failed.', { error: true });
    }
    refreshComposer();
    if (state.signedIn) input?.focus();
  }

  async function handleFootersClick() {
    setOpen(root, true, { focus: false });
    if (!state.signedIn) {
      await startSignIn();
      return;
    }
    await sendUserMessage(ADD_FOOTERS_PROMPT, { actionId: 'footers' });
  }

  async function refreshEditorChrome() {
    const article = await articleSnapshot();
    state.lastArticle = article;
    renderChecklist(root, article, {
      signedIn: state.signedIn,
      busy: state.busy,
      onFix: (prompt) => sendUserMessage(prompt),
    });
    updateSelectionHint(root, article);
  }

  async function applyReturnedEdits(edits, article) {
    const applied = await applyEditorEdits(edits, { selection: article?.selection });
    await refreshEditorChrome();
    return applied;
  }

  /** Run one editor write with the panel held busy so nothing double-fires. */
  async function withBusy(work) {
    if (state.busy) return;
    state.busy = true;
    refreshComposer();
    try {
      await work();
      await refreshEditorChrome();
    } finally {
      state.busy = false;
      refreshComposer();
    }
  }

  const suggestionHandlers = {
    // Cards rebuild their own controls, so re-sync enabled state after a render.
    onRendered: () => setComposerEnabled(root, state),

    onAccept(suggestion, view) {
      return withBusy(async () => {
        const article = await articleSnapshot();
        state.lastArticle = article;

        // A field holds one value, so accepting a second headline replaces the
        // first rather than adding to it.
        const replaced = fieldSiblings(view).find((item) => item.suggestion.status === 'accepted');

        let applied;
        if (suggestion.kind === 'internal_link') {
          const linked = applyInternalLink(article, suggestion);
          if (!linked) {
            suggestion.note = `Could not find "${suggestion.anchor}" in the ${linkTargetLabel(article)} to link.`;
            suggestion.noteError = true;
            view.render();
            return;
          }
          suggestion.previous = linked.previous;
          applied = await applyEditorEdits(linked.edits);
        } else {
          // Undo goes back to what the draft held before any of these cards were
          // accepted, not to the card this one is replacing.
          suggestion.previous = replaced
            ? replaced.suggestion.previous
            : String(article[suggestion.field] || '');
          applied = await applyEditorEdits({ [suggestion.field]: suggestion.value });
        }

        if (applied.statusError) {
          suggestion.note = applied.status;
          suggestion.noteError = true;
        } else {
          suggestion.status = 'accepted';
          suggestion.note = '';
          suggestion.noteError = false;
          if (replaced) {
            replaced.suggestion.status = 'pending';
            replaced.suggestion.note = '';
            replaced.suggestion.noteError = false;
            replaced.render();
          }
        }
        view.render();
      });
    },

    onReject(suggestion, view) {
      suggestion.status = 'rejected';
      suggestion.note = '';
      suggestion.noteError = false;
      view.render();
    },

    onReconsider(suggestion, view) {
      suggestion.status = 'pending';
      suggestion.note = '';
      suggestion.noteError = false;
      view.render();
    },

    onUndo(suggestion, view) {
      return withBusy(async () => {
        const applied = suggestion.kind === 'internal_link'
          ? await applyEditorEdits(
            suggestion.previous && typeof suggestion.previous === 'object'
              ? suggestion.previous
              : { content: suggestion.previous },
          )
          : await restoreEditorField(suggestion.field, suggestion.previous);

        if (applied.statusError) {
          suggestion.note = 'Could not restore the previous value.';
          suggestion.noteError = true;
        } else {
          suggestion.status = 'pending';
          suggestion.note = '';
          suggestion.noteError = false;
        }
        view.render();
      });
    },

    async onRegenerate(suggestion, view) {
      const prompt = REGENERATE_PROMPTS[suggestion.field];
      if (!prompt || state.busy) return;

      // The request is quiet — no bubble either way — so the card itself has to
      // carry the feedback, or a regenerate looks like nothing happened.
      suggestion.regenerating = true;
      suggestion.note = '';
      suggestion.noteError = false;
      view.render();

      let swapped = false;
      await sendUserMessage(prompt, {
        actionId: state.activeAction,
        quiet: true,
        absorb: (model) => {
          const replacement = model.suggestions.find((item) => item.field === suggestion.field);
          if (!replacement || !nonEmptyString(replacement.value)) return false;
          suggestion.value = replacement.value;
          suggestion.status = 'pending';
          suggestion.regenerating = false;
          suggestion.note = REGENERATED_NOTE;
          suggestion.noteError = false;
          swapped = true;
          view.render();
          return true;
        },
      });

      // The reply did not carry this field — it answered in prose, answered
      // about something else, failed, or never arrived. Whatever it was, the
      // card must not sit there unchanged and unexplained.
      if (!swapped) {
        suggestion.regenerating = false;
        suggestion.note = REGENERATE_FAILED_NOTE;
        suggestion.noteError = true;
        view.render();
      }
    },
  };

  async function runAction(action) {
    if (state.busy || !state.signedIn) return;
    if (action.status !== 'ready' || !action.prompt) return;
    state.activeAction = action.id;
    refreshComposer();
    await sendUserMessage(action.prompt, { actionId: action.id });
  }

  async function sendUserMessage(text, { actionId = null, quiet = false, absorb = null } = {}) {
    if (state.busy || !state.signedIn) return;
    const message = String(text || '').trim();
    if (!message) return;

    state.activeAction = actionId;
    if (input) {
      input.value = '';
      input.removeAttribute('aria-invalid');
    }
    const history = transcript.slice(-MAX_HISTORY);
    transcript.push({ role: 'user', content: message });
    if (!quiet) {
      appendMessage(messages, scroller, {
        role: 'user',
        text: message,
        userName: state.userName,
      });
    }

    state.busy = true;
    refreshComposer();
    setThinking(messages, scroller, true);

    const article = await articleSnapshot();
    state.lastArticle = article;

    let result;
    try {
      const accepted = await chrome.runtime.sendMessage({
        type: 'PLUGIN_CHAT',
        message,
        history,
        article: compactArticle(article),
        ...(state.activeAction ? { action: state.activeAction } : {}),
      });

      if (!accepted?.ok) {
        result = accepted || { ok: false, error: 'Chat failed.' };
      } else if (accepted.accepted && accepted.request_id) {
        result = await waitForPluginChatResult(accepted.request_id);
      } else if (typeof accepted.reply === 'string') {
        result = accepted;
      } else {
        result = { ok: false, error: 'Chat failed.' };
      }
    } catch (err) {
      result = { ok: false, error: err.message || 'Chat failed.' };
    }

    setThinking(messages, scroller, false);

    if (result?.ok && typeof result.reply === 'string') {
      transcript.push({ role: 'assistant', content: result.reply });
      const model = normaliseReply(result);
      let replyText = result.reply;

      // Interim, until Content Studio sends `suggestions`: the internal-links
      // action gets its links back as prose, so read them out of the text. Only
      // when the reply carried no structured suggestions and no body or method
      // rewrite of its own, so it can never fight either.
      if (
        state.activeAction === 'internal_links'
        && model.suggestions.length === 0
        && !model.direct.content
        && !model.direct.method_steps
        && !model.direct.list_items
      ) {
        const parsed = parseLinkSuggestionsFromReply(replyText, article);
        if (parsed.suggestions.length > 0) {
          model.suggestions = parsed.suggestions;
          replyText = parsed.reply || 'Here are internal links that could fit this draft.';
        }
      }

      // Headline regenerate often answers with a numbered list in `reply` and
      // an empty `title_variants` array. Pull those lines into title cards so
      // quiet absorb has a field to swap. Skip when structured variants
      // already produced a title card.
      if (
        state.activeAction === 'headline'
        && !model.suggestions.some((item) => item.field === 'title')
      ) {
        const parsed = parseHeadlineVariantsFromReply(replyText);
        if (parsed.suggestions.length > 0) {
          model.suggestions.push(...parsed.suggestions);
          numberRepeatedLabels(model.suggestions);
          replyText = parsed.reply || 'Here are some headline options.';
        }
      }

      const hasCards = model.suggestions.length > 0;

      // A regenerate swaps the value inside the existing card instead of
      // stacking another bubble on the transcript.
      if (hasCards && absorb?.(model)) {
        state.busy = false;
        Object.assign(state, await readAuthState());
        refreshComposer();
        await refreshEditorChrome();
        return;
      }

      // Body and selection rewrites cannot be reviewed field by field, so they
      // still go straight into the draft.
      let status = '';
      let statusError = false;
      if (hasEdits(model.direct)) {
        const applied = await applyReturnedEdits(model.direct, article);
        status = applied.status;
        statusError = applied.statusError;
      }

      // An empty reply used to append an empty bubble, which looks identical
      // to the assistant never answering. Say something instead — unless the
      // cards or the applied status are themselves the answer.
      const bubbleText = nonEmptyString(replyText)
        ? replyText
        : (hasCards || status ? '' : EMPTY_REPLY_TEXT);
      if (nonEmptyString(bubbleText) || status) {
        appendMessage(messages, scroller, {
          role: 'assistant',
          text: bubbleText,
          status,
          statusError,
          error: bubbleText === EMPTY_REPLY_TEXT,
        });
      }
      if (hasCards) {
        renderSuggestions(messages, model, suggestionHandlers);
        scroller.scrollToBottom();
      }
      playReplySound(replySound);
    } else {
      appendMessage(messages, scroller, {
        role: 'assistant',
        text: result?.error || 'Chat failed.',
        error: true,
      });
      playReplySound(replySound);
    }

    state.busy = false;
    Object.assign(state, await readAuthState());
    refreshComposer();
    await refreshEditorChrome();
    if (state.signedIn) input?.focus();
  }

  if (input) {
    input.addEventListener('blur', () => {
      if (!input.disabled) syncAriaInvalid(input);
    });
    input.addEventListener('input', () => {
      if (input.getAttribute('aria-invalid') === 'true') syncAriaInvalid(input);
    });
  }

  form?.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (state.busy || !state.signedIn || !input) return;

    const text = input.value.trim();
    if (!text) return;

    await sendUserMessage(text);
  });

  for (const button of root.querySelectorAll('[data-action-id]')) {
    const action = ACTIONS.find((item) => item.id === button.dataset.actionId);
    if (!action) continue;
    button.addEventListener('click', (event) => {
      // Coming-soon buttons stay focusable, so the click has to be refused here.
      if (button.getAttribute('aria-disabled') === 'true') {
        event.preventDefault();
        return;
      }
      runAction(action);
    });
  }

  root.querySelector('.wpv-chat__signin-link')?.addEventListener('click', async () => {
    await startSignIn();
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;
    const wasSignedIn = state.signedIn;
    if (changes.apiToken) {
      state.signedIn = typeof changes.apiToken.newValue === 'string'
        && changes.apiToken.newValue.length > 0;
    }
    if (changes.apiUserName) {
      state.userName = displayName(changes.apiUserName.newValue);
      state.rawUserName = rawUserName(changes.apiUserName.newValue);
      updateGreeting(root, state.rawUserName);
    }
    if (changes.apiToken || changes.apiUserName) {
      if (state.signedIn) state.signingIn = false;
      refreshComposer();
      if (!wasSignedIn && state.signedIn) input?.focus();
    }
  });

  root.querySelector('[data-action="expand"]')?.addEventListener('click', () => {
    refreshEditorChrome();
  });

  (async () => {
    Object.assign(state, await readAuthState());
    updateGreeting(root, state.rawUserName);
    refreshComposer();
    await refreshEditorChrome();
  })();
}
function buildShell(auth = {}) {
  const signedIn = Boolean(auth.signedIn);
  const collapse = el('button', {
    type: 'button',
    className: 'wpv-chat__icon-button',
    'aria-label': 'Collapse chat',
    'aria-expanded': 'false',
    'aria-controls': PANEL_ID,
    'data-action': 'collapse',
  }, [svgIcon(['M19 9l-7 7-7-7'], { size: 24 })]);

  const messages = el('ul', {
    className: 'wpv-chat__messages',
    tabindex: '0',
    'aria-label': 'Chat messages',
    'aria-live': 'polite',
    'aria-relevant': 'additions',
    role: 'list',
    hidden: !signedIn,
  }, [
    greetingRow(auth.rawUserName || ''),
  ]);

  const headerChildren = [
    el('h2', { className: 'wpv-chat__title' }, [
      brandLogo(),
      el('span', { className: 'wpv-chat__title-text', text: CHAT_TITLE }),
    ]),
  ];
  if (SHOW_BETA_BADGE) {
    headerChildren.push(el('span', { className: 'wpv-chat__beta', text: BETA_LABEL }));
  }
  headerChildren.push(collapse);

  const toolsChildren = [];
  if (SHOW_FREE_CHAT) {
    toolsChildren.push(el('p', {
      className: 'wpv-chat__hint',
      hidden: true,
      text: 'Rewriting the selected copy, not the whole article.',
    }));
  }
  toolsChildren.push(el('div', {
    className: 'wpv-chat__actions',
    role: 'group',
    'aria-label': 'Assistant actions',
  }, visibleActions().map(actionButton)));

  const composerChildren = [
    el('div', {
      className: 'wpv-chat__composer-tools',
      hidden: !signedIn,
    }, toolsChildren),
    el('p', {
      className: 'wpv-chat__idle-hint',
      text: IDLE_HINT,
      hidden: !signedIn,
    }),
  ];

  if (SHOW_FREE_CHAT) {
    const input = el('input', {
      id: INPUT_ID,
      className: 'wpv-chat__input',
      type: 'text',
      name: 'message',
      placeholder: SIGNED_IN_PLACEHOLDER,
      autocomplete: 'off',
      maxlength: '8000',
      disabled: true,
    });
    const sendLabel = el('span', { className: 'wpv-chat__send-label', text: 'Send' });
    const spinnerWrap = el('span', {
      className: 'wpv-chat__send-spinner',
      hidden: true,
    }, [sendSpinner()]);
    composerChildren.push(el('form', {
      className: 'wpv-chat__form',
      'aria-busy': 'false',
      hidden: !signedIn,
    }, [
      el('label', {
        className: 'wpv-chat__visually-hidden',
        for: INPUT_ID,
        text: 'Message',
      }),
      el('div', { className: 'wpv-chat__field' }, [input]),
      el('button', {
        type: 'submit',
        className: 'wpv-chat__send',
        disabled: true,
      }, [sendLabel, spinnerWrap]),
    ]));
  }

  composerChildren.push(signInGate({ hidden: signedIn }));

  const windowChildren = [
    el('header', { className: 'wpv-chat__header' }, headerChildren),
  ];
  if (SHOW_DRAFT_CHECKLIST) {
    windowChildren.push(el('details', {
      className: 'wpv-chat__checklist',
      hidden: !signedIn,
    }, [
      el('summary', {}, [
        el('span', { text: 'Draft checklist' }),
        el('span', { className: 'wpv-chat__checklist-count', text: 'Checking…' }),
      ]),
      el('ul', { className: 'wpv-chat__checklist-items' }),
    ]));
  }
  windowChildren.push(
    messages,
    el('div', { className: 'wpv-chat__composer' }, composerChildren),
  );

  const windowEl = el('div', {
    id: PANEL_ID,
    className: 'wpv-chat__window',
  }, windowChildren);

  const expand = el('button', {
    type: 'button',
    className: 'wpv-chat__fab',
    'aria-label': 'Open chat',
    'aria-expanded': 'false',
    'aria-controls': PANEL_ID,
    'data-action': 'expand',
  }, [svgIcon(['M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z'], { size: 24 })]);

  const fabWrap = el('div', { className: 'wpv-chat__fab-wrap' }, [expand]);
  const root = el('aside', {
    className: signedIn ? 'wpv-chat wpv-chat--signed-in' : 'wpv-chat',
    'aria-label': CHAT_TITLE,
  }, [
    windowEl,
    fabWrap,
  ]);

  collapse.addEventListener('click', () => setOpen(root, false));
  expand.addEventListener('click', () => setOpen(root, true));
  bindComposer(root, auth);

  return root;
}
async function mount() {
  if (document.getElementById(HOST_ID) || !document.body) return;

  const host = document.createElement('div');
  host.id = HOST_ID;
  host.style.position = 'fixed';
  host.style.bottom = '1rem';
  host.style.right = '1rem';
  host.style.zIndex = '1000100';

  const shadow = host.attachShadow({ mode: 'open' });
  const style = document.createElement('style');
  style.textContent = CHAT_MODAL_CSS;
  shadow.appendChild(style);
  const auth = await readAuthState();
  const root = buildShell(auth);
  shadow.appendChild(root);

  await new Promise((resolve) => {
    requestAnimationFrame(() => {
      document.body.appendChild(host);
      resolve();
    });
  });

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      setOpen(root, true, { focus: false });
    });
  });

  watchFootersToolbar();
}

function watchForEditor() {
  const observer = new MutationObserver(() => {
    if (document.getElementById(HOST_ID)) {
      observer.disconnect();
      return;
    }
    if (shouldMount() || editorChromePresent()) {
      observer.disconnect();
      mount();
    }
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['class'],
  });
}

if (shouldMount()) {
  mount();
} else {
  watchForEditor();
}
