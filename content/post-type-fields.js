/**
 * Which editor fields the plugin may snapshot and apply, by WordPress post_type.
 * Overlay actions stay the same on every type; this only gates the draft fields.
 *
 * `post`, `list`, and any unlisted type share today's article fields.
 * `sxs-recipe` adds method_steps (ACF flexible method).
 *
 * Installed on `globalThis` so the isolated overlay, MAIN-world bridge, and
 * service worker all see the same helpers. MAIN-world content scripts do not
 * share a lexical scope across files — a bare `function` here is invisible to
 * `editor-bridge.js` unless it is assigned to the page global.
 */
(function installPostTypeFields(global) {
  const RECIPE_POST_TYPE = 'sxs-recipe';
  const MAX_METHOD_STEPS = 30;
  const MAX_METHOD_STEP_CHARS = 2000;
  const MAX_METHOD_STEPS_CHARS = 20000;
  const METHOD_STEP_KINDS = ['heading', 'step'];
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

  function fieldsForPostType(postType) {
    const fields = POST_TYPE_CORE_FIELDS.slice();
    if (postTypeAllowsMethodSteps(postType)) fields.push('method_steps');
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

  global.RECIPE_POST_TYPE = RECIPE_POST_TYPE;
  global.postTypeAllowsMethodSteps = postTypeAllowsMethodSteps;
  global.fieldsForPostType = fieldsForPostType;
  global.normaliseMethodSteps = normaliseMethodSteps;
}(typeof globalThis !== 'undefined' ? globalThis : self));
