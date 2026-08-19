const OFFSCREEN_PATH = 'offscreen/offscreen.html';

async function ensureOffscreenDocument() {
  if (chrome.runtime.getContexts) {
    const existing = await chrome.runtime.getContexts({
      contextTypes: ['OFFSCREEN_DOCUMENT'],
      documentUrls: [chrome.runtime.getURL(OFFSCREEN_PATH)],
    });
    if (existing.length > 0) return;
  }

  try {
    await chrome.offscreen.createDocument({
      url: OFFSCREEN_PATH,
      reasons: ['BLOBS'],
      justification: 'Keep a WebSocket open so Content Studio chat replies can arrive after the service worker sleeps.',
    });
  } catch (err) {
    if (!String(err?.message || err).includes('Only a single offscreen')) {
      throw err;
    }
  }
}

async function sendToOffscreen(message) {
  let lastError = null;
  for (let attempt = 0; attempt < 15; attempt += 1) {
    try {
      return await chrome.runtime.sendMessage(message);
    } catch (err) {
      lastError = err;
      await new Promise((resolve) => {
        setTimeout(resolve, 50);
      });
    }
  }
  throw lastError || new Error('Could not reach the realtime client.');
}

async function connectPluginEcho() {
  const { apiHost, apiToken, apiUserId, broadcasting } = await chrome.storage.local.get([
    'apiHost',
    'apiToken',
    'apiUserId',
    'broadcasting',
  ]);

  if (!apiHost || !apiToken || !apiUserId || !broadcasting?.key) {
    throw new Error('Sign in again via the Content Studio toolbar popup to enable realtime chat.');
  }

  const reverbOrigin = reverbOriginFromBroadcasting(broadcasting);
  if (reverbOrigin) {
    const granted = await chrome.permissions.contains({ origins: [reverbOrigin] });
    if (!granted) {
      throw new Error('Save the host again and allow the realtime origin when Chrome asks.');
    }
  }

  await ensureOffscreenDocument();
  const result = await sendToOffscreen({
    type: 'PLUGIN_ECHO_CONNECT',
    apiHost,
    apiToken,
    userId: apiUserId,
    broadcasting,
  });

  if (result && result.ok === false) {
    throw new Error(result.error || 'Could not open the realtime connection.');
  }
}

async function disconnectPluginEcho() {
  try {
    await chrome.runtime.sendMessage({ type: 'PLUGIN_ECHO_DISCONNECT' });
  } catch {
    // Offscreen document may already be gone.
  }

  try {
    await chrome.offscreen.closeDocument();
  } catch {
    // No offscreen document is fine.
  }
}

async function rememberPluginChatTab(requestId, tabId) {
  if (tabId == null || !requestId) return;

  const { pluginChatPending = {} } = await chrome.storage.session.get('pluginChatPending');
  pluginChatPending[requestId] = tabId;
  await chrome.storage.session.set({ pluginChatPending });

  const { pluginChatResults = {} } = await chrome.storage.session.get('pluginChatResults');
  const buffered = pluginChatResults[requestId];
  if (!buffered) return;

  delete pluginChatResults[requestId];
  await chrome.storage.session.set({ pluginChatResults });
  await deliverPluginChatResult(tabId, buffered, requestId);
}

async function forwardPluginChatResult(message) {
  const requestId = message?.request_id;
  if (!requestId) return;

  const { pluginChatPending = {} } = await chrome.storage.session.get('pluginChatPending');
  const tabId = pluginChatPending[requestId];

  if (tabId == null) {
    const { pluginChatResults = {} } = await chrome.storage.session.get('pluginChatResults');
    pluginChatResults[requestId] = message;
    await chrome.storage.session.set({ pluginChatResults });

    const again = (await chrome.storage.session.get('pluginChatPending')).pluginChatPending || {};
    if (again[requestId] == null) return;

    delete pluginChatResults[requestId];
    await chrome.storage.session.set({ pluginChatResults });
    await deliverPluginChatResult(again[requestId], message, requestId);
    return;
  }

  await deliverPluginChatResult(tabId, message, requestId);
}

async function deliverPluginChatResult(tabId, message, requestId) {
  const { pluginChatPending = {} } = await chrome.storage.session.get('pluginChatPending');
  if (pluginChatPending[requestId] != null) {
    delete pluginChatPending[requestId];
    await chrome.storage.session.set({ pluginChatPending });
  }

  const outbound = {
    type: 'PLUGIN_CHAT_RESULT',
    ok: Boolean(message.ok),
    request_id: requestId,
  };

  if (outbound.ok) {
    outbound.reply = typeof message.reply === 'string' ? message.reply : '';
    outbound.edits = normaliseEdits(message.edits);
    outbound.title_variants = normaliseTitleVariants(message.title_variants);
  } else {
    outbound.error = message.error || 'The assistant could not complete that request.';
  }

  const tabIds = new Set([tabId]);
  try {
    const adminTabs = await chrome.tabs.query({ url: '*://*/wp-admin/*' });
    for (const tab of adminTabs) {
      if (tab.id != null) tabIds.add(tab.id);
    }
  } catch {
    // tabs.query may fail if the permission was revoked.
  }

  let delivered = false;
  for (const id of tabIds) {
    try {
      await chrome.tabs.sendMessage(id, outbound);
      delivered = true;
    } catch (err) {
      if (id === tabId) {
        console.warn('Could not deliver chat result to the editor tab:', err.message);
      }
    }
  }

  if (!delivered) {
    console.warn('Could not deliver chat result to any WordPress admin tab.');
  }
}

function handlePluginEchoMessage(message) {
  if (message?.type === 'PLUGIN_CHAT_RESULT') {
    (async () => {
      await forwardPluginChatResult(message);
    })();
    return true;
  }

  if (message?.type === 'PLUGIN_ECHO_UNAUTHORIZED') {
    (async () => {
      await clearPluginSession();
      await disconnectPluginEcho();
    })();
    return true;
  }

  return false;
}
