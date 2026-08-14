function textOf(selector) {
  const el = document.querySelector(selector);
  return el?.textContent?.trim() || '';
}

function valueOf(selector) {
  const el = document.querySelector(selector);
  return typeof el?.value === 'string' ? el.value.trim() : '';
}

function isWpAdmin() {
  return document.body?.classList.contains('wp-admin')
    || location.pathname.includes('/wp-admin/');
}

function isLoggedIn() {
  return document.body?.classList.contains('logged-in')
    || !!document.getElementById('wpadminbar');
}

function detectEditorType() {
  const isGutenberg = document.body?.classList.contains('block-editor-page')
    || !!document.getElementById('editor')
    || !!document.querySelector('.block-editor, .edit-post-layout');

  if (isGutenberg) return 'gutenberg';

  const classicForm = document.getElementById('post');
  const classicTitle = document.getElementById('title');
  if (classicForm && classicTitle) return 'classic';

  return null;
}

function detectPostId() {
  const fromInput = valueOf('input[name="post_ID"]') || valueOf('#post_ID');
  if (fromInput) return fromInput;
  return new URLSearchParams(location.search).get('post') || '';
}

function detectPostType() {
  const fromInput = valueOf('#post_type') || valueOf('input[name="post_type"]');
  if (fromInput) return fromInput;
  return new URLSearchParams(location.search).get('post_type') || '';
}

function detectTitle() {
  return valueOf('#title')
    || valueOf('#post-title-0')
    || valueOf('.editor-post-title__input')
    || textOf('#post-title-0')
    || textOf('.editor-post-title__input')
    || '';
}

const MAX_ARTICLE_CHARS = 20000;

function detectContent() {
  for (const root of editorRoots()) {
    const writing = root.querySelector('.block-editor-writing-flow')
      || root.querySelector('.wp-block-post-content')
      || root.querySelector('.editor-styles-wrapper');
    const text = writing?.innerText?.trim();
    if (text) return text.slice(0, MAX_ARTICLE_CHARS);
  }

  const classic = valueOf('#content');
  if (classic) return classic.slice(0, MAX_ARTICLE_CHARS);

  return '';
}

function detectExcerpt() {
  return valueOf('#excerpt');
}

function detectNamedValue(ids) {
  for (const id of ids) {
    const fromId = valueOf(`#${CSS.escape ? CSS.escape(id) : id}`);
    if (fromId) return fromId;
    const el = document.querySelector(`[name="${id.replace(/"/g, '\\"')}"]`);
    if (typeof el?.value === 'string' && el.value.trim()) return el.value.trim();
  }
  return '';
}

function detectSeoSnapshot() {
  return {
    seo_title: detectNamedValue(['yoast_wpseo_title', 'rank_math_title']),
    seo_description: detectNamedValue(['yoast_wpseo_metadesc', 'rank_math_description']),
    og_title: detectNamedValue(['yoast_wpseo_opengraph-title', 'rank_math_facebook_title']),
    og_description: detectNamedValue([
      'yoast_wpseo_opengraph-description',
      'rank_math_facebook_description',
    ]),
    focus_keyphrase: detectNamedValue(['yoast_wpseo_focuskw', 'rank_math_focus_keyword']),
  };
}

function detectArticleSnapshot() {
  return {
    title: detectTitle(),
    content: detectContent(),
    excerpt: detectExcerpt(),
    ...detectSeoSnapshot(),
    editor_type: detectEditorType() || '',
    post_id: detectPostId(),
    post_type: detectPostType(),
    url: location.href,
  };
}

function detectRestRoot() {
  return document.querySelector('link[rel="https://api.w.org/"]')?.href || '';
}

function detectNoncePresent() {
  if (document.querySelector('input[name="_wpnonce"]')) return true;

  const extra = document.getElementById('wp-api-fetch-js-extra')
    || document.getElementById('wp-api-settings-js-extra');
  if (extra?.textContent?.includes('nonce')) return true;

  for (const script of document.querySelectorAll('script')) {
    const source = script.textContent || '';
    if (!source) continue;
    if (source.includes('createNonceMiddleware')) return true;
    if (source.includes('wpApiSettings') && source.includes('nonce')) return true;
  }

  return false;
}

const SKIP_INPUT_TYPES = new Set(['submit', 'button', 'reset', 'image']);
const REDACT_NAME = /nonce|password|passwd|secret|token/i;
const MAX_VALUE_CHARS = 200;
const FIELD_BATCH = 40;

function editorRoots() {
  const roots = [
    document.getElementById('post'),
    document.getElementById('editor'),
    document.querySelector('.edit-post-layout, .block-editor'),
  ].filter(Boolean);

  if (!roots.length) {
    const fallback = document.getElementById('wpbody-content') || document.body;
    if (fallback) roots.push(fallback);
  }

  const seenDocs = new Set(roots.map((root) => root.ownerDocument));
  for (const iframe of document.querySelectorAll('iframe')) {
    try {
      const doc = iframe.contentDocument;
      if (!doc?.body || seenDocs.has(doc)) continue;
      if (roots.some((root) => root.contains(iframe)) || iframe.name === 'editor-canvas') {
        roots.push(doc.body);
        seenDocs.add(doc);
      }
    } catch {
      // Cross-origin iframe — skip
    }
  }

  return roots;
}

