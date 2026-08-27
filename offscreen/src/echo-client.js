import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

window.Pusher = Pusher;

let echo = null;
let subscribedUserId = null;

const CONNECT_TIMEOUT_MS = 5000;
const SUBSCRIBE_TIMEOUT_MS = 8000;

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === 'PLUGIN_ECHO_CONNECT') {
    (async () => {
      try {
        await connectEcho(message);
        sendResponse({ ok: true });
      } catch (err) {
        sendResponse({ ok: false, error: err.message || 'Could not connect to Content Studio. Please try again later.' });
      }
    })();
    return true;
  }

  if (message?.type === 'PLUGIN_ECHO_DISCONNECT') {
    disconnectEcho();
    sendResponse({ ok: true });
    return true;
  }

  return false;
});

async function connectEcho({ apiHost, apiToken, userId, broadcasting }) {
  if (!apiHost || !apiToken || !broadcasting?.key) {
    throw new Error('Sign in via the Content Studio toolbar popup.');
  }

  const numericUserId = Number(userId);
  if (!Number.isInteger(numericUserId) || numericUserId < 1) {
    throw new Error('Sign in again via the Content Studio toolbar popup to enable realtime chat.');
  }

  if (echo && subscribedUserId === numericUserId) {
    return;
  }

  disconnectEcho();

  const port = Number(broadcasting.port) || (broadcasting.scheme === 'https' ? 443 : 80);
  const forceTLS = broadcasting.scheme === 'https';

  // Pusher-js's TLS socket is the "ws" transport; "wss" is only a non-TLS fallback.
  echo = new Echo({
    broadcaster: 'reverb',
    key: broadcasting.key,
    wsHost: broadcasting.host,
    wsPort: port,
    wssPort: port,
    forceTLS,
    encrypted: forceTLS,
    cluster: '',
    enabledTransports: ['ws', 'wss'],
    disableStats: true,
    namespace: false,
    authEndpoint: `${apiHost}/broadcasting/auth`,
    bearerToken: apiToken,
    authorizer: (channel) => ({
      authorize: async (socketId, callback) => {
        try {
          const response = await fetch(`${apiHost}/broadcasting/auth`, {
            method: 'POST',
            headers: {
              Accept: 'application/json',
              'Content-Type': 'application/json',
              Authorization: `Bearer ${apiToken}`,
            },
            body: JSON.stringify({
              socket_id: socketId,
              channel_name: channel.name,
            }),
          });

          if (response.status === 401) {
            await chrome.runtime.sendMessage({ type: 'PLUGIN_ECHO_UNAUTHORIZED' });
            callback(new Error('unauthorized'), null);
            return;
          }

          const data = await response.json().catch(() => ({}));
          if (!response.ok) {
            callback(new Error(data.message || `Channel authorization failed (${response.status}).`), null);
            return;
          }
          callback(null, data);
        } catch (error) {
          callback(error instanceof Error ? error : new Error('Channel authorization failed.'), null);
        }
      },
    }),
  });

  try {
    await waitForPusherConnection(echo.connector.pusher);
    await subscribeToPluginChannel(numericUserId);
    subscribedUserId = numericUserId;
  } catch (err) {
    disconnectEcho();
    throw err;
  }
}

function waitForPusherConnection(pusher) {
  return new Promise((resolve, reject) => {
    if (pusher.connection.state === 'connected') {
      resolve();
      return;
    }

    const timer = setTimeout(() => {
      cleanup();
      reject(connectionError());
    }, CONNECT_TIMEOUT_MS);

    const onConnected = () => {
      cleanup();
      resolve();
    };
    const onFailed = () => {
      cleanup();
      reject(connectionError());
    };

    function cleanup() {
      clearTimeout(timer);
      pusher.connection.unbind('connected', onConnected);
      pusher.connection.unbind('unavailable', onFailed);
      pusher.connection.unbind('failed', onFailed);
    }

    pusher.connection.bind('connected', onConnected);
    pusher.connection.bind('unavailable', onFailed);
    pusher.connection.bind('failed', onFailed);
  });
}

function connectionError() {
  return new Error('Could not connect to Content Studio. Please try again later.');
}

function subscribeToPluginChannel(userId) {
  return new Promise((resolve, reject) => {
    const channel = echo.private(`plugin.${userId}`);

    if (channel.subscription?.subscribed) {
      bindPluginChatListeners(channel);
      resolve();
      return;
    }

    const timer = setTimeout(() => {
      reject(new Error('Could not subscribe to realtime chat. Check channel authorization and try signing in again.'));
    }, SUBSCRIBE_TIMEOUT_MS);

    channel
      .subscribed(() => {
        clearTimeout(timer);
        resolve();
      })
      .error((error) => {
        clearTimeout(timer);
        const message = error?.message || error?.error || error?.status || 'Could not subscribe to realtime chat.';
        reject(new Error(typeof message === 'string' ? message : 'Could not subscribe to realtime chat.'));
      });

    bindPluginChatListeners(channel);
  });
}

function bindPluginChatListeners(channel) {
  channel
    .listen('.plugin.chat.replied', (payload) => {
      chrome.runtime.sendMessage({
        type: 'PLUGIN_CHAT_RESULT',
        ok: true,
        request_id: payload?.request_id,
        reply: payload?.reply,
        edits: payload?.edits,
        title_variants: payload?.title_variants,
      });
    })
    .listen('.plugin.chat.failed', (payload) => {
      chrome.runtime.sendMessage({
        type: 'PLUGIN_CHAT_RESULT',
        ok: false,
        request_id: payload?.request_id,
        error: payload?.error || 'The assistant could not complete that request.',
      });
    });
}

function disconnectEcho() {
  if (!echo) {
    subscribedUserId = null;
    return;
  }
  echo.disconnect();
  echo = null;
  subscribedUserId = null;
}
