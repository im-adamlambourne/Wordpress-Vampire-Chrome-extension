const COMMAND_EVENT = 'wpv-editor';
const RESULT_EVENT = 'wpv-editor-result';
const MAX_TITLE_CHARS = 500;
const MAX_EXCERPT_CHARS = 2000;
const MAX_ARTICLE_CHARS = 20000;
const MAX_SEO_TITLE_CHARS = 200;
const MAX_SEO_DESCRIPTION_CHARS = 500;
const MAX_OG_TITLE_CHARS = 200;
const MAX_OG_DESCRIPTION_CHARS = 500;

const SEO_FIELDS = [
  {
    key: 'seo_title',
    max: MAX_SEO_TITLE_CHARS,
    inputs: ['yoast_wpseo_title', 'rank_math_title'],
    names: ['yoast_wpseo_title', 'rank_math_title', 'aioseo[posts][title]'],
    meta: ['_yoast_wpseo_title', 'rank_math_title', '_aioseo_title'],
    yoastRead: ['getSnippetEditorTitle', 'getSeoTitle'],
    yoastSnippetKey: 'title',
    rankRead: ['getTitle'],
    rankWrite: ['updateTitle', 'setTitle'],
    yoastWrite(dispatch, value) {
      if (typeof dispatch.updateData === 'function') {
        dispatch.updateData({ title: value });
        return true;
      }
      if (typeof dispatch.setSnippetEditorTitle === 'function') {
        dispatch.setSnippetEditorTitle(value);
        return true;
      }
      return false;
    },
  },
  {
    key: 'seo_description',
    max: MAX_SEO_DESCRIPTION_CHARS,
    inputs: ['yoast_wpseo_metadesc', 'rank_math_description'],
    names: ['yoast_wpseo_metadesc', 'rank_math_description', 'aioseo[posts][description]'],
    meta: ['_yoast_wpseo_metadesc', 'rank_math_description', '_aioseo_description'],
    yoastRead: ['getSnippetEditorDescription', 'getDescription', 'getSeoDescription'],
    yoastSnippetKey: 'description',
    rankRead: ['getDescription'],
    rankWrite: ['updateDescription', 'setDescription'],
    yoastWrite(dispatch, value) {
      if (typeof dispatch.updateData === 'function') {
        dispatch.updateData({ description: value });
        return true;
      }
      if (typeof dispatch.setSnippetEditorDescription === 'function') {
        dispatch.setSnippetEditorDescription(value);
        return true;
      }
      return false;
    },
  },
  {
    key: 'og_title',
    max: MAX_OG_TITLE_CHARS,
    inputs: ['yoast_wpseo_opengraph-title', 'rank_math_facebook_title'],
    names: [
      'yoast_wpseo_opengraph-title',
      'rank_math_facebook_title',
      'aioseo[posts][og_title]',
    ],
    meta: [
      '_yoast_wpseo_opengraph-title',
      'rank_math_facebook_title',
      '_aioseo_og_title',
    ],
    yoastRead: ['getFacebookTitle', 'getFacebookPreviewTitle'],
    rankRead: ['getFacebookTitle'],
    rankWrite: ['updateFacebookTitle', 'setFacebookTitle'],
    yoastWrite(dispatch, value) {
      if (typeof dispatch.setFacebookPreviewTitle === 'function') {
        dispatch.setFacebookPreviewTitle(value);
        return true;
      }
      if (typeof dispatch.setFacebookTitle === 'function') {
        dispatch.setFacebookTitle(value);
        return true;
      }
      return false;
    },
  },
  {
    key: 'og_description',
    max: MAX_OG_DESCRIPTION_CHARS,
    inputs: ['yoast_wpseo_opengraph-description', 'rank_math_facebook_description'],
    names: [
      'yoast_wpseo_opengraph-description',
      'rank_math_facebook_description',
      'aioseo[posts][og_description]',
    ],
    meta: [
      '_yoast_wpseo_opengraph-description',
      'rank_math_facebook_description',
      '_aioseo_og_description',
    ],
    yoastRead: ['getFacebookDescription', 'getFacebookPreviewDescription'],
    rankRead: ['getFacebookDescription'],
    rankWrite: ['updateFacebookDescription', 'setFacebookDescription'],
    yoastWrite(dispatch, value) {
      if (typeof dispatch.setFacebookPreviewDescription === 'function') {
        dispatch.setFacebookPreviewDescription(value);
        return true;
      }
      if (typeof dispatch.setFacebookDescription === 'function') {
        dispatch.setFacebookDescription(value);
        return true;
      }
      return false;
    },
  },
];

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
    const canApplyBlocks = typeof editorDispatch?.resetEditorBlocks === 'function'
      || typeof blockDispatch?.resetBlocks === 'function';
    return !!(
      select
      && typeof select.getEditedPostContent === 'function'
      && typeof select.getEditedPostAttribute === 'function'
      && typeof editorDispatch?.editPost === 'function'
      && canApplyBlocks
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
  const core = editorType === 'gutenberg'
    ? (() => {
      const editor = window.wp.data.select('core/editor');
      return {
        title: String(editor.getEditedPostAttribute('title') || ''),
        content: String(editor.getEditedPostContent() || ''),
        excerpt: String(editor.getEditedPostAttribute('excerpt') || ''),
        editor_type: 'gutenberg',
      };
    })()
    : {
      title: fieldValue('title'),
      content: classicContent(),
      excerpt: fieldValue('excerpt'),
      editor_type: 'classic',
    };

  return truncateSnapshot({
    ...core,
    ...readSeoSnapshot(),
  });
}

