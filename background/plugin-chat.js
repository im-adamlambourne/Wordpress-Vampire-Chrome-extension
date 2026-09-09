function assignTelemetryValue(target, key, value) {
  if (typeof value === 'string' && value.trim() !== '') {
    target[key] = value.trim();
  }
}

function pickBrowserBrand(brands) {
  if (!Array.isArray(brands)) return null;
  const preferred = brands.find((item) => item && /Google Chrome|Microsoft Edge|Brave|Opera/i.test(item.brand));
  if (preferred) return preferred;
  return brands.find((item) => item && item.brand && !/^Not.?A.?Brand/i.test(item.brand)) || null;
}

function fillTelemetryFromUserAgent(telemetry) {
  const ua = typeof navigator.userAgent === 'string' ? navigator.userAgent : '';
  if (!telemetry.browser) {
    const edge = ua.match(/Edg\/([\d.]+)/);
    const chrome = ua.match(/Chrome\/([\d.]+)/);
    if (edge) {
      telemetry.browser = 'Microsoft Edge';
      telemetry.browser_version = edge[1];
    } else if (chrome) {
      telemetry.browser = 'Google Chrome';
      telemetry.browser_version = chrome[1];
    }
  }
  if (telemetry.os) {
    return;
  }
  if (/Mac OS X/.test(ua)) {
    telemetry.os = 'macOS';
    const mac = ua.match(/Mac OS X ([\d_]+)/);
    if (mac) telemetry.os_version = mac[1].replaceAll('_', '.');
  } else if (/Windows NT/.test(ua)) {
    telemetry.os = 'Windows';
    const win = ua.match(/Windows NT ([\d.]+)/);
    if (win) telemetry.os_version = win[1];
  } else if (/Linux/.test(ua)) {
    telemetry.os = 'Linux';
  }
}

async function collectPluginTelemetry() {
  const telemetry = {};
  try {
    assignTelemetryValue(telemetry, 'extension_version', chrome.runtime.getManifest()?.version);
  } catch {
    // Manifest should always be readable in the service worker.
  }

  const uaData = navigator.userAgentData;
  if (uaData && typeof uaData.getHighEntropyValues === 'function') {
    try {
      const hints = await uaData.getHighEntropyValues([
        'platform',
        'platformVersion',
        'fullVersionList',
      ]);
      assignTelemetryValue(telemetry, 'os', hints.platform || uaData.platform);
      assignTelemetryValue(telemetry, 'os_version', hints.platformVersion);
      const brand = pickBrowserBrand(hints.fullVersionList || uaData.brands);
      if (brand) {
        assignTelemetryValue(telemetry, 'browser', brand.brand);
        assignTelemetryValue(telemetry, 'browser_version', brand.version);
      }
    } catch {
      // High-entropy hints can be denied; the user-agent string fills gaps below.
    }
  }

  fillTelemetryFromUserAgent(telemetry);

  return telemetry;
}

const PLUGIN_CHAT_ACTIONS = [
  'internal_links',
  'headline',
  'standfirst',
  'seo',
  'first_sub',
  'footers',
  'images',
];

async function sendPluginChat({ message, history, article, action }, tabId) {
  const { apiHost, apiToken } = await chrome.storage.local.get(['apiHost', 'apiToken']);

  if (!apiHost || !apiToken) {
    return { ok: false, error: 'Sign in via the Content Studio toolbar popup.' };
  }

  try {
    await connectPluginEcho();
  } catch (err) {
    return {
      ok: false,
      error: err.message || 'Could not connect to Content Studio. Please try again later.',
    };
  }

  let payload;
  try {
    const telemetry = await collectPluginTelemetry();
    const response = await fetch(`${apiHost}/api/plugin/chat`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiToken}`,
      },
      body: JSON.stringify({
        message,
        history,
        article,
        ...(PLUGIN_CHAT_ACTIONS.includes(action) ? { action } : {}),
        ...(Object.keys(telemetry).length > 0 ? { telemetry } : {}),
      }),
    });
    payload = await response.json().catch(() => ({}));

    if (response.status === 401) {
      await clearPluginSession();
      await disconnectPluginEcho();
      return { ok: false, error: 'Session expired. Sign in via the Content Studio toolbar popup.' };
    }

    if (response.status !== 202 || typeof payload.request_id !== 'string') {
      throw new Error(
        payload.message
        || payload.errors?.message?.[0]
        || `Chat failed (${response.status}).`,
      );
    }
  } catch (err) {
    if (err instanceof TypeError) {
      return {
        ok: false,
        error: 'Could not reach the server. Save the host and allow access, then try again.',
      };
    }
    return { ok: false, error: err.message || 'Chat failed.' };
  }

  await rememberPluginChatTab(payload.request_id, tabId);
  return { ok: true, accepted: true, request_id: payload.request_id };
}

function normaliseTitleVariants(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((value) => typeof value === 'string' && value.trim() !== '')
    .map((value) => value.trim())
    .slice(0, 5);
}

const SUGGESTION_FIELDS = [
  'title',
  'excerpt',
  'seo_title',
  'seo_description',
  'og_title',
  'og_description',
  'focus_keyphrase',
];

/**
 * Reviewable suggestion cards. Sanitised here so the WordPress page only ever
 * sees keys the overlay knows how to render.
 */
function normaliseSuggestions(raw) {
  if (!Array.isArray(raw)) return [];

  const suggestions = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) continue;
    const id = typeof item.id === 'string' && item.id.trim() !== '' ? item.id.trim().slice(0, 100) : '';

    if (item.kind === 'internal_link') {
      const anchor = typeof item.anchor === 'string' ? item.anchor.trim() : '';
      const url = typeof item.url === 'string' ? item.url.trim() : '';
      if (!anchor || !url) continue;
      suggestions.push({
        kind: 'internal_link',
        ...(id ? { id } : {}),
        anchor: anchor.slice(0, 200),
        url: url.slice(0, 2000),
        target: typeof item.target === 'string' ? item.target.trim().slice(0, 300) : '',
      });
      continue;
    }

    if (item.kind !== 'field') continue;
    const value = typeof item.value === 'string' ? item.value.trim() : '';
    if (!SUGGESTION_FIELDS.includes(item.field) || !value) continue;
    suggestions.push({
      kind: 'field',
      ...(id ? { id } : {}),
      field: item.field,
      value: value.slice(0, 2000),
      ...(typeof item.label === 'string' && item.label.trim() !== ''
        ? { label: item.label.trim().slice(0, 100) }
        : {}),
    });
  }

  return suggestions.slice(0, 20);
}

function normaliseEdits(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};

  const edits = {};
  for (const key of [
    'title',
    'content',
    'selection',
    'excerpt',
    'seo_title',
    'seo_description',
    'og_title',
    'og_description',
    'focus_keyphrase',
  ]) {
    if (typeof raw[key] === 'string' && raw[key].trim() !== '') {
      edits[key] = raw[key];
    }
  }
  const methodSteps = normaliseMethodSteps(raw.method_steps);
  if (methodSteps.length > 0) edits.method_steps = methodSteps;
  return edits;
}

function handlePluginChatMessage(message, sender, sendResponse) {
  if (message?.type !== 'PLUGIN_CHAT') return false;

  (async () => {
    try {
      sendResponse(await sendPluginChat(message, sender.tab?.id));
    } catch (err) {
      sendResponse({ ok: false, error: err.message || 'Chat failed.' });
    }
  })();
  return true;
}
