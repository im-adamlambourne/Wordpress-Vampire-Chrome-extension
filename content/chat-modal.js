const HOST_ID = 'wp-vampire-chat';
const PANEL_ID = 'wpv-chat-panel';
const INPUT_ID = 'wpv-chat-input';
const FIELD_ERROR_ID = 'wpv-chat-input-error';
const GREETING = 'I can help with this article. Ask me to review, rewrite, or apply changes to the current draft.';
const SIGNED_OUT_PLACEHOLDER = 'Sign in via the toolbar popup';
const SIGNED_IN_PLACEHOLDER = 'Type your message...';
const MAX_HISTORY = 20;
const EDITOR_COMMAND_EVENT = 'wpv-editor';
const EDITOR_RESULT_EVENT = 'wpv-editor-result';
const SNAPSHOT_TIMEOUT_MS = 4000;
const APPLY_TIMEOUT_MS = 10000;

// Inlined from chat-modal.css. Content-script fetch() of chrome-extension://
// URLs uses the page origin and is blocked (page CSP / no WAR), so the
// stylesheet must ship in this file.
const CHAT_MODAL_CSS = `
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

  color: var(--text);
  font-size: 14px;
  line-height: 1.45;
}

.wpv-chat__window[hidden],
.wpv-chat__fab-wrap[hidden] {
  display: none;
}

.wpv-chat__window {
  display: flex;
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

.wpv-chat__icon-button:focus-visible {
  outline: 2px solid #7ee2fc;
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
  margin-top: 0.5rem;
}

.wpv-chat__row--user {
  flex-direction: row-reverse;
}

.wpv-chat__avatar {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 1.75rem;
  height: 1.75rem;
  border-radius: 999px;
  background: var(--ws-well-4);
  color: #7ee2fc;
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

.wpv-chat__bubble .wpv-chat__status {
  margin: 0.35rem 0 0;
  font-size: 0.75rem;
  color: var(--text-muted);
}

.wpv-chat__bubble .wpv-chat__status--error {
  color: #fca5a5;
}

.wpv-chat__composer {
  padding: 0.75rem 1rem;
  border-top: 1px solid var(--ws-hairline);
}

.wpv-chat__form {
  position: relative;
  display: flex;
  align-items: flex-end;
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
  width: 6rem;
  padding: 0.5rem 1rem;
  border: 0;
  border-radius: 0.75rem;
  background: var(--brand-600);
  color: #fff;
  font: inherit;
  font-size: 0.875rem;
  font-weight: 600;
}

.wpv-chat__send:hover:not(:disabled) {
  background: var(--brand-700);
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
}

.wpv-chat__fab:hover:not(:disabled) {
  background: var(--brand-700);
}

.wpv-chat__fab:focus-visible {
  outline: 2px solid #7ee2fc;
  outline-offset: 2px;
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

function robotAvatar() {
  const avatar = document.createElement('span');
  avatar.className = 'wpv-chat__avatar';
  avatar.setAttribute('aria-hidden', 'true');
  avatar.appendChild(svgIcon([
    'M9 8V6a3 3 0 0 1 6 0v2',
    'M7 9h10a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2z',
    'M9.5 13h.01M14.5 13h.01',
  ], { size: 16, strokeWidth: 1.75 }));
  return avatar;
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

function setOpen(root, open) {
  const windowEl = root.querySelector('.wpv-chat__window');
  const fabWrap = root.querySelector('.wpv-chat__fab-wrap');
  const collapse = root.querySelector('[data-action="collapse"]');
  const expand = root.querySelector('[data-action="expand"]');

  windowEl.hidden = !open;
  fabWrap.hidden = open;
  collapse.setAttribute('aria-expanded', String(open));
  expand.setAttribute('aria-expanded', String(open));

  const next = open ? collapse : expand;
  next.focus();
}

function fallbackArticleSnapshot() {
  if (typeof detectArticleSnapshot === 'function') {
    return detectArticleSnapshot();
  }
  return {
    title: '',
    content: '',
    excerpt: '',
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
  return ['title', 'content', 'excerpt'].some((key) => (
    typeof edits[key] === 'string' && edits[key].trim() !== ''
  ));
}

function describeApplied(applied) {
  const labels = { title: 'title', body: 'body', excerpt: 'excerpt' };
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
    if (!result?.ok) {
      return {
        status: 'Could not update the editor. Copy the suggested text in if you still want it.',
        statusError: true,
      };
    }
    const what = describeApplied(result.applied);
    if (!what) {
      return { status: 'No editor fields were changed.', statusError: false };
    }
    return {
      status: `Updated ${what} in the editor. Undo in the editor to revert.`,
      statusError: false,
    };
  } catch {
    return {
      status: 'Could not update the editor. Copy the suggested text in if you still want it.',
      statusError: true,
    };
  }
}

function syncAriaInvalid(input) {
  if (!input.checkValidity()) {
    input.setAttribute('aria-invalid', 'true');
  } else {
    input.removeAttribute('aria-invalid');
  }
}

function appendMessage(messages, { role, text, error = false, status = '', statusError = false }) {
  const isUser = role === 'user';
  const className = error
    ? 'wpv-chat__row wpv-chat__row--error'
    : isUser
      ? 'wpv-chat__row wpv-chat__row--user'
      : 'wpv-chat__row';
  const children = [];
  if (!isUser) children.push(robotAvatar());
  const bubbleChildren = [el('p', { text })];
  if (status) {
    bubbleChildren.push(el('p', {
      className: statusError ? 'wpv-chat__status wpv-chat__status--error' : 'wpv-chat__status',
      text: status,
    }));
  }
  children.push(el('div', { className: 'wpv-chat__bubble' }, bubbleChildren));
  messages.appendChild(el('li', { className }, children));
  messages.scrollTop = messages.scrollHeight;
}

function setComposerEnabled(root, { signedIn, busy }) {
  const input = root.querySelector(`#${INPUT_ID}`);
  const send = root.querySelector('.wpv-chat__send');
  const form = root.querySelector('.wpv-chat__form');
  const disabled = !signedIn || busy;

  input.disabled = disabled;
  send.disabled = disabled;
  input.required = signedIn && !busy;
  input.placeholder = signedIn ? SIGNED_IN_PLACEHOLDER : SIGNED_OUT_PLACEHOLDER;
  form.setAttribute('aria-busy', busy ? 'true' : 'false');

  if (disabled) {
    input.removeAttribute('aria-invalid');
  }
}

