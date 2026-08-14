const HOST_ID = 'wp-vampire-chat';
const PANEL_ID = 'wpv-chat-panel';
const INPUT_ID = 'wpv-chat-input';
const CHAT_TITLE = 'Revision Assistant';
const GREETING_HI = 'Hi! 👋';
const GREETING_BODY = "I'm your revision assistant. Tell me what you'd like to change: reword a section, tighten the intro, or refresh the headline, and I'll update the article for you.";
const GREETING_ITEMS_LABEL = 'I can also';
const SIGNED_OUT_PLACEHOLDER = 'Sign in via the toolbar popup';
const SIGNED_IN_PLACEHOLDER = 'What should change?';
const DEFAULT_USER_NAME = 'User';
const MAX_HISTORY = 20;
const EDITOR_COMMAND_EVENT = 'wpv-editor';
const EDITOR_RESULT_EVENT = 'wpv-editor-result';
const SNAPSHOT_TIMEOUT_MS = 4000;
const APPLY_TIMEOUT_MS = 10000;
const AUTH_KEYS = ['apiToken', 'apiUserName'];
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
const SEO_PACK_PROMPT = 'Write the excerpt, SEO title, SEO description, Open Graph title, Open Graph description, and focus keyphrase from this draft. Do not change the post title or body.';
const HEADLINES_PROMPT = 'Suggest 5 alternative headlines for this draft. Do not change the draft yet.';
const RELATED_IMAGES_PROMPT = 'Find related images from our archive to add to the article';
const SEO_BACKLINKS_PROMPT = 'Find SEO-friendly backlinks to related articles in our archive';
const GREETING_ITEMS = [
  { icon: 'photo', label: RELATED_IMAGES_PROMPT, prompt: RELATED_IMAGES_PROMPT },
  { icon: 'link', label: SEO_BACKLINKS_PROMPT, prompt: SEO_BACKLINKS_PROMPT },
];
const QUICK_ACTIONS = [
  {
    id: 'images',
    icon: 'photo',
    label: 'Related images',
    hint: 'Find related images from the archive',
    prompt: RELATED_IMAGES_PROMPT,
  },
  {
    id: 'backlinks',
    icon: 'link',
    label: 'SEO backlinks',
    hint: 'Insert internal SEO backlinks',
    prompt: SEO_BACKLINKS_PROMPT,
  },
  {
    id: 'seo',
    icon: 'search',
    label: 'SEO pack',
    hint: 'Write excerpt, SEO, and Open Graph',
    prompt: SEO_PACK_PROMPT,
  },
  {
    id: 'headlines',
    icon: 'sparkles',
    label: 'Headline ideas',
    hint: 'Suggest alternative headlines',
    prompt: HEADLINES_PROMPT,
  },
];
const ICON_PATHS = {
  photo: 'm2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z',
  link: 'M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244',
  search: 'M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m5.231 13.481L15 17.25m-4.5-15H5.625c-.621 0-1.125.504-1.125 1.125v16.5c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Zm3.75 11.625a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z',
  sparkles: 'M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z',
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
  height: 40rem;
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
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--ws-hairline);
}