function truncateSnapshot(snapshot) {
  return {
    title: snapshot.title.slice(0, MAX_TITLE_CHARS),
    content: snapshot.content.slice(0, MAX_ARTICLE_CHARS),
    excerpt: snapshot.excerpt.slice(0, MAX_EXCERPT_CHARS),
    seo_title: String(snapshot.seo_title || '').slice(0, MAX_SEO_TITLE_CHARS),
    seo_description: String(snapshot.seo_description || '').slice(0, MAX_SEO_DESCRIPTION_CHARS),
    og_title: String(snapshot.og_title || '').slice(0, MAX_OG_TITLE_CHARS),
    og_description: String(snapshot.og_description || '').slice(0, MAX_OG_DESCRIPTION_CHARS),
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

  const applied = editorType === 'gutenberg'
    ? applyGutenberg(edits)
    : applyClassic(edits);
  applied.push(...applySeoFields(edits));
  return applied;
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
  for (const field of SEO_FIELDS) {
    if (typeof raw[field.key] === 'string' && raw[field.key].trim() !== '') {
      edits[field.key] = raw[field.key].trim().slice(0, field.max);
    }
  }
  return edits;
}

function stripScripts(html) {
  return html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
}

function applyGutenberg(edits) {
  const applied = [];
  const editorDispatch = window.wp.data.dispatch('core/editor');
  const meta = {};

  if (edits.title) meta.title = edits.title;
  if (edits.excerpt) meta.excerpt = edits.excerpt;

  if (edits.content) {
    const blocks = htmlToBlocks(edits.content);
    if (!blocks.length) {
      throw new Error('Could not parse the updated body.');
    }
    const before = editedPostContent();
    try {
      applyGutenbergBlocks(editorDispatch, blocks);
    } catch (err) {
      if (editedPostContent() === before) throw err;
    }
    applied.push('body');
    if (typeof editorDispatch.resetEditorBlocks !== 'function') {
      meta.blocks = blocks;
    }
  }

  if (Object.keys(meta).length > 0) {
    try {
      editorDispatch.editPost(meta);
      if (meta.title) applied.push('title');
      if (meta.excerpt) applied.push('excerpt');
    } catch (err) {
      if (applied.length === 0) throw err;
    }
  }

  return applied;
}

function editedPostContent() {
  try {
    return String(
      window.wp.data.select('core/editor').getEditedPostContent() || '',
    );
  } catch {
    return '';
  }
}

function applyGutenbergBlocks(editorDispatch, blocks) {
  if (typeof editorDispatch.resetEditorBlocks === 'function') {
    editorDispatch.resetEditorBlocks(blocks);
    return;
  }
  window.wp.data.dispatch('core/block-editor').resetBlocks(blocks);
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
      markTinyMceDirty(editor);
    } else {
      const textarea = document.getElementById('content');
      if (!textarea) throw new Error('Could not find the body field.');
      setFieldValue(textarea, edits.content);
    }
    applied.push('body');
  }

  try {
    window.tinymce?.triggerSave?.();
  } catch {
    // Syncing TinyMCE back to the textarea is best-effort.
  }

  return applied;
}

