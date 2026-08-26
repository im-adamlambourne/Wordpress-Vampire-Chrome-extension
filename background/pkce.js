const PLUGIN_CLIENT_ID = 'content-studio-plugin';
const DEFAULT_API_HOST = 'https://develop.content-studio.im';

const ALLOWED_API_ORIGINS = [
  'https://content-studio.im',
  'https://develop.content-studio.im',
  'http://localhost',
  'http://127.0.0.1',
  'http://localhost:8080',
  'http://127.0.0.1:8080',
];

const WP_ADMIN_HOST_SUFFIXES = [
  '.production.wcp.imdserve.com',
  '.release.wcp.imdserve.com',
];

const WP_ADMIN_TAB_URLS = [
  'https://*.production.wcp.imdserve.com/wp-admin/*',
  'https://*.release.wcp.imdserve.com/wp-admin/*',
  'http://localhost/wp-admin/*',
  'http://127.0.0.1/wp-admin/*',
];

const ALLOWED_API_HOST_MESSAGE =
  'Use https://content-studio.im, https://develop.content-studio.im, or http://localhost.';

function base64UrlEncode(bytes) {
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
}

function randomUrlToken(byteLength) {
  return base64UrlEncode(crypto.getRandomValues(new Uint8Array(byteLength)));
}

async function generatePkce() {
  const verifier = randomUrlToken(32);
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  return {
    verifier,
    challenge: base64UrlEncode(new Uint8Array(digest)),
    state: randomUrlToken(16),
  };
}

async function ensureApiHost() {
  const { apiHost } = await chrome.storage.local.get('apiHost');
  if (typeof apiHost === 'string' && apiHost.trim() !== '') {
    return apiHost;
  }

  await chrome.storage.local.set({ apiHost: DEFAULT_API_HOST });
  return DEFAULT_API_HOST;
}

function normalizeApiHost(value) {
  const trimmed = String(value ?? '').trim();
  if (!trimmed) {
    throw new Error('Enter a server URL.');
  }

  const withProtocol = /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;
  const url = new URL(withProtocol);

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('The server URL must start with http:// or https://.');
  }

  return url.origin;
}

function assertAllowedApiHost(host) {
  if (ALLOWED_API_ORIGINS.includes(host)) return host;
  throw new Error(ALLOWED_API_HOST_MESSAGE);
}

function isLoopbackHostname(hostname) {
  return hostname === 'localhost' || hostname === '127.0.0.1';
}

function isWpAdminHost(hostname) {
  const host = String(hostname || '').toLowerCase();
  if (isLoopbackHostname(host)) return true;
  return WP_ADMIN_HOST_SUFFIXES.some(
    (suffix) => host.endsWith(suffix) && host.length > suffix.length,
  );
}

function isWpAdminUrl(url) {
  if (typeof url !== 'string' || !/^https?:\/\//i.test(url)) return false;
  try {
    const parsed = new URL(url);
    return parsed.pathname.includes('/wp-admin/') && isWpAdminHost(parsed.hostname);
  } catch {
    return false;
  }
}

function hostOriginPattern(host) {
  return `${new URL(host).origin}/*`;
}

function reverbOriginPattern(host) {
  const url = new URL(host);
  if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
    return 'http://localhost:8081/*';
  }

  return `https://ws.${url.hostname}/*`;
}

function pluginOptionalOrigins(host) {
  return [hostOriginPattern(host), reverbOriginPattern(host)];
}

function reverbOriginFromBroadcasting(broadcasting) {
  const scheme = broadcasting?.scheme === 'https' ? 'https' : 'http';
  const host = broadcasting?.host;
  const port = Number(broadcasting?.port);
  if (!host) return null;
  const defaultPort = scheme === 'https' ? 443 : 80;
  if (!port || port === defaultPort) {
    return `${scheme}://${host}/*`;
  }
  return `${scheme}://${host}:${port}/*`;
}

const PLUGIN_SESSION_KEYS = ['apiToken', 'apiUserName', 'apiUserId', 'broadcasting'];
