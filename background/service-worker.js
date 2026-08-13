importScripts('pkce.js', 'plugin-auth.js', 'plugin-chat.js');

const LIGHT_CONNECTED = '#22c55e';
const LIGHT_DISCONNECTED = '#ef4444';
const ICON_SIZES = [16, 32];

const composedIcons = {
  connected: null,
  disconnected: null,
};

function sourceIconPath(size) {
  return size <= 16 ? 'icons/icon-16.png' : 'icons/icon-48.png';
}

function drawStatusLight(ctx, size, color) {
  const radius = Math.max(2.5, size * 0.16);
  const inset = Math.max(1, size * 0.08);
  const x = size - inset - radius;
  const y = size - inset - radius;

  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.lineWidth = Math.max(1, size * 0.06);
  ctx.strokeStyle = '#ffffff';
  ctx.stroke();
}

async function loadSourceBitmap(size) {
  const response = await fetch(chrome.runtime.getURL(sourceIconPath(size)));
  if (!response.ok) throw new Error(`Failed to load icon (${response.status})`);
  const blob = await response.blob();
  return createImageBitmap(blob);
}

async function composeStatusIcons(connected) {
  const cacheKey = connected ? 'connected' : 'disconnected';
  if (composedIcons[cacheKey]) return composedIcons[cacheKey];

  const color = connected ? LIGHT_CONNECTED : LIGHT_DISCONNECTED;
  const imageData = {};

  for (const size of ICON_SIZES) {
    const bitmap = await loadSourceBitmap(size);
    const canvas = new OffscreenCanvas(size, size);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(bitmap, 0, 0, size, size);
    drawStatusLight(ctx, size, color);
    imageData[size] = ctx.getImageData(0, 0, size, size);
  }

  composedIcons[cacheKey] = imageData;
  return imageData;
}

async function applyStatus(connected, tabId) {
  const target = tabId != null ? { tabId } : {};
  try {
    await chrome.action.setBadgeText({ text: '', ...target });
    await chrome.action.setIcon({
      imageData: await composeStatusIcons(connected),
      ...target,
    });
    await chrome.action.setTitle({
      title: connected ? 'Content Studio Plugin — connected' : 'Content Studio Plugin — disconnected',
      ...target,
    });
  } catch (err) {
    console.error('Failed to update action status:', err);
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

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (handlePluginAuthMessage(message, sendResponse)) {
    return true;
  }

  if (handlePluginChatMessage(message, sendResponse)) {
    return true;
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
  if (!changeInfo.url && changeInfo.status !== 'complete') return;
  if (isWpAdminUrl(tab.url)) return;
  await applyStatus(false, tabId);
});

applyStatus(false);
