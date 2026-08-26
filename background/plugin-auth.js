async function exchangePluginToken({ host, verifier, state, redirectUri, responseUrl }) {
  const redirected = new URL(responseUrl);
  const params = redirected.searchParams.get('code') || redirected.searchParams.get('error')
    ? redirected.searchParams
    : new URLSearchParams(redirected.hash.replace(/^#/, ''));
  const returnedState = params.get('state');
  const error = params.get('error');
  const code = params.get('code');

  if (returnedState !== state) {
    throw new Error('Login was rejected because the returned state did not match.');
  }

  if (error) {
    throw new Error(error === 'access_denied' ? 'Login was cancelled.' : `Login failed (${error}).`);
  }

  if (!code) {
    throw new Error('Login did not return an authorization code.');
  }

  let payload;
  try {
    const response = await fetch(`${host}/api/plugin/token`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: PLUGIN_CLIENT_ID,
        code,
        code_verifier: verifier,
        redirect_uri: redirectUri,
      }),
    });
    payload = await response.json().catch(() => ({}));
    if (!response.ok || typeof payload.token !== 'string') {
      throw new Error(payload.message || payload.errors?.code?.[0] || `Token exchange failed (${response.status}).`);
    }
  } catch (err) {
    if (err instanceof TypeError) {
      throw new Error('Could not reach the server. Save the host and allow access, then try again.');
    }
    throw err;
  }

  await persistPluginToken(host, payload);
  try {
    await connectPluginEcho();
  } catch (err) {
    console.warn('Could not open the realtime connection after login:', err.message);
  }
  await chrome.storage.session.remove('pluginPkce');
  await announceLoginSuccess();
}

async function persistPluginToken(host, payload) {
  const stored = {
    apiHost: host,
    apiToken: payload.token,
  };

  if (payload.user && typeof payload.user === 'object') {
    if (payload.user.id != null) {
      stored.apiUserId = Number(payload.user.id);
    }
    const name = payload.user.name || payload.user.email;
    if (typeof name === 'string' && name.trim() !== '') {
      stored.apiUserName = name.trim();
    }
  }

  if (payload.broadcasting && typeof payload.broadcasting === 'object') {
    stored.broadcasting = payload.broadcasting;
  }

  await chrome.storage.local.set(stored);

  if (payload.user && typeof payload.user === 'object') {
    return;
  }

  await storePluginUserName(host, payload.token);
}

async function clearPluginSession() {
  await chrome.storage.local.remove(PLUGIN_SESSION_KEYS);
}

const LOGIN_NOTIFICATION_ID = 'plugin-login-success';
const POPUP_PATH = 'popup/popup.html';

function loginSuccessMessage(apiUserName) {
  return apiUserName
    ? `Successfully logged in as ${apiUserName}.`
    : 'Successfully logged in.';
}

async function announceLoginSuccess() {
  const { apiUserName } = await chrome.storage.local.get('apiUserName');
  const message = loginSuccessMessage(apiUserName);
  await chrome.storage.session.set({ loginSuccessMessage: message });
  await notifyLoginSuccess(message);
  await openPluginPopup();
}

async function notifyLoginSuccess(message) {
  try {
    await chrome.notifications.create(LOGIN_NOTIFICATION_ID, {
      type: 'basic',
      iconUrl: chrome.runtime.getURL('icons/icon-128.png'),
      title: 'Content Studio',
      message,
    });
  } catch (err) {
    console.error('Failed to show login notification:', err);
  }
}

async function openPluginPopup() {
  try {
    const lastFocused = await chrome.windows.getLastFocused();
    if (lastFocused?.id != null && chrome.action.openPopup) {
      await chrome.action.openPopup({ windowId: lastFocused.id });
      return;
    }
  } catch (err) {
    console.warn('Could not open the action popup after login:', err);
  }

  try {
    const lastFocused = await chrome.windows.getLastFocused();
    const position = typeof lastFocused?.left === 'number' && typeof lastFocused?.top === 'number'
      ? { left: lastFocused.left + 48, top: lastFocused.top + 88 }
      : {};
    await chrome.windows.create({
      url: chrome.runtime.getURL(POPUP_PATH),
      type: 'popup',
      focused: true,
      width: 800,
      height: 600,
      ...position,
    });
  } catch (err) {
    console.error('Failed to open the plugin popup after login:', err);
  }
}

