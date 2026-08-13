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

function probeSession() {
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
    url: location.href,
    detectedAt: new Date().toISOString(),
  };
}

async function announceAttached() {
  try {
    await chrome.runtime.sendMessage({
      type: 'SESSION_ATTACHED',
      session: probeSession(),
    });
  } catch (err) {
    console.warn('Could not announce session to service worker:', err.message);
  }
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type !== 'GET_SESSION') return;

  (async () => {
    const session = probeSession();
    sendResponse(session);
  })();

  return true;
});

announceAttached();
