const COMMAND_EVENT = 'wpv-editor';
const RESULT_EVENT = 'wpv-editor-result';
const MAX_TITLE_CHARS = 500;
const MAX_EXCERPT_CHARS = 2000;
const MAX_ARTICLE_CHARS = 20000;
const MAX_SEO_TITLE_CHARS = 200;
const MAX_SEO_DESCRIPTION_CHARS = 500;
const MAX_OG_TITLE_CHARS = 200;
const MAX_OG_DESCRIPTION_CHARS = 500;
const MAX_FOCUS_KEYPHRASE_CHARS = 200;
const MAX_SELECTION_CHARS = 8000;

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
  {
    key: 'focus_keyphrase',
    max: MAX_FOCUS_KEYPHRASE_CHARS,
    inputs: ['yoast_wpseo_focuskw', 'rank_math_focus_keyword'],
    names: [
      'yoast_wpseo_focuskw',
      'rank_math_focus_keyword',
      'aioseo[posts][keyphrases][focus][keyphrase]',
    ],
    meta: [
      '_yoast_wpseo_focuskw',
      'rank_math_focus_keyword',
      '_aioseo_focus_keyphrase',
    ],
    yoastRead: ['getFocusKeyphrase', 'getKeyphrase', 'getFocusKeyword'],
    rankRead: ['getFocusKeyword', 'getKeywords'],
    rankWrite: ['updateKeyword', 'setFocusKeyword', 'setKeywords'],
    yoastWrite(dispatch, value) {
      if (typeof dispatch.setFocusKeyword === 'function') {
        dispatch.setFocusKeyword(value);
        return true;
      }
      if (typeof dispatch.updateData === 'function') {
        dispatch.updateData({ keyword: value, focusKeyphrase: value });
        return true;
      }
      return false;
    },
  },
];

const ACF_TEXT_TYPES = new Set(['text', 'textarea', 'wysiwyg', 'url', 'email', 'number']);
const ACF_SEMANTIC_KEYS = [
  'title',
  'excerpt',
  'seo_title',
  'seo_description',
  'og_title',
  'og_description',
  'focus_keyphrase',
];
const ACF_ALIASES = {
  title: [
    'short_headline',
    'short_title',
    'display_title',
    'override_title',
    'alternative_title',
    'alt_title',
    'seo_headline',
  ],
  excerpt: [
    'excerpt',
    'standfirst',
    'stand_first',
    'dek',
    'deck',
    'lede',
    'lead',
    'summary',
    'short_description',
    'intro',
    'strapline',
    'kicker',
    'sell',
    'sell_text',
    'description',
  ],
  content: ['body', 'article_body', 'main_content', 'post_content', 'article_content'],
  seo_title: ['seo_title', 'seotitle', 'meta_title', 'metatitle'],
  seo_description: [
    'seo_description',
    'seodescription',
    'meta_description',
    'metadescription',
    'metadesc',
    'meta_desc',
  ],
  og_title: [
    'og_title',
    'ogtitle',
    'open_graph_title',
    'opengraph_title',
    'facebook_title',
    'social_title',
  ],
  og_description: [
    'og_description',
    'ogdescription',
    'open_graph_description',
    'opengraph_description',
    'facebook_description',
    'social_description',
  ],
  focus_keyphrase: [
    'focus_keyphrase',
    'focus_keyword',
    'focuskw',
    'keyphrase',
    'keyword',
  ],
};
const ACF_LABEL_ALIASES = {
  title: ['short headline', 'short title', 'display title', 'override title'],
  excerpt: [
    'excerpt',
    'standfirst',
    'stand first',
    'dek',
    'deck',
    'lede',
    'strapline',
    'kicker',
    'sell',
  ],
  content: ['article body', 'main content', 'post content'],
  seo_title: ['seo title', 'meta title'],
  seo_description: ['seo description', 'meta description'],
  og_title: ['og title', 'open graph title', 'facebook title', 'social title'],
  og_description: [
    'og description',
    'open graph description',
    'facebook description',
    'social description',
  ],
  focus_keyphrase: ['focus keyphrase', 'focus keyword', 'keyphrase'],
};
const ACF_GENERIC_DATA_KEYS = new Set([
  'description',
  'title',
  'text',
  'content',
  'body',
  'html',
  'copy',
]);
const ACF_BLOCK_TEXT_KEYS = new Set([
  'text',
  'content',
  'body',
  'copy',
  'html',
  'standfirst',
  'excerpt',
  'description',
  'title',
  'headline',
  'intro',
]);

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
        applied: await applyEdits(editorType, detail.edits),
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

  return truncateSnapshot(fillEmptyFromAcf({
    ...core,
    ...readSeoSnapshot(),
    selection: takeSelection(editorType),
  }));
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
    focus_keyphrase: String(snapshot.focus_keyphrase || '').slice(0, MAX_FOCUS_KEYPHRASE_CHARS),
    selection: truncateSelection(snapshot.selection),
    editor_type: snapshot.editor_type,
  };
}

