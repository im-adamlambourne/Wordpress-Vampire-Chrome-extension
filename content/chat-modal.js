const HOST_ID = 'wp-vampire-chat';
const PANEL_ID = 'wpv-chat-panel';
const INPUT_ID = 'wpv-chat-input';
const FIELD_ERROR_ID = 'wpv-chat-input-error';
const GREETING = 'I can help with this article. Ask me to review or rewrite the draft, excerpt, SEO, or Open Graph fields.';
const SIGNED_OUT_PLACEHOLDER = 'Sign in via the toolbar popup';
const SIGNED_IN_PLACEHOLDER = 'Type your message...';
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
  'excerpt',
  'seo_title',
  'seo_description',
  'og_title',
  'og_description',
];

// Inlined from chat-modal.css. Content-script fetch() of chrome-extension://
// URLs uses the page origin and is blocked (page CSP / no WAR), so the
// stylesheet must ship in this file.
const CHAT_MODAL_CSS = `/* Source of truth for the overlay look. Runtime uses the CHAT_MODAL_CSS
   copy in chat-modal.js — content-script fetch of this file is blocked
   by the host page. Update both when changing styles.

   Layout, motion, loader, and spinner match the Content Exchange chat
   modal. Colour is Immediate Media cyan/royal, not CEX plum. */

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

.wpv-chat__row--user .wpv-chat__bubble p {
  color: #fff;
}

.wpv-chat__row--error .wpv-chat__bubble {
  background: #7f1d1d;
}

.wpv-chat__bubble p {
  margin: 0;
  font-size: 0.875rem;
  font-weight: 400;
  color: var(--text);
  overflow-wrap: anywhere;
}

.wpv-chat__bubble--greeting p {
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

.wpv-chat__field-error {
  display: none;
  color: #fca5a5;
  font-size: 0.75rem;
}

.wpv-chat__input:user-invalid + .wpv-chat__field-error {
  display: flex;
  align-items: center;
  gap: 0.25rem;
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
}`;

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
  img.className = 'wpv-chat__avatar';
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
      editor_type: result.snapshot.editor_type || fallback.editor_type,
    };
  } catch {
    return fallback;
  }
}

function compactArticle(article) {
  const next = { ...article };
  if (!next.editor_type) delete next.editor_type;
  return next;
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
    excerpt: 'excerpt',
    seo_title: 'SEO title',
    seo_description: 'SEO description',
    og_title: 'Open Graph title',
    og_description: 'Open Graph description',
  };
  const parts = (Array.isArray(applied) ? applied : [])
    .map((key) => labels[key])
    .filter(Boolean);
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0];
  if (parts.length === 2) return `${parts[0]} and ${parts[1]}`;
  return `${parts.slice(0, -1).join(', ')}, and ${parts[parts.length - 1]}`;
}

async function applyEditorEdits(edits) {
  try {
    const result = await callEditorBridge('apply', { edits }, APPLY_TIMEOUT_MS);
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

  if (disabled) {
    input.removeAttribute('aria-invalid');
  }
}

function displayName(value) {
  return typeof value === 'string' && value.trim() !== ''
    ? value.trim()
    : DEFAULT_USER_NAME;
}

async function readAuthState() {
  const { apiToken, apiUserName } = await chrome.storage.local.get(AUTH_KEYS);
  return {
    signedIn: typeof apiToken === 'string' && apiToken.length > 0,
    userName: displayName(apiUserName),
  };
}

function bindComposer(root) {
  const form = root.querySelector('.wpv-chat__form');
  const input = root.querySelector(`#${INPUT_ID}`);
  const messages = root.querySelector('.wpv-chat__messages');
  const scroller = installAutoScroll(messages);
  const replySound = createReplySound();
  const transcript = [];
  const state = { signedIn: false, busy: false, userName: DEFAULT_USER_NAME };

  const refreshComposer = () => setComposerEnabled(root, state);

  input.addEventListener('blur', () => {
    if (!input.disabled) syncAriaInvalid(input);
  });
  input.addEventListener('input', () => {
    if (input.getAttribute('aria-invalid') === 'true') syncAriaInvalid(input);
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (state.busy || !state.signedIn) return;
    if (!form.reportValidity()) {
      syncAriaInvalid(input);
      return;
    }

    const text = input.value.trim();
    if (!text) {
      syncAriaInvalid(input);
      return;
    }

    input.value = '';
    input.removeAttribute('aria-invalid');
    transcript.push({ role: 'user', content: text });
    appendMessage(messages, scroller, {
      role: 'user',
      text,
      userName: state.userName,
    });

    state.busy = true;
    refreshComposer();
    setThinking(messages, scroller, true);

    let result;
    try {
      result = await chrome.runtime.sendMessage({
        type: 'PLUGIN_CHAT',
        message: text,
        history: transcript.slice(-MAX_HISTORY),
        article: compactArticle(await articleSnapshot()),
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
        const applied = await applyEditorEdits(result.edits);
        status = applied.status;
        statusError = applied.statusError;
      }
      appendMessage(messages, scroller, {
        role: 'assistant',
        text: result.reply,
        status,
        statusError,
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
    if (state.signedIn) input.focus();
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;
    if (changes.apiToken) {
      state.signedIn = typeof changes.apiToken.newValue === 'string'
        && changes.apiToken.newValue.length > 0;
    }
    if (changes.apiUserName) {
      state.userName = displayName(changes.apiUserName.newValue);
    }
    if (changes.apiToken || changes.apiUserName) refreshComposer();
  });

  (async () => {
    Object.assign(state, await readAuthState());
    refreshComposer();
  })();
}

function buildShell() {
  const collapse = el('button', {
    type: 'button',
    className: 'wpv-chat__icon-button',
    'aria-label': 'Collapse chat',
    'aria-expanded': 'false',
    'aria-controls': PANEL_ID,
    'data-action': 'collapse',
  }, [svgIcon(['M19 9l-7 7-7-7'], { size: 24 })]);

  const greeting = el('p', { text: GREETING });
  const messages = el('ul', {
    className: 'wpv-chat__messages',
    tabindex: '0',
    'aria-label': 'Chat messages',
    'aria-live': 'polite',
    'aria-relevant': 'additions',
    role: 'list',
  }, [
    el('li', { className: 'wpv-chat__row' }, [
      robotAvatar(),
      el('div', { className: 'wpv-chat__bubble wpv-chat__bubble--greeting' }, [greeting]),
    ]),
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
    'aria-errormessage': FIELD_ERROR_ID,
    disabled: true,
  });
  const fieldError = el('div', {
    id: FIELD_ERROR_ID,
    className: 'wpv-chat__field-error',
  }, [
    el('span', { 'aria-hidden': 'true', text: '!' }),
    el('span', { text: 'Enter a message to send.' }),
  ]);
  const field = el('div', { className: 'wpv-chat__field' }, [input, fieldError]);
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

  const windowEl = el('div', {
    id: PANEL_ID,
    className: 'wpv-chat__window',
  }, [
    el('header', { className: 'wpv-chat__header' }, [
      el('h2', { className: 'wpv-chat__title', text: 'Chat with Agent' }),
      collapse,
    ]),
    messages,
    el('div', { className: 'wpv-chat__composer' }, [form]),
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
  const root = el('aside', { className: 'wpv-chat', 'aria-label': 'Chat with Agent' }, [
    windowEl,
    fabWrap,
  ]);

  collapse.addEventListener('click', () => setOpen(root, false));
  expand.addEventListener('click', () => setOpen(root, true));
  bindComposer(root);

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
  const root = buildShell();
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
