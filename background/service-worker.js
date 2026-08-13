const BADGE_TEXT = 'WP';
const BADGE_COLOR = '#7A1F2B';

async function setAttachedBadge(tabId) {
  try {
    await chrome.action.setBadgeText({ text: BADGE_TEXT, tabId });
    await chrome.action.setBadgeBackgroundColor({ color: BADGE_COLOR, tabId });
  } catch (err) {
    console.error('Failed to set attached badge:', err);
  }
}

async function clearBadge(tabId) {
  try {
    await chrome.action.setBadgeText({ text: '', tabId });
  } catch (err) {
    console.error('Failed to clear badge:', err);
  }
}

function isWpAdminUrl(url) {
  if (!url) return false;
  try {
    return new URL(url).pathname.includes('/wp-admin/');
  } catch {
    return false;
  }
}

chrome.runtime.onMessage.addListener((message, sender) => {
  const tabId = sender.tab?.id;
  if (tabId == null) return;

  if (message.type === 'SESSION_ATTACHED') {
    setAttachedBadge(tabId);
    return;
  }

  if (message.type === 'SESSION_DETACHED') {
    clearBadge(tabId);
  }
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (!changeInfo.url && changeInfo.status !== 'complete') return;
  if (isWpAdminUrl(tab.url)) return;
  await clearBadge(tabId);
});

chrome.tabs.onRemoved.addListener(async (tabId) => {
  await clearBadge(tabId);
});
