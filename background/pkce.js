const PLUGIN_CLIENT_ID = 'content-studio-plugin';

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

function hostOriginPattern(host) {
  return `${new URL(host).origin}/*`;
}
