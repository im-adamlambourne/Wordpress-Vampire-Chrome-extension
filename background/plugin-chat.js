async function sendPluginChat({ message, history, article }, tabId) {
  const { apiHost, apiToken } = await chrome.storage.local.get(['apiHost', 'apiToken']);

  if (!apiHost || !apiToken) {
    return { ok: false, error: 'Sign in via the Content Studio toolbar popup.' };
  }

  try {
    await connectPluginEcho();
  } catch (err) {
    return {
      ok: false,
      error: err.message || 'Sign in again via the Content Studio toolbar popup to enable realtime chat.',
    };
  }

  let payload;
  try {
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