chrome.notifications.onClicked.addListener(async (notificationId) => {
  if (notificationId !== LOGIN_NOTIFICATION_ID) return;
  await openPluginPopup();
  try {
    await chrome.notifications.clear(notificationId);
  } catch (err) {
    console.error('Failed to clear login notification:', err);
  }
});

async function storePluginUserName(host, token) {
  try {
    const response = await fetch(`${host}/api/plugin/me`, {
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });
    if (!response.ok) return;
    const user = await response.json();
    const name = user.name || user.email;
    if (typeof name === 'string' && name.trim() !== '') {
      await chrome.storage.local.set({ apiUserName: name.trim() });
    }
  } catch {
    // Avatar falls back to "User" until /me succeeds from the popup.
  }
}

async function resolvePluginLogin(message) {
  if (message?.host && message?.verifier && message?.challenge && message?.state) {
    return startPluginLogin({
      host: message.host,
      verifier: message.verifier,
      challenge: message.challenge,
      state: message.state,
    });
  }

  const apiHost = await ensureApiHost();
  assertAllowedApiHost(apiHost);
  const granted = await chrome.permissions.contains({
    origins: pluginOptionalOrigins(apiHost),
  });
  if (!granted) {
    await openPluginPopup();
    throw new Error('Log in from the toolbar popup to allow access to Content Studio.');
  }

  const pkce = await generatePkce();
  return startPluginLogin({
    host: apiHost,
    verifier: pkce.verifier,
    challenge: pkce.challenge,
    state: pkce.state,
  });
}

async function startPluginLogin({ host, verifier, challenge, state }) {
  if (!host || !verifier || !challenge || !state) {
    throw new Error('Choose a server host, then try logging in again.');
  }

  const redirectUri = chrome.identity.getRedirectURL();
  const authorizeUrl = new URL('/plugin/authorize', host);
  authorizeUrl.searchParams.set('client_id', PLUGIN_CLIENT_ID);
  authorizeUrl.searchParams.set('redirect_uri', redirectUri);
  authorizeUrl.searchParams.set('state', state);
  authorizeUrl.searchParams.set('code_challenge', challenge);
  authorizeUrl.searchParams.set('code_challenge_method', 'S256');

  const flowPromise = chrome.identity.launchWebAuthFlow({
    url: authorizeUrl.toString(),
    interactive: true,
  });
  chrome.storage.session.set({ pluginPkce: { verifier, state, host } });

  const responseUrl = await flowPromise;
  if (!responseUrl) {
    throw new Error('Login was cancelled.');
  }

  await exchangePluginToken({ host, verifier, state, redirectUri, responseUrl });
  return { ok: true };
}

async function logoutPlugin() {
  const { apiHost, apiToken } = await chrome.storage.local.get(['apiHost', 'apiToken']);

  if (apiHost && apiToken) {
    try {
      await fetch(`${apiHost}/api/plugin/logout`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${apiToken}`,
        },
      });
    } catch {
      // Local sign-out still proceeds if the server is unreachable.
    }
  }

  await clearPluginSession();
  await disconnectPluginEcho();
  return { ok: true };
}

function handlePluginAuthMessage(message, sendResponse) {
  if (message?.type === 'PLUGIN_LOGIN') {
    (async () => {
      try {
        sendResponse(await resolvePluginLogin(message));
      } catch (err) {
        sendResponse({ ok: false, error: err.message || 'Login failed.' });
      }
    })();
    return true;
  }

  if (message?.type === 'PLUGIN_LOGOUT') {
    (async () => {
      try {
        sendResponse(await logoutPlugin());
      } catch (err) {
        sendResponse({ ok: false, error: err.message || 'Logout failed.' });
      }
    })();
    return true;
  }

  return false;
}