function emptySelection() {
  return { html: '', text: '', client_ids: [] };
}

function truncateSelection(raw) {
  if (!raw || typeof raw !== 'object') return emptySelection();
  const clientIds = Array.isArray(raw.client_ids)
    ? raw.client_ids.filter((id) => typeof id === 'string' && id !== '').slice(0, 20)
    : [];
  return {
    html: String(raw.html || '').slice(0, MAX_SELECTION_CHARS),
    text: String(raw.text || '').slice(0, MAX_SELECTION_CHARS),
    client_ids: clientIds,
  };
}

function takeSelection(editorType) {
  return editorType === 'gutenberg' ? gutenbergSelection() : classicSelection();
}

function gutenbergClientIds() {
  try {
    const select = window.wp.data.select('core/block-editor');
    if (typeof select.getSelectedBlockClientIds === 'function') {
      const ids = select.getSelectedBlockClientIds() || [];
      if (ids.length) return ids.map(String);
    }
    if (typeof select.getMultiSelectedBlockClientIds === 'function') {
      const ids = select.getMultiSelectedBlockClientIds() || [];
      if (ids.length) return ids.map(String);
    }
    const selected = typeof select.getSelectedBlock === 'function'
      ? select.getSelectedBlock()
      : null;
    return selected?.clientId ? [String(selected.clientId)] : [];
  } catch {
    return [];
  }
}

function gutenbergSelection() {
  try {
    const ids = gutenbergClientIds();
    if (!ids.length) return emptySelection();
    const select = window.wp.data.select('core/block-editor');
    const blocks = ids.map((id) => select.getBlock?.(id)).filter(Boolean);
    if (!blocks.length) return emptySelection();
    if (ids.length === 1) {
      const acfText = acfBlockPlainText(blocks[0]);
      if (acfText) {
        return truncateSelection({
          html: acfText,
          text: plainTextFromHtml(acfText),
          client_ids: ids,
        });
      }
    }
    const html = typeof window.wp.blocks.serialize === 'function'
      ? String(window.wp.blocks.serialize(blocks) || '')
      : '';
    return truncateSelection({
      html,
      text: plainTextFromHtml(html),
      client_ids: ids,
    });
  } catch {
    return emptySelection();
  }
}

function classicSelection() {
  try {
    const editor = window.tinymce?.get?.('content');
    if (editor && typeof editor.selection?.getContent === 'function'
      && (typeof editor.isHidden !== 'function' || !editor.isHidden())) {
      const html = String(editor.selection.getContent() || '');
      const text = String(editor.selection.getContent({ format: 'text' }) || '');
      return truncateSelection({ html, text, client_ids: [] });
    }
    const textarea = document.getElementById('content');
    if (!textarea || typeof textarea.selectionStart !== 'number') return emptySelection();
    const selected = textarea.value.slice(textarea.selectionStart, textarea.selectionEnd);
    return truncateSelection({ html: selected, text: selected, client_ids: [] });
  } catch {
    return emptySelection();
  }
}