function fieldLabel(el) {
  const fromLabels = el.labels?.[0]?.innerText?.trim();
  if (fromLabels) return fromLabels.slice(0, 80);

  const aria = el.getAttribute('aria-label');
  if (aria) return aria.trim().slice(0, 80);

  if (el.id) {
    const lab = el.ownerDocument.querySelector(`label[for="${CSS.escape(el.id)}"]`);
    const text = lab?.innerText?.trim();
    if (text) return text.slice(0, 80);
  }

  return (el.placeholder || el.name || el.id || '').trim();
}

function shouldRedact(el) {
  const type = (el.type || '').toLowerCase();
  if (type === 'password') return true;
  return REDACT_NAME.test(el.name || '') || REDACT_NAME.test(el.id || '');
}

function fieldValue(el) {
  const type = (el.type || '').toLowerCase();
  if (shouldRedact(el)) return el.value ? '[redacted]' : '';
  if (type === 'file') {
    return el.files?.length ? [...el.files].map((file) => file.name).join(', ') : '';
  }
  if (type === 'checkbox') return el.checked ? 'checked' : 'unchecked';
  if (type === 'radio') {
    const option = el.value || 'on';
    return el.checked ? `selected (${option})` : `unchecked (${option})`;
  }
  if (el.tagName === 'SELECT') {
    return [...el.selectedOptions].map((opt) => opt.text || opt.value).join(', ');
  }
  if (el.isContentEditable) return (el.innerText || '').trim();
  return typeof el.value === 'string' ? el.value : '';
}

function serializeField(el) {
  const tag = el.tagName.toLowerCase();
  const type = tag === 'textarea' ? 'textarea' : (el.type || (el.isContentEditable ? 'contenteditable' : tag));
  let value = fieldValue(el);
  const truncated = value.length > MAX_VALUE_CHARS;
  if (truncated) value = `${value.slice(0, MAX_VALUE_CHARS)}…`;

  return {
    tag,
    type,
    name: el.name || '',
    id: el.id || '',
    label: fieldLabel(el),
    value,
    truncated,
    disabled: !!el.disabled,
    required: !!el.required,
    hidden: type === 'hidden' || el.hidden,
  };
}

function collectFieldNodes(root) {
  const nodes = [...root.querySelectorAll('input, select, textarea')];
  const title = root.querySelector('#post-title-0, .editor-post-title__input');
  if (title && !nodes.includes(title)) nodes.unshift(title);
  return nodes;
}

async function collectFormFields() {
  const seen = new Set();
  const fields = [];
  const nodes = editorRoots().flatMap(collectFieldNodes);

  for (let i = 0; i < nodes.length; i += FIELD_BATCH) {
    const batch = nodes.slice(i, i + FIELD_BATCH);
    await new Promise((resolve) => {
      requestAnimationFrame(() => {
        for (const el of batch) {
          if (seen.has(el)) continue;
          seen.add(el);
          const type = (el.type || '').toLowerCase();
          if (SKIP_INPUT_TYPES.has(type)) continue;
          fields.push(serializeField(el));
        }
        resolve();
      });
    });
    if (globalThis.scheduler?.yield) await scheduler.yield();
  }

  return fields;
}

async function probeSession({ includeFields = false } = {}) {
  const editorType = detectEditorType();

  return {
    attached: isWpAdmin(),
    loggedIn: isLoggedIn(),
    user: textOf('#wpadminbar .display-name'),
    siteName: textOf('#wp-admin-bar-site-name a')
      || textOf('#wp-admin-bar-site-name')
      || document.title,
    editor: {
      type: editorType,
      postId: detectPostId(),
      postType: detectPostType(),
      title: detectTitle(),
    },
    rest: {
      root: detectRestRoot(),
      noncePresent: detectNoncePresent(),
    },
    fields: includeFields ? await collectFormFields() : [],
    url: location.href,
    detectedAt: new Date().toISOString(),
  };
}

async function announceAttached() {
  try {
    await chrome.runtime.sendMessage({
      type: 'SESSION_ATTACHED',
      session: await probeSession({ includeFields: false }),
    });
  } catch (err) {
    console.warn('Could not announce session to service worker:', err.message);
  }
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type !== 'GET_SESSION') return;

  (async () => {
    try {
      sendResponse(await probeSession({ includeFields: true }));
    } catch (err) {
      console.error('Failed to probe session:', err);
      sendResponse({ attached: false, error: err.message });
    }
  })();

  return true;
});

announceAttached();
