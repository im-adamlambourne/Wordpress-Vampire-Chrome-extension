importScripts('pkce.js', 'plugin-auth.js', 'plugin-chat.js', 'plugin-echo.js');

function statusIconPath(connected) {
  const suffix = connected ? 'connected' : 'disconnected';
  return {
    16: `/icons/icon-16-${suffix}.png`,
    32: `/icons/icon-32-${suffix}.png`,
    48: `/icons/icon-48-${suffix}.png`,
    128: `/icons/icon-128-${suffix}.png`,
  };
}

function isHttpUrl(url) {
  return typeof url === 'string' && /^https?:\/\//i.test(url);
}

function isWpAdminUrl(url) {
  if (!isHttpUrl(url)) return false;
  const path = url.replace(/^[a-z][a-z0-9+.-]*:\/\/[^/]+/i, '').split(/[?#]/, 1)[0];
  return path.includes('/wp-admin/');
}

function isBenignActionError(err) {
  const message = String(err?.message ?? err);
  return /no tab with id|cannot be edited right now|tab was closed|invalid tab/i.test(message);
}

async function tabActionTarget(tabId) {
  if (tabId == null) return {};
  const tab = await chrome.tabs.get(tabId);
  if (!isHttpUrl(tab.url)) return null;
  return { tabId };
}

async function applyStatus(connected, tabId) {
  try {
    const target = await tabActionTarget(tabId);
    if (!target) return;

    await chrome.action.setBadgeText({ text: '', ...target });
    await chrome.action.setIcon({
      path: statusIconPath(connected),
      ...target,
    });
    await chrome.action.setTitle({
      title: connected ? 'Content Studio — connected' : 'Content Studio — disconnected',
      ...target,
    });
  } catch (err) {
    if (isBenignActionError(err)) return;
    console.error('Failed to update action status:', err);
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (handlePluginAuthMessage(message, sendResponse)) {
    return true;
  }

  if (handlePluginChatMessage(message, sender, sendResponse)) {
    return true;
  }

  if (handlePluginEchoMessage(message)) {
    return;
  }

  const tabId = sender.tab?.id;
  if (tabId == null) return;

  if (message.type === 'SESSION_ATTACHED') {
    applyStatus(true, tabId);
    return;
  }

  if (message.type === 'SESSION_DETACHED') {
    applyStatus(false, tabId);
  }
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (!changeInfo.url) return;
  if (isWpAdminUrl(changeInfo.url) || isWpAdminUrl(tab.url)) return;
  if (!isHttpUrl(tab.url)) return;
  await applyStatus(false, tabId);
});

applyStatus(false);

async function restorePluginEcho() {
  try {
    await connectPluginEcho();
  } catch {
    // Not signed in, or this session predates realtime chat.
  }
}

chrome.runtime.onStartup.addListener(() => {
  restorePluginEcho();
});

chrome.runtime.onInstalled.addListener(() => {
  ensureApiHost();
  restorePluginEcho();
});

ensureApiHost();
restorePluginEcho();

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local') return;
  if (changes.apiToken && !changes.apiToken.newValue) {
    disconnectPluginEcho();
  }
});
