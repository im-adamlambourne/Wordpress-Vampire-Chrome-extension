/**
 * Which editor fields the plugin may snapshot and apply, by WordPress post_type.
 * Overlay actions stay the same on every type; this only gates the draft fields.
 *
 * `post` and any unlisted type share today's article fields.
 * `sxs-recipe` adds method_steps (ACF flexible method). Internal links search
 * those steps.
 * `list` adds list_items (ACF flexible list; editorial comments only).
 * Internal links search those comments.
 *
 * Installed on `globalThis` and `window` so the isolated overlay and service
 * worker can call the same helpers. MAIN-world files do not share a lexical
 * scope — a bare `function` here is invisible to `editor-bridge.js`. That file
 * also keeps local fallbacks, because this assignment does not always land on
 * the page `window` the bridge reads.
 */
(function installPostTypeFields(global) {
  const RECIPE_POST_TYPE = 'sxs-recipe';
  const LIST_POST_TYPE = 'list';
  const MAX_METHOD_STEPS = 30;
  const MAX_METHOD_STEP_CHARS = 2000;
  const MAX_METHOD_STEPS_CHARS = 20000;
  const METHOD_STEP_KINDS = ['heading', 'step'];
  const MAX_LIST_ITEMS = 40;
  const MAX_LIST_ITEM_CHARS = 4000;
  const MAX_LIST_ITEMS_CHARS = 40000;
  const LIST_ITEM_KIND = 'item';
  const POST_TYPE_CORE_FIELDS = Object.freeze([
    'title',
    'content',
    'selection',
    'excerpt',
    'seo_title',
    'seo_description',
    'og_title',
    'og_description',
    'focus_keyphrase',
  ]);

  function postTypeAllowsMethodSteps(postType) {
    return String(postType || '') === RECIPE_POST_TYPE;
  }

  function postTypeAllowsListItems(postType) {
    return String(postType || '') === LIST_POST_TYPE;
  }

  function fieldsForPostType(postType) {
    const fields = POST_TYPE_CORE_FIELDS.slice();
    if (postTypeAllowsMethodSteps(postType)) fields.push('method_steps');
    if (postTypeAllowsListItems(postType)) fields.push('list_items');
    return fields;
  }

  function normaliseMethodSteps(raw) {
    if (!Array.isArray(raw)) return [];

    const steps = [];
    let budget = 0;
    for (const entry of raw) {
      if (steps.length >= MAX_METHOD_STEPS) break;
      if (!entry || typeof entry !== 'object' || Array.isArray(entry)) continue;
      const kind = String(entry.kind || '').trim();
      if (!METHOD_STEP_KINDS.includes(kind)) continue;
      const text = String(entry.text || '').trim().slice(0, MAX_METHOD_STEP_CHARS);
      if (text === '') continue;
      budget += text.length;
      if (budget > MAX_METHOD_STEPS_CHARS) break;
      steps.push({ kind, text });
    }
    return steps;
  }

  function normaliseListItems(raw) {
    if (!Array.isArray(raw)) return [];

    const items = [];
    let budget = 0;
    for (const entry of raw) {
      if (items.length >= MAX_LIST_ITEMS) break;
      if (!entry || typeof entry !== 'object' || Array.isArray(entry)) continue;
      const kind = String(entry.kind || '').trim();
      if (kind !== LIST_ITEM_KIND) continue;
      const text = String(entry.text || '').trim().slice(0, MAX_LIST_ITEM_CHARS);
      budget += text.length;
      if (budget > MAX_LIST_ITEMS_CHARS) break;
      items.push({ kind: LIST_ITEM_KIND, text });
    }
    return items;
  }

  function methodStepLinkTexts(steps) {
    return normaliseMethodSteps(steps)
      .filter((row) => row.kind === 'step')
      .map((row) => row.text);
  }

  function listItemLinkTexts(items) {
    return normaliseListItems(items)
      .map((row) => row.text)
      .filter(Boolean);
  }

  function linkHaystack(article) {
    if (postTypeAllowsMethodSteps(article?.post_type)) {
      return methodStepLinkTexts(article.method_steps).join('\n');
    }
    if (postTypeAllowsListItems(article?.post_type)) {
      return listItemLinkTexts(article.list_items).join('\n');
    }
    return String(article?.content || '');
  }

  function linksApplyToMethodSteps(postType) {
    return postTypeAllowsMethodSteps(postType);
  }

  function linksApplyToListItems(postType) {
    return postTypeAllowsListItems(postType);
  }

  const installed = {
    RECIPE_POST_TYPE,
    LIST_POST_TYPE,
    postTypeAllowsMethodSteps,
    postTypeAllowsListItems,
    fieldsForPostType,
    normaliseMethodSteps,
    normaliseListItems,
    methodStepLinkTexts,
    listItemLinkTexts,
    linkHaystack,
    linksApplyToMethodSteps,
    linksApplyToListItems,
  };
  const targets = [global];
  if (typeof window !== 'undefined' && window !== global) targets.push(window);
  for (const target of targets) {
    Object.assign(target, installed);
  }
}(typeof globalThis !== 'undefined' ? globalThis : self));