.wpv-chat__title {
  margin: 0;
  font-size: 1rem;
  font-weight: 700;
  color: #fff;
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
.wpv-chat__send:focus-visible {
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

.wpv-chat__greeting-items {
  margin-top: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px solid rgb(255 255 255 / 0.1);
}

.wpv-chat__greeting-label {
  margin: 0;
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.025em;
  text-transform: uppercase;
  color: #9ca3af;
}

.wpv-chat__greeting-list {
  margin: 0.5rem 0 0;
  padding: 0;
  list-style: none;
}

.wpv-chat__greeting-item {
  font-size: 0.875rem;
  font-weight: 400;
  color: #e5e7eb;
  overflow-wrap: anywhere;
}

.wpv-chat__greeting-item + .wpv-chat__greeting-item {
  margin-top: 0.375rem;
}

.wpv-chat__greeting-action {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  width: 100%;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.wpv-chat__greeting-action:hover:not(:disabled) {
  color: #fff;
}

.wpv-chat__greeting-action:disabled {
  cursor: default;
  opacity: 1;
}

.wpv-chat__greeting-action:focus-visible {
  outline: 2px solid var(--focus-ring);
  outline-offset: 2px;
  border-radius: 0.25rem;
}

.wpv-chat__greeting-icon {
  flex-shrink: 0;
  width: 1rem;
  height: 1rem;
  margin-top: 0.125rem;
  color: #a5b4fc;
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
  border: 1px solid rgb(255 255 255 / 0.2);
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
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

.wpv-chat__chip {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  padding: 0;
  border: 1px solid var(--ws-hairline);
  border-radius: 0.55rem;
  background: var(--ws-well-4);
  color: #a5b4fc;
  cursor: pointer;
  user-select: none;
  interest-delay: 0.15s 0.1s;
  transition:
    background-color 0.15s ease,
    border-color 0.15s ease,
    color 0.15s ease;
}

.wpv-chat__chip:hover:not(:disabled),
.wpv-chat__chip:focus-visible {
  background: var(--ws-well-5);
  border-color: rgb(58 181 244 / 0.45);
  color: #3ab5f4;
}

.wpv-chat__chip:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.wpv-chat__chip:focus-visible {
  outline: 2px solid var(--focus-ring);
  outline-offset: 2px;
}

.wpv-chat__chip-icon {
  width: 1.05rem;
  height: 1.05rem;
}

.wpv-chat__tooltip {
  position: absolute;
  inset: auto;
  box-sizing: border-box;
  width: max-content;
  max-width: 12.5rem;
  height: fit-content;
  margin: 0 0 0.4rem;
  padding: 0.35rem 0.55rem;
  overflow: visible;
  border: 1px solid var(--ws-hairline);
  border-radius: 0.4rem;
  background: #011627;
  color: #f3f4f6;
  font: 0.7rem / 1.35 system-ui, sans-serif;
  letter-spacing: 0.01em;
  text-wrap: balance;
  box-shadow: 0 10px 24px rgb(0 0 0 / 0.4);
  position-area: block-start;
  justify-self: anchor-center;
  position-try: flip-block;
  opacity: 0;
  transition:
    display 0.12s ease allow-discrete,
    overlay 0.12s ease allow-discrete,
    opacity 0.12s ease;
}

.wpv-chat__tooltip:is(:popover-open, .\:popover-open) {
  display: block;
  opacity: 1;

  @starting-style {
    opacity: 0;
  }
}

.wpv-chat__tooltip::after {
  content: "";
  position: absolute;
  top: calc(100% - 0.22rem);
  left: 50%;
  width: 0.45rem;
  height: 0.45rem;
  background: inherit;
  border-right: inherit;
  border-bottom: inherit;
  transform: translateX(-50%) rotate(45deg);
}

.wpv-chat__variants {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  margin-top: 0.5rem;
}

.wpv-chat__variant {
  padding: 0.35rem 0.5rem;
  border: 1px solid var(--ws-hairline);
  border-radius: 0.5rem;
  background: var(--ws-well-4);
  color: #fff;
  font: inherit;
  font-size: 0.75rem;
  text-align: left;
  cursor: pointer;
}

.wpv-chat__variant:hover:not(:disabled) {
  background: var(--ws-well-5);
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

  .wpv-chat__chip,
  .wpv-chat__tooltip {
    transition-duration: 0.05s;
  }
}
`;

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

function greetingIcon(name) {
  return strokeIcon(name, 'wpv-chat__greeting-icon');
}

function quickAction(action) {
  const chipId = `wpv-chip-${action.id}`;
  const tipId = `wpv-tip-${action.id}`;
  const anchor = `--${chipId}`;
  const chip = el('button', {
    type: 'button',
    id: chipId,
    className: 'wpv-chat__chip',
    'aria-label': action.label,
    interestfor: tipId,
    'data-quick-prompt': action.prompt,
    disabled: true,
  }, [strokeIcon(action.icon, 'wpv-chat__chip-icon')]);
  chip.style.setProperty('anchor-name', anchor);

  const tooltip = el('div', {
    id: tipId,
    className: 'wpv-chat__tooltip',
    popover: 'hint',
    text: action.hint,
  });
  tooltip.style.setProperty('position-anchor', anchor);

  return [chip, tooltip];
}

function bindChipTooltipFallback(root) {
  const sample = root.querySelector('.wpv-chat__chip');
  if (sample && 'interestForElement' in HTMLButtonElement.prototype && sample.interestForElement) {
    return;
  }

  for (const chip of root.querySelectorAll('.wpv-chat__chip')) {
    const tipId = chip.getAttribute('interestfor');
    const tip = tipId ? root.querySelector(`#${CSS.escape(tipId)}`) : null;
    if (!tip || typeof tip.showPopover !== 'function') continue;

    let hideTimer = 0;
    const show = () => {
      if (chip.disabled) return;
      window.clearTimeout(hideTimer);
      try {
        tip.showPopover();
      } catch {
        // Already open.
      }
    };
    const hide = () => {
      hideTimer = window.setTimeout(() => {
        try {
          tip.hidePopover();
        } catch {
          // Already closed.
        }
      }, 80);
    };

    chip.addEventListener('pointerenter', show);
    chip.addEventListener('pointerleave', hide);
    chip.addEventListener('focus', show);
    chip.addEventListener('blur', hide);
    tip.addEventListener('pointerenter', show);
    tip.addEventListener('pointerleave', hide);
  }
}

function greetingItem(item) {
  return el('li', { className: 'wpv-chat__greeting-item' }, [
    el('button', {
      type: 'button',
      className: 'wpv-chat__greeting-action',
      'data-quick-prompt': item.prompt,
      disabled: true,
    }, [
      greetingIcon(item.icon),
      el('span', { text: item.label }),
    ]),
  ]);
}

function greetingRow(rawUserName) {
  return el('li', {
    className: 'wpv-chat__row',
    'data-greeting': '',
  }, [
    robotAvatar(),
    el('div', { className: 'wpv-chat__bubble wpv-chat__bubble--greeting' }, [
      el('p', { 'data-greeting-text': '', text: greetingText(rawUserName) }),
      el('div', { className: 'wpv-chat__greeting-items' }, [
        el('p', { className: 'wpv-chat__greeting-label', text: GREETING_ITEMS_LABEL }),
        el('ul', { className: 'wpv-chat__greeting-list' }, GREETING_ITEMS.map(greetingItem)),
      ]),
    ]),
  ]);
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
    };
  } catch {
    return fallback;
  }
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
  return applied;
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
  variants = [],
  onPickVariant = null,
}) {
  const isUser = role === 'user';
  const className = error
    ? 'wpv-chat__row wpv-chat__row--error'
    : isUser
      ? 'wpv-chat__row wpv-chat__row--user'
      : 'wpv-chat__row';
  const children = [isUser ? userAvatar(userName) : robotAvatar()];
  const bubbleChildren = [el('p', { text })];
  if (status) {
    bubbleChildren.push(el('p', {
      className: statusError ? 'wpv-chat__status wpv-chat__status--error' : 'wpv-chat__status',
      text: status,
    }));
  }
  if (Array.isArray(variants) && variants.length > 0) {
    const list = el('div', {
      className: 'wpv-chat__variants',
      role: 'group',
      'aria-label': 'Headline ideas',
    });
    for (const title of variants) {
      const button = el('button', {
        type: 'button',
        className: 'wpv-chat__variant',
        text: title,
      });
      button.addEventListener('click', () => onPickVariant?.(title));
      list.appendChild(button);
    }
    bubbleChildren.push(list);
  }
  children.push(el('div', { className: 'wpv-chat__bubble' }, bubbleChildren));
  messages.appendChild(el('li', { className }, children));
  scroller.scrollToBottom();
}

