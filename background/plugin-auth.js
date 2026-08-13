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
      throw new Error('Could not reach Content Exchange. Save the host and allow access, then try again.');
    }
    throw err;
  }

  await chrome.storage.local.set({ apiHost: host, apiToken: payload.token });
  await chrome.storage.session.remove('pluginPkce');
}

async function startPluginLogin({ host, verifier, challenge, state }) {
  if (!host || !verifier || !challenge || !state) {
    throw new Error('Save a Content Exchange host, then try logging in again.');
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

  await chrome.storage.local.remove('apiToken');
  return { ok: true };
}

function handlePluginAuthMessage(message, sendResponse) {
  if (message?.type === 'PLUGIN_LOGIN') {
    (async () => {
      try {
        sendResponse(await startPluginLogin(message));
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
