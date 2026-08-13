const COMMAND_EVENT = 'wpv-editor';
const RESULT_EVENT = 'wpv-editor-result';
const MAX_TITLE_CHARS = 500;
const MAX_EXCERPT_CHARS = 2000;
const MAX_ARTICLE_CHARS = 20000;

window.addEventListener(COMMAND_EVENT, (event) => {
  const detail = event.detail;
  if (!detail || typeof detail !== 'object') return;

  const requestId = detail.requestId;
  const type = detail.type;
  if (typeof requestId !== 'string' || requestId === '') return;
  if (type !== 'snapshot' && type !== 'apply') return;

  (async () => {
    try {
      const editorType = await waitForEditor();
      if (!editorType) {
        throw new Error('WordPress editor is not ready.');
      }

      if (type === 'snapshot') {
        dispatchResult({
          requestId,
          ok: true,
          snapshot: takeSnapshot(editorType),
        });
        return;
      }

      dispatchResult({
        requestId,
        ok: true,
        applied: applyEdits(editorType, detail.edits),
      });
    } catch (err) {
      dispatchResult({
        requestId,
        ok: false,
        error: err instanceof Error ? err.message : 'Editor update failed.',
      });
    }
  })();
});

function dispatchResult(detail) {
  window.dispatchEvent(new CustomEvent(RESULT_EVENT, { detail }));
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function waitForEditor(timeoutMs = 8000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const type = detectReadyEditor();
    if (type) return type;
    await sleep(50);
  }
  return detectReadyEditor();
}

function detectReadyEditor() {
  if (gutenbergReady()) return 'gutenberg';
  if (classicReady()) return 'classic';
  return null;
}

function gutenbergReady() {
  try {
    const select = window.wp?.data?.select?.('core/editor');
    const editorDispatch = window.wp?.data?.dispatch?.('core/editor');
    const blockDispatch = window.wp?.data?.dispatch?.('core/block-editor');
    return !!(
      select
      && typeof select.getEditedPostContent === 'function'
      && typeof select.getEditedPostAttribute === 'function'
      && typeof editorDispatch?.editPost === 'function'
      && typeof blockDispatch?.resetBlocks === 'function'
      && typeof window.wp?.blocks?.parse === 'function'
      && typeof window.wp?.blocks?.rawHandler === 'function'
    );
  } catch {
    return false;
  }
}

function classicReady() {
  return !!document.getElementById('title')
    && (!!document.getElementById('content') || !!window.tinymce?.get?.('content'));
}

function takeSnapshot(editorType) {
  if (editorType === 'gutenberg') {
    const editor = window.wp.data.select('core/editor');
    return truncateSnapshot({
      title: String(editor.getEditedPostAttribute('title') || ''),
      content: String(editor.getEditedPostContent() || ''),
      excerpt: String(editor.getEditedPostAttribute('excerpt') || ''),
      editor_type: 'gutenberg',
    });
  }

  return truncateSnapshot({
    title: fieldValue('title'),
    content: classicContent(),
    excerpt: fieldValue('excerpt'),
    editor_type: 'classic',
  });
}

function truncateSnapshot(snapshot) {
  return {
    title: snapshot.title.slice(0, MAX_TITLE_CHARS),
    content: snapshot.content.slice(0, MAX_ARTICLE_CHARS),
    excerpt: snapshot.excerpt.slice(0, MAX_EXCERPT_CHARS),
    editor_type: snapshot.editor_type,
  };
}

function fieldValue(id) {
  const el = document.getElementById(id);
  return typeof el?.value === 'string' ? el.value : '';
}

function classicContent() {
  const editor = window.tinymce?.get?.('content');
  if (editor && typeof editor.isHidden === 'function' && !editor.isHidden()) {
    return String(editor.getContent() || '');
  }
  return fieldValue('content');
}

function applyEdits(editorType, rawEdits) {
  const edits = normaliseEdits(rawEdits);
  if (Object.keys(edits).length === 0) return [];

  return editorType === 'gutenberg'
    ? applyGutenberg(edits)
    : applyClassic(edits);
}

function normaliseEdits(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};

  const edits = {};
  if (typeof raw.title === 'string' && raw.title.trim() !== '') {
    edits.title = raw.title.trim().slice(0, MAX_TITLE_CHARS);
  }
  if (typeof raw.content === 'string' && raw.content.trim() !== '') {
    edits.content = stripScripts(raw.content).trim().slice(0, MAX_ARTICLE_CHARS);
  }
  if (typeof raw.excerpt === 'string' && raw.excerpt.trim() !== '') {
    edits.excerpt = raw.excerpt.trim().slice(0, MAX_EXCERPT_CHARS);
  }
  return edits;
}

function stripScripts(html) {
  return html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
}

function applyGutenberg(edits) {
  const applied = [];
  const post = {};

  if (edits.title) {
    post.title = edits.title;
    applied.push('title');
  }
  if (edits.excerpt) {
    post.excerpt = edits.excerpt;
    applied.push('excerpt');
  }
  if (Object.keys(post).length > 0) {
    window.wp.data.dispatch('core/editor').editPost(post);
  }

  if (edits.content) {
    const blocks = htmlToBlocks(edits.content);
    if (!blocks.length) {
      throw new Error('Could not parse the updated body.');
    }
    window.wp.data.dispatch('core/block-editor').resetBlocks(blocks);
    applied.push('body');
  }

  return applied;
}

function htmlToBlocks(html) {
  if (html.includes('<!-- wp:')) {
    return window.wp.blocks.parse(html);
  }
  return window.wp.blocks.rawHandler({ HTML: html });
}

function applyClassic(edits) {
  const applied = [];

  if (edits.title) {
    const title = document.getElementById('title');
    if (!title) throw new Error('Could not find the title field.');
    setFieldValue(title, edits.title);
    applied.push('title');
  }

  if (edits.excerpt) {
    const excerpt = document.getElementById('excerpt');
    if (excerpt) {
      setFieldValue(excerpt, edits.excerpt);
      applied.push('excerpt');
    }
  }

  if (edits.content) {
    const editor = window.tinymce?.get?.('content');
    if (editor && typeof editor.setContent === 'function'
      && (typeof editor.isHidden !== 'function' || !editor.isHidden())) {
      editor.setContent(edits.content);
    } else {
      const textarea = document.getElementById('content');
      if (!textarea) throw new Error('Could not find the body field.');
      setFieldValue(textarea, edits.content);
    }
    applied.push('body');
  }

  return applied;
}

function setFieldValue(el, value) {
  el.value = value;
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
}