function setComposerEnabled(root, { signedIn, busy }) {
  const input = root.querySelector(`#${INPUT_ID}`);
  const send = root.querySelector('.wpv-chat__send');
  const label = root.querySelector('.wpv-chat__send-label');
  const spinner = root.querySelector('.wpv-chat__send-spinner');
  const form = root.querySelector('.wpv-chat__form');
  const disabled = !signedIn || busy;

  input.disabled = disabled;
  send.disabled = disabled;
  input.required = signedIn && !busy;
  input.placeholder = signedIn ? SIGNED_IN_PLACEHOLDER : SIGNED_OUT_PLACEHOLDER;
  form.setAttribute('aria-busy', busy ? 'true' : 'false');
  label.hidden = busy;
  spinner.hidden = !busy;
  for (const control of root.querySelectorAll('.wpv-chat__chip, .wpv-chat__variant, .wpv-chat__greeting-action')) {
    control.disabled = disabled;
  }

  if (disabled) {
    input.removeAttribute('aria-invalid');
  }
}

function renderChecklist(root, article, { signedIn, busy, onFix }) {
  const items = checklistItems(article);
  const gaps = items.filter((item) => !item.ok || item.warn).length;
  const count = root.querySelector('.wpv-chat__checklist-count');
  const list = root.querySelector('.wpv-chat__checklist-items');
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
    userName: DEFAULT_USER_NAME,
    rawUserName: '',
    lastArticle: null,
    ...initialAuth,
  };

  const refreshComposer = () => setComposerEnabled(root, state);
  refreshComposer();

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

  async function sendUserMessage(text) {
    if (state.busy || !state.signedIn) return;
    const message = String(text || '').trim();
    if (!message) return;

    input.value = '';
    input.removeAttribute('aria-invalid');
    transcript.push({ role: 'user', content: message });
    appendMessage(messages, scroller, {
      role: 'user',
      text: message,
      userName: state.userName,
    });

    state.busy = true;
    refreshComposer();
    setThinking(messages, scroller, true);

    const article = await articleSnapshot();
    state.lastArticle = article;

    let result;
    try {
      result = await chrome.runtime.sendMessage({
        type: 'PLUGIN_CHAT',
        message,
        history: transcript.slice(-MAX_HISTORY),
        article: compactArticle(article),
      });
    } catch (err) {
      result = { ok: false, error: err.message || 'Chat failed.' };
    }

    setThinking(messages, scroller, false);

    if (result?.ok && typeof result.reply === 'string') {
      transcript.push({ role: 'assistant', content: result.reply });
      let status = '';
      let statusError = false;
      if (hasEdits(result.edits)) {
        const applied = await applyReturnedEdits(result.edits, article);
        status = applied.status;
        statusError = applied.statusError;
      }
      appendMessage(messages, scroller, {
        role: 'assistant',
        text: result.reply,
        status,
        statusError,
        variants: result.title_variants || [],
        onPickVariant: (title) => applyReturnedEdits({ title }, state.lastArticle || article),
      });
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
    if (state.signedIn) input.focus();
  }

  input.addEventListener('blur', () => {
    if (!input.disabled) syncAriaInvalid(input);
  });
  input.addEventListener('input', () => {
    if (input.getAttribute('aria-invalid') === 'true') syncAriaInvalid(input);
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (state.busy || !state.signedIn) return;

    const text = input.value.trim();
    if (!text) return;

    await sendUserMessage(text);
  });

  for (const chip of root.querySelectorAll('[data-quick-prompt]')) {
    chip.addEventListener('click', () => {
      sendUserMessage(chip.getAttribute('data-quick-prompt'));
    });
  }
  bindChipTooltipFallback(root);

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;
    if (changes.apiToken) {
      state.signedIn = typeof changes.apiToken.newValue === 'string'
        && changes.apiToken.newValue.length > 0;
    }
    if (changes.apiUserName) {
      state.userName = displayName(changes.apiUserName.newValue);
      state.rawUserName = rawUserName(changes.apiUserName.newValue);
      updateGreeting(root, state.rawUserName);
    }
    if (changes.apiToken || changes.apiUserName) refreshComposer();
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
  }, [
    greetingRow(auth.rawUserName || ''),
  ]);

  const label = el('label', {
    className: 'wpv-chat__visually-hidden',
    for: INPUT_ID,
    text: 'Message',
  });
  const input = el('input', {
    id: INPUT_ID,
    className: 'wpv-chat__input',
    type: 'text',
    name: 'message',
    placeholder: SIGNED_OUT_PLACEHOLDER,
    autocomplete: 'off',
    maxlength: '8000',
    disabled: true,
  });
  const field = el('div', { className: 'wpv-chat__field' }, [input]);
  const sendLabel = el('span', { className: 'wpv-chat__send-label', text: 'Send' });
  const spinnerWrap = el('span', {
    className: 'wpv-chat__send-spinner',
    hidden: true,
  }, [sendSpinner()]);
  const send = el('button', {
    type: 'submit',
    className: 'wpv-chat__send',
    disabled: true,
  }, [sendLabel, spinnerWrap]);
  const form = el('form', {
    className: 'wpv-chat__form',
    'aria-busy': 'false',
  }, [label, field, send]);
  const hint = el('p', {
    className: 'wpv-chat__hint',
    hidden: true,
    text: 'Rewriting the selected copy, not the whole article.',
  });
  const tools = el('div', { className: 'wpv-chat__composer-tools' }, [
    hint,
    el('div', {
      className: 'wpv-chat__actions',
      role: 'group',
      'aria-label': 'Quick actions',
    }, QUICK_ACTIONS.flatMap(quickAction)),
  ]);

  const checklist = el('details', { className: 'wpv-chat__checklist' }, [
    el('summary', {}, [
      el('span', { text: 'Draft checklist' }),
      el('span', { className: 'wpv-chat__checklist-count', text: 'Checking…' }),
    ]),
    el('ul', { className: 'wpv-chat__checklist-items' }),
  ]);

  const windowEl = el('div', {
    id: PANEL_ID,
    className: 'wpv-chat__window',
  }, [
    el('header', { className: 'wpv-chat__header' }, [
      el('h2', { className: 'wpv-chat__title', text: CHAT_TITLE }),
      collapse,
    ]),
    checklist,
    messages,
    el('div', { className: 'wpv-chat__composer' }, [tools, form]),
  ]);

  const expand = el('button', {
    type: 'button',
    className: 'wpv-chat__fab',
    'aria-label': 'Open chat',
    'aria-expanded': 'false',
    'aria-controls': PANEL_ID,
    'data-action': 'expand',
  }, [svgIcon(['M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z'], { size: 24 })]);

  const fabWrap = el('div', { className: 'wpv-chat__fab-wrap' }, [expand]);
  const root = el('aside', { className: 'wpv-chat', 'aria-label': CHAT_TITLE }, [
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