async function readSignedIn() {
  const { apiToken } = await chrome.storage.local.get('apiToken');
  return typeof apiToken === 'string' && apiToken.length > 0;
}

function bindComposer(root) {
  const form = root.querySelector('.wpv-chat__form');
  const input = root.querySelector(`#${INPUT_ID}`);
  const messages = root.querySelector('.wpv-chat__messages');
  const transcript = [];
  const state = { signedIn: false, busy: false };

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
    appendMessage(messages, { role: 'user', text });

    state.busy = true;
    refreshComposer();

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

    if (result?.ok && typeof result.reply === 'string') {
      transcript.push({ role: 'assistant', content: result.reply });
      let status = '';
      let statusError = false;
      if (hasEdits(result.edits)) {
        const applied = await applyEditorEdits(result.edits);
        status = applied.status;
        statusError = applied.statusError;
      }
      appendMessage(messages, {
        role: 'assistant',
        text: result.reply,
        status,
        statusError,
      });
    } else {
      appendMessage(messages, {
        role: 'assistant',
        text: result?.error || 'Chat failed.',
        error: true,
      });
    }

    state.busy = false;
    state.signedIn = await readSignedIn();
    refreshComposer();
    if (state.signedIn) input.focus();
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local' || !changes.apiToken) return;
    state.signedIn = typeof changes.apiToken.newValue === 'string'
      && changes.apiToken.newValue.length > 0;
    refreshComposer();
  });

  (async () => {
    state.signedIn = await readSignedIn();
    refreshComposer();
  })();
}

function buildShell() {
  const collapse = el('button', {
    type: 'button',
    className: 'wpv-chat__icon-button',
    'aria-label': 'Collapse chat',
    'aria-expanded': 'true',
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
      el('div', { className: 'wpv-chat__bubble' }, [greeting]),
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
  const send = el('button', {
    type: 'submit',
    className: 'wpv-chat__send',
    disabled: true,
    text: 'Send',
  });
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

  const fabWrap = el('div', { className: 'wpv-chat__fab-wrap', hidden: true }, [expand]);
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
  shadow.appendChild(buildShell());

  await new Promise((resolve) => {
    requestAnimationFrame(() => {
      document.body.appendChild(host);
      resolve();
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
