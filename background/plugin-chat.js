async function sendPluginChat({ message, history, article }) {
  const { apiHost, apiToken } = await chrome.storage.local.get(['apiHost', 'apiToken']);

  if (!apiHost || !apiToken) {
    return { ok: false, error: 'Sign in via the Content Studio toolbar popup.' };
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
      await chrome.storage.local.remove(['apiToken', 'apiUserName']);
      return { ok: false, error: 'Session expired. Sign in via the Content Studio toolbar popup.' };
    }

    if (!response.ok || typeof payload.reply !== 'string') {
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
        error: 'Could not reach Content Exchange. Save the host and allow access, then try again.',
      };
    }
    return { ok: false, error: err.message || 'Chat failed.' };
  }

  return { ok: true, reply: payload.reply, edits: normaliseEdits(payload.edits) };
}

function normaliseEdits(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};

  const edits = {};
  for (const key of [
    'title',
    'content',
    'excerpt',
    'seo_title',
    'seo_description',
    'og_title',
    'og_description',
  ]) {
    if (typeof raw[key] === 'string' && raw[key].trim() !== '') {
      edits[key] = raw[key];
    }
  }
  return edits;
}

function handlePluginChatMessage(message, sendResponse) {
  if (message?.type !== 'PLUGIN_CHAT') return false;

  (async () => {
    try {
      sendResponse(await sendPluginChat(message));
    } catch (err) {
      sendResponse({ ok: false, error: err.message || 'Chat failed.' });
    }
  })();
  return true;
}