function plainTextFromHtml(html) {
  return String(html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
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

async function applyEdits(editorType, rawEdits) {
  const edits = normaliseEdits(rawEdits);
  if (Object.keys(edits).length === 0) return [];

  await waitForAcfFields();

  const applied = editorType === 'gutenberg'
    ? applyGutenberg(edits)
    : applyClassic(edits);
  applied.push(...applySeoFields(edits));
  applied.push(...applyAcfFields(edits, applied));
  return [...new Set(applied)];
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
  if (typeof raw.selection === 'string' && raw.selection.trim() !== '') {
    edits.selection = stripScripts(raw.selection).trim().slice(0, MAX_SELECTION_CHARS);
  }
  if (Array.isArray(raw.selection_client_ids)) {
    edits.selection_client_ids = raw.selection_client_ids
      .filter((id) => typeof id === 'string' && id !== '')
      .slice(0, 20);
  }
  if (typeof raw.selection_original === 'string' && raw.selection_original.trim() !== '') {
    edits.selection_original = raw.selection_original.trim().slice(0, MAX_SELECTION_CHARS);
  }
  for (const field of SEO_FIELDS) {
    if (typeof raw[field.key] === 'string' && raw[field.key].trim() !== '') {
      edits[field.key] = raw[field.key].trim().slice(0, field.max);
    }
  }
  for (const key of clearableKeys(raw.clear)) {
    if (!(key in edits)) edits[key] = '';
  }
  return edits;
}

/** Keys the overlay may blank on undo. Body and selection are never cleared. */
function clearableKeys(raw) {
  if (!Array.isArray(raw)) return [];
  const allowed = ['title', 'excerpt', ...SEO_FIELDS.map((field) => field.key)];
  return raw.filter((key) => typeof key === 'string' && allowed.includes(key));
}

function stripScripts(html) {
  return html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
}

function applyGutenberg(edits) {
  const applied = [];
  const editorDispatch = window.wp.data.dispatch('core/editor');
  const meta = {};

  if ('title' in edits) meta.title = edits.title;
  if ('excerpt' in edits) meta.excerpt = edits.excerpt;

  if (edits.selection) {
    applied.push(...applyGutenbergSelection(edits));
  } else if (edits.content) {
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
      if ('title' in meta) applied.push('title');
      if ('excerpt' in meta) applied.push('excerpt');
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

function applyGutenbergSelection(edits) {
  const ids = Array.isArray(edits.selection_client_ids) && edits.selection_client_ids.length
    ? edits.selection_client_ids
    : gutenbergClientIds();
  if (ids.length === 1) {
    const selected = storeSelect('core/block-editor')?.getBlock?.(ids[0]);
    if (applyAcfBlockSelection(selected, edits.selection, edits.selection_original)) {
      return ['selection'];
    }
  }

  const blocks = htmlToBlocks(edits.selection);
  if (!blocks.length) {
    throw new Error('Could not parse the selected copy.');
  }
  if (!ids.length) {
    throw new Error('No selected block to update.');
  }
  const blockEditor = window.wp.data.dispatch('core/block-editor');
  const before = editedPostContent();
  try {
    if (typeof blockEditor.replaceBlocks === 'function') {
      blockEditor.replaceBlocks(ids, blocks);
    } else if (ids.length === 1 && typeof blockEditor.replaceBlock === 'function') {
      blockEditor.replaceBlock(ids[0], blocks[0]);
    } else {
      throw new Error('Could not replace the selected block.');
    }
  } catch (err) {
    if (editedPostContent() === before) throw err;
  }
  return ['selection'];
}

function applyClassic(edits) {
  const applied = [];

  if ('title' in edits) {
    const title = document.getElementById('title');
    if (!title) throw new Error('Could not find the title field.');
    setFieldValue(title, edits.title);
    applied.push('title');
  }

  if ('excerpt' in edits) {
    const excerpt = document.getElementById('excerpt');
    if (excerpt) {
      setFieldValue(excerpt, edits.excerpt);
      applied.push('excerpt');
    }
  }

  if (edits.selection) {
    applied.push(...applyClassicSelection(edits));
  } else if (edits.content) {
    const editor = window.tinymce?.get?.('content');
    if (editor && typeof editor.setContent === 'function'
      && (typeof editor.isHidden !== 'function' || !editor.isHidden())) {
      editor.setContent(edits.content);
      markTinyMceDirty(editor);
      applied.push('body');
    } else {
      const textarea = document.getElementById('content');
      if (textarea) {
        setFieldValue(textarea, edits.content);
        applied.push('body');
      }
    }
  }

  try {
    window.tinymce?.triggerSave?.();
  } catch {
    // Syncing TinyMCE back to the textarea is best-effort.
  }

  return applied;
}

function applyClassicSelection(edits) {
  const html = edits.selection;
  const editor = window.tinymce?.get?.('content');
  if (editor && typeof editor.selection?.setContent === 'function'
    && (typeof editor.isHidden !== 'function' || !editor.isHidden())) {
    const selected = String(editor.selection.getContent() || '');
    if (selected.trim() !== '') {
      editor.selection.setContent(html);
    } else if (!replaceClassicHtml(editor, edits.selection_original, html)) {
      throw new Error('No selected text to update.');
    }
    markTinyMceDirty(editor);
    return ['selection'];
  }

  const textarea = document.getElementById('content');
  if (!textarea) throw new Error('Could not find the body field.');
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  if (typeof start === 'number' && typeof end === 'number' && start !== end) {
    setFieldValue(textarea, textarea.value.slice(0, start) + html + textarea.value.slice(end));
    return ['selection'];
  }
  const original = typeof edits.selection_original === 'string' ? edits.selection_original : '';
  if (original) {
    const idx = textarea.value.indexOf(original);
    if (idx !== -1) {
      setFieldValue(
        textarea,
        textarea.value.slice(0, idx) + html + textarea.value.slice(idx + original.length),
      );
      return ['selection'];
    }
  }
  throw new Error('No selected text to update.');
}

function replaceClassicHtml(editor, original, html) {
  if (typeof original !== 'string' || original.trim() === '') return false;
  const content = String(editor.getContent() || '');
  const idx = content.indexOf(original);
  if (idx === -1) return false;
  editor.setContent(content.slice(0, idx) + html + content.slice(idx + original.length));
  return true;
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
    if (!(field.key in edits)) continue;
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
    const value = store[method]();
    if (Array.isArray(value)) {
      return String(value.find((item) => typeof item === 'string' && item.trim() !== '') || '').trim();
    }
    return String(value || '').trim();
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

async function waitForAcfFields(timeoutMs = 1200) {
  if (!window.acf && !document.querySelector('.acf-field, #acf-form-data')) return;
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (listAcfFields().length > 0) return;
    await sleep(50);
  }
}

function fillEmptyFromAcf(snapshot) {
  const acf = readAcfSemanticSnapshot();
  const next = { ...snapshot };
  for (const key of ACF_SEMANTIC_KEYS) {
    if (!String(next[key] || '').trim() && acf[key]) next[key] = acf[key];
  }
  return next;
}

function readAcfSemanticSnapshot() {
  const snapshot = {};
  for (const field of listAcfFields()) {
    const semantic = semanticForAcfField(field);
    if (!semantic || snapshot[semantic]) continue;
    const value = readAcfField(field);
    if (value) snapshot[semantic] = value;
  }
  Object.assign(snapshot, readAcfBlockSnapshot(snapshot));
  return snapshot;
}

function applyAcfFields(edits, alreadyApplied) {
  const applied = [];
  const fields = listAcfFields();
  for (const key of ACF_SEMANTIC_KEYS) {
    if (!(key in edits)) continue;
    if (!writeAcfSemantic(fields, key, edits[key])) continue;
    if (!alreadyApplied.includes(key) && !applied.includes(key)) applied.push(key);
  }
  if (edits.content && !alreadyApplied.includes('body')) {
    if (writeAcfSemantic(fields, 'content', edits.content) && !applied.includes('body')) {
      applied.push('body');
    }
  }
  for (const key of applyAcfBlocks(edits)) {
    if (!alreadyApplied.includes(key) && !applied.includes(key)) applied.push(key);
  }
  return applied;
}

function writeAcfSemantic(fields, semantic, value) {
  let applied = false;
  for (const field of fields) {
    if (semanticForAcfField(field) !== semantic) continue;
    if (writeAcfField(field, value)) applied = true;
  }
  return applied;
}

function listAcfFields() {
  const fromApi = listAcfFieldsFromApi();
  return fromApi.length ? fromApi : listAcfFieldsFromDom();
}

function listAcfFieldsFromApi() {
  if (typeof window.acf?.getFields !== 'function') return [];
  const seen = new Set();
  const fields = [];
  for (const type of ACF_TEXT_TYPES) {
    let instances = [];
    try {
      instances = window.acf.getFields({ type }) || [];
    } catch {
      continue;
    }
    for (const instance of instances) {
      const el = jqueryEl(instance?.$el);
      if (el && isNestedAcfField(el)) continue;
      const name = String(instance.get?.('name') || instance.data?.name || '');
      const key = String(instance.get?.('key') || instance.data?.key || '');
      const fieldType = String(instance.get?.('type') || instance.data?.type || type);
      const id = key || name;
      if (!id || seen.has(id)) continue;
      seen.add(id);
      fields.push({
        instance,
        el,
        name,
        key,
        type: fieldType,
        label: acfDomLabel(el) || name,
      });
    }
  }
  return fields;
}

function listAcfFieldsFromDom() {
  const fields = [];
  const seen = new Set();
  for (const el of document.querySelectorAll('.acf-field[data-name], .acf-field[data-key]')) {
    if (isNestedAcfField(el)) continue;
    const type = String(el.getAttribute('data-type') || '');
    if (type && !ACF_TEXT_TYPES.has(type)) continue;
    const name = String(el.getAttribute('data-name') || '');
    const key = String(el.getAttribute('data-key') || '');
    const id = key || name;
    if (!id || seen.has(id)) continue;
    seen.add(id);
    fields.push({
      el,
      name,
      key,
      type: type || 'text',
      label: acfDomLabel(el) || name,
    });
  }
  return fields;
}

function isNestedAcfField(el) {
  return !!el.closest(
    '.acf-clone, .acf-row, .layout, .acf-block-component, .acf-block-fields, .acf-block-preview, .block-editor-block-list__block',
  );
}

function jqueryEl(value) {
  if (!value) return null;
  if (value instanceof Element) return value;
  if (value[0] instanceof Element) return value[0];
  return null;
}

function acfDomLabel(el) {
  if (!(el instanceof Element)) return '';
  const label = el.querySelector('.acf-label label, .acf-label');
  return String(label?.textContent || '').replace(/\s+/g, ' ').trim();
}

function normaliseAcfToken(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/&amp;/g, 'and')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}

function semanticForAcfField(field) {
  const name = normaliseAcfToken(field.name);
  const label = String(field.label || '').toLowerCase().replace(/\s+/g, ' ').trim();
  for (const semantic of [...ACF_SEMANTIC_KEYS, 'content']) {
    if ((ACF_ALIASES[semantic] || []).includes(name)) return semantic;
    if ((ACF_LABEL_ALIASES[semantic] || []).some((alias) => label === alias || label.startsWith(`${alias} `))) {
      return semantic;
    }
  }
  return '';
}

function readAcfField(field) {
  if (field.instance && typeof field.instance.val === 'function') {
    try {
      const value = field.instance.val();
      if (typeof value === 'string' && value.trim()) return value.trim();
    } catch {
      // Field type readers vary by ACF version.
    }
  }
  const fromStore = readAcfDatastore(field);
  if (fromStore) return fromStore;
  const input = acfInputEl(field);
  if (!input) return '';
  if (field.type === 'wysiwyg' || input.classList.contains('wp-editor-area')) {
    const editor = window.tinymce?.get?.(input.id);
    if (editor && typeof editor.getContent === 'function'
      && (typeof editor.isHidden !== 'function' || !editor.isHidden())) {
      return String(editor.getContent() || '').trim();
    }
  }
  return String(input.value || '').trim();
}

function writeAcfField(field, rawValue) {
  const value = field.type === 'wysiwyg'
    ? stripScripts(rawValue)
    : plainTextFromHtml(rawValue);
  let applied = writeAcfDatastore(field, value);

  if (field.instance && typeof field.instance.val === 'function') {
    try {
      field.instance.val(value);
      applied = true;
    } catch {
      // Some ACF field types reject programmatic val().
    }
  }

  const input = acfInputEl(field);
  if (input) {
    if (field.type === 'wysiwyg' || input.classList.contains('wp-editor-area')) {
      applied = writeAcfTinyMce(input, value) || applied;
    }
    setFieldValue(input, value);
    applied = true;
  }

  if (field.name) writePostMeta([field.name], value);
  if (field.key) writePostMeta([field.key], value);
  try {
    window.acf?.doAction?.('change', field.instance?.$el || window.jQuery?.(field.el));
  } catch {
    // ACF change actions are best-effort dirty marking.
  }
  return applied;
}

function acfInputEl(field) {
  const root = field.el instanceof Element ? field.el : jqueryEl(field.instance?.$el);
  if (!(root instanceof Element)) return null;
  return root.querySelector(
    'textarea.wp-editor-area, textarea[name^="acf["], input[name^="acf["], textarea, input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"]):not([type="file"])',
  );
}

function writeAcfTinyMce(textarea, value) {
  const id = textarea?.id;
  if (!id) return false;
  try {
    const editor = window.tinymce?.get?.(id);
    if (!editor || typeof editor.setContent !== 'function') return false;
    if (typeof editor.isHidden === 'function' && editor.isHidden()) return false;
    editor.setContent(value);
    try {
      editor.undoManager?.add?.();
      if (typeof editor.setDirty === 'function') editor.setDirty(true);
      else editor.isNotDirty = false;
      editor.fire?.('change');
      editor.save?.();
    } catch {
      // TinyMCE dirty-marking must not fail a successful setContent.
    }
    return true;
  } catch {
    return false;
  }
}

function readAcfDatastore(field) {
  const select = storeSelect('acf/fields');
  if (!select) return '';
  for (const id of [field.name, field.key]) {
    if (!id) continue;
    try {
      if (typeof select.getFieldValue === 'function') {
        const value = String(select.getFieldValue(id) || '').trim();
        if (value) return value;
      }
    } catch {
      // Datastore method names vary by ACF version.
    }
  }
  return '';
}

function writeAcfDatastore(field, value) {
  const dispatch = storeDispatch('acf/fields');
  for (const id of [field.name, field.key]) {
    if (!id || typeof dispatch?.setFieldValue !== 'function') continue;
    try {
      dispatch.setFieldValue(id, value);
      return true;
    } catch {
      // Datastore writes vary by ACF version.
    }
  }
  if (typeof window.acf?.store?.set === 'function') {
    try {
      window.acf.store.set(field.key || field.name, value);
      return true;
    } catch {
      return false;
    }
  }
  return false;
}

function gutenbergBlocks() {
  try {
    return storeSelect('core/block-editor')?.getBlocks?.() || [];
  } catch {
    return [];
  }
}

function flattenBlocks(blocks) {
  const out = [];
  for (const block of blocks || []) {
    out.push(block);
    if (block.innerBlocks?.length) out.push(...flattenBlocks(block.innerBlocks));
  }
  return out;
}

function isAcfBlock(block) {
  return !!block && String(block.name || '').startsWith('acf/');
}

function acfBlockSlug(block) {
  return String(block?.name || '').replace(/^acf\//, '');
}

function acfBlockData(block) {
  const data = block?.attributes?.data;
  return data && typeof data === 'object' && !Array.isArray(data) ? data : null;
}

function acfDataKeys(data) {
  return Object.keys(data || {}).filter((key) => !key.startsWith('_') && typeof data[key] === 'string');
}

function pickAcfDataKey(data, semantic, { allowGeneric = false } = {}) {
  const aliases = ACF_ALIASES[semantic] || [];
  const keys = acfDataKeys(data);
  const specific = keys.find((key) => {
    const token = normaliseAcfToken(key);
    return aliases.includes(token) && !ACF_GENERIC_DATA_KEYS.has(token);
  });
  if (specific) return specific;
  if (!allowGeneric) return null;
  const aliased = keys.find((key) => aliases.includes(normaliseAcfToken(key)));
  if (aliased) return aliased;
  return keys.find((key) => ACF_BLOCK_TEXT_KEYS.has(normaliseAcfToken(key))) || null;
}

function acfBlockPlainText(block) {
  if (!isAcfBlock(block)) return '';
  const data = acfBlockData(block);
  if (!data) return '';
  const keys = acfDataKeys(data).filter((key) => String(data[key] || '').trim());
  if (!keys.length) return '';
  const preferred = keys.find((key) => ACF_BLOCK_TEXT_KEYS.has(normaliseAcfToken(key)));
  if (preferred) return String(data[preferred]).trim();
  if (keys.length === 1) return String(data[keys[0]]).trim();
  return '';
}

function applyAcfBlockSelection(block, html, original) {
  if (!isAcfBlock(block)) return false;
  const data = acfBlockData(block);
  if (!data) return false;
  const keys = acfDataKeys(data);
  if (!keys.length) return false;

  const originalText = String(original || '').trim();
  let target = originalText
    ? keys.find((key) => String(data[key] || '').trim() === originalText)
    : null;
  if (!target && keys.length === 1) target = keys[0];
  if (!target) {
    target = keys.find((key) => ACF_BLOCK_TEXT_KEYS.has(normaliseAcfToken(key)));
  }
  if (!target) return false;

  const value = stripScripts(html);
  storeDispatch('core/block-editor')?.updateBlockAttributes?.(block.clientId, {
    data: { ...data, [target]: value },
  });
  return true;
}

function readAcfBlockSnapshot(existing) {
  const snapshot = {};
  for (const block of flattenBlocks(gutenbergBlocks())) {
    if (!isAcfBlock(block)) continue;
    const data = acfBlockData(block);
    if (!data) continue;
    const slug = normaliseAcfToken(acfBlockSlug(block));
    for (const semantic of ACF_SEMANTIC_KEYS) {
      if (existing[semantic] || snapshot[semantic]) continue;
      if (!(ACF_ALIASES[semantic] || []).includes(slug)) continue;
      const key = pickAcfDataKey(data, semantic, { allowGeneric: true });
      const value = key ? String(data[key] || '').trim() : '';
      if (value) snapshot[semantic] = value;
    }
  }
  return snapshot;
}

function applyAcfBlocks(edits) {
  const applied = [];
  const dispatch = storeDispatch('core/block-editor');
  if (typeof dispatch?.updateBlockAttributes !== 'function') return applied;

  for (const block of flattenBlocks(gutenbergBlocks())) {
    if (!isAcfBlock(block)) continue;
    const data = acfBlockData(block);
    if (!data) continue;
    const slug = normaliseAcfToken(acfBlockSlug(block));
    const next = { ...data };
    let changed = false;

    for (const semantic of ACF_SEMANTIC_KEYS) {
      if (!(semantic in edits)) continue;
      const slugMatches = (ACF_ALIASES[semantic] || []).includes(slug);
      const key = pickAcfDataKey(data, semantic, { allowGeneric: slugMatches });
      if (!key) continue;
      const value = semantic === 'excerpt' || semantic === 'title'
        ? plainTextFromHtml(edits[semantic])
        : edits[semantic];
      if (next[key] === value) continue;
      next[key] = value;
      changed = true;
      if (!applied.includes(semantic)) applied.push(semantic);
    }

    if (changed) {
      dispatch.updateBlockAttributes(block.clientId, { data: next });
    }
  }
  return applied;
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