function markTinyMceDirty(editor) {
  try {
    editor.undoManager?.add?.();
    if (typeof editor.setDirty === 'function') {
      editor.setDirty(true);
    } else {
      editor.isNotDirty = false;
    }
    editor.fire?.('change');
    editor.nodeChanged?.();
    editor.save?.();
  } catch {
    // TinyMCE/WordPress change handlers must not fail a successful setContent.
  }
  const textarea = document.getElementById('content');
  if (textarea) {
    dispatchFieldEvents(textarea);
  }
}

function readSeoSnapshot() {
  const snapshot = {};
  for (const field of SEO_FIELDS) {
    snapshot[field.key] = readSeoField(field);
  }
  return snapshot;
}

function applySeoFields(edits) {
  const applied = [];
  for (const field of SEO_FIELDS) {
    if (!edits[field.key]) continue;
    if (writeSeoField(field, edits[field.key])) applied.push(field.key);
  }
  return applied;
}

function readSeoField(field) {
  const yoast = storeSelect('yoast-seo/editor');
  if (yoast) {
    for (const method of field.yoastRead || []) {
      const value = callStoreReader(yoast, method);
      if (value) return value;
    }
    if (field.yoastSnippetKey && typeof yoast.getSnippetEditorData === 'function') {
      const data = yoast.getSnippetEditorData() || {};
      const value = String(data[field.yoastSnippetKey] || '').trim();
      if (value) return value;
    }
  }

  const rank = storeSelect('rank-math');
  if (rank) {
    for (const method of field.rankRead || []) {
      const value = callStoreReader(rank, method);
      if (value) return value;
    }
  }

  const meta = editedPostMeta();
  for (const key of field.meta || []) {
    const value = String(meta[key] || '').trim();
    if (value) return value;
  }

  const el = findSeoControl(field);
  return el ? String(el.value || '').trim() : '';
}

function writeSeoField(field, value) {
  let applied = false;
  const yoast = storeDispatch('yoast-seo/editor');
  if (yoast && typeof field.yoastWrite === 'function') {
    try {
      if (field.yoastWrite(yoast, value)) applied = true;
    } catch {
      // Yoast store methods vary by version.
    }
  }

  const rank = storeDispatch('rank-math');
  if (rank) {
    for (const method of field.rankWrite || []) {
      if (typeof rank[method] === 'function') {
        try {
          rank[method](value);
          applied = true;
          break;
        } catch {
          // Rank Math store methods vary by version.
        }
      }
    }
  }

  if (writePostMeta(field.meta, value)) applied = true;

  const el = findSeoControl(field);
  if (el) {
    setFieldValue(el, value);
    applied = true;
  }

  return applied;
}

function storeSelect(name) {
  try {
    return window.wp?.data?.select?.(name) || null;
  } catch {
    return null;
  }
}

function storeDispatch(name) {
  try {
    return window.wp?.data?.dispatch?.(name) || null;
  } catch {
    return null;
  }
}

function callStoreReader(store, method) {
  if (typeof store[method] !== 'function') return '';
  try {
    return String(store[method]() || '').trim();
  } catch {
    return '';
  }
}

function editedPostMeta() {
  try {
    const meta = window.wp?.data?.select?.('core/editor')?.getEditedPostAttribute?.('meta');
    return meta && typeof meta === 'object' ? meta : {};
  } catch {
    return {};
  }
}

function writePostMeta(keys, value) {
  if (!keys?.length) return false;
  const editorDispatch = storeDispatch('core/editor');
  if (typeof editorDispatch?.editPost !== 'function') return false;

  const current = editedPostMeta();
  const payload = {};
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(current, key)) {
      payload[key] = value;
    }
  }
  if (Object.keys(payload).length === 0) return false;

  try {
    editorDispatch.editPost({ meta: payload });
    return true;
  } catch {
    return false;
  }
}

function findSeoControl(field) {
  const keys = [...(field.inputs || []), ...(field.names || [])];
  for (const key of keys) {
    const el = document.getElementById(key)
      || document.querySelector(`[name="${cssEscapeAttr(key)}"]`);
    if (el && 'value' in el) return el;
  }
  return null;
}

function cssEscapeAttr(value) {
  return String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function setFieldValue(el, value) {
  const proto = el.tagName === 'TEXTAREA'
    ? HTMLTextAreaElement.prototype
    : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
  if (setter) setter.call(el, value);
  else el.value = value;
  dispatchFieldEvents(el);
}

function dispatchFieldEvents(el) {
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
  try {
    window.jQuery?.(el)?.trigger('input')?.trigger('change');
  } catch {
    // jQuery/WordPress listeners must not fail a successful field write.
  }
}
