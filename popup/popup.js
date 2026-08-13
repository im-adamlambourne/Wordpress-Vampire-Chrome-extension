const statusEl = document.getElementById('connection-status');
const detailsEl = document.getElementById('session-details');
const fieldsSection = document.getElementById('fields-section');
const fieldsCaption = document.getElementById('fields-caption');
const fieldRows = document.getElementById('field-rows');
const refreshBtn = document.getElementById('refresh');
const cexStatusEl = document.getElementById('cex-status');
const hostForm = document.getElementById('cex-host-form');
const hostInput = document.getElementById('cex-host');
const loginBtn = document.getElementById('cex-login');
const logoutBtn = document.getElementById('cex-logout');

let pendingPkce = null;

async function refreshPkce() {
  pendingPkce = await generatePkce();
}

refreshPkce();

function setCexStatus(state, message) {
  cexStatusEl.dataset.state = state;
  cexStatusEl.textContent = message;
}

function syncHostAria(event) {
  const input = event.target;
  if (input !== hostInput || !input.matches) return;
  if (input.matches(':user-invalid')) {
    input.setAttribute('aria-invalid', 'true');
  } else {
    input.removeAttribute('aria-invalid');
  }
}

hostInput.addEventListener('blur', syncHostAria, true);
hostInput.addEventListener('focus', syncHostAria, true);
hostInput.addEventListener('input', (event) => {
  if (hostInput.getAttribute('aria-invalid') === 'true') {
    syncHostAria(event);
  }
});

async function loadCexAuth() {
  const { apiHost, apiToken } = await chrome.storage.local.get(['apiHost', 'apiToken']);
  if (apiHost) {
    hostInput.value = apiHost;
  }

  logoutBtn.hidden = !apiToken;

  if (!apiHost) {
    setCexStatus('signed-out', 'Save a server URL, then log in.');
    return;
  }

  if (!apiToken) {
    setCexStatus('signed-out', 'Not signed in.');
    return;
  }

  setCexStatus('checking', 'Checking Content Exchange session…');

  try {
    const response = await fetch(`${apiHost}/api/plugin/me`, {
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${apiToken}`,
      },
    });

    if (response.status === 401) {
      await chrome.storage.local.remove('apiToken');
      logoutBtn.hidden = true;
      setCexStatus('signed-out', 'Session expired. Log in again.');
      return;
    }

    if (!response.ok) {
      throw new Error(`Could not load the signed-in user (${response.status}).`);
    }

    const user = await response.json();
    const name = user.name || user.email || 'Unknown user';
    setCexStatus('signed-in', `Signed in as ${name}`);
    logoutBtn.hidden = false;
  } catch (err) {
    setCexStatus('error', err.message || 'Could not reach Content Exchange.');
  }
}

hostForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  let host;
  try {
    host = normalizeApiHost(hostInput.value);
    hostInput.setCustomValidity('');
  } catch (err) {
    hostInput.setCustomValidity(err.message);
    hostInput.reportValidity();
    return;
  }

  const granted = await chrome.permissions.request({ origins: [hostOriginPattern(host)] });
  if (!granted) {
    setCexStatus('error', 'Host permission was not granted.');
    return;
  }

  const { apiHost: previousHost } = await chrome.storage.local.get('apiHost');
  if (previousHost && previousHost !== host) {
    await chrome.storage.local.remove('apiToken');
  }

  await chrome.storage.local.set({ apiHost: host });
  hostInput.value = host;
  await loadCexAuth();
  if (!previousHost || previousHost !== host) {
    setCexStatus('signed-out', 'Host saved. Log in to connect.');
  }
});

loginBtn.addEventListener('click', async () => {
  let host;
  try {
    host = normalizeApiHost(hostInput.value);
  } catch (err) {
    setCexStatus('error', err.message);
    return;
  }

  if (!pendingPkce) {
    setCexStatus('error', 'Login is not ready yet. Try again.');
    refreshPkce();
    return;
  }

  const pkce = pendingPkce;
  pendingPkce = null;
  refreshPkce();

  setCexStatus('checking', 'Opening Content Exchange to sign in…');
  try {
    const response = await chrome.runtime.sendMessage({
      type: 'PLUGIN_LOGIN',
      host,
      verifier: pkce.verifier,
      challenge: pkce.challenge,
      state: pkce.state,
    });
    if (!response?.ok) {
      setCexStatus('error', response?.error || 'Login failed.');
      return;
    }
    await loadCexAuth();
  } catch (err) {
    setCexStatus('error', err.message || 'Login failed.');
  }
});

logoutBtn.addEventListener('click', async () => {
  try {
    await chrome.runtime.sendMessage({ type: 'PLUGIN_LOGOUT' });
    await loadCexAuth();
  } catch (err) {
    setCexStatus('error', err.message || 'Logout failed.');
  }
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && (changes.apiToken || changes.apiHost)) {
    loadCexAuth();
  }
});

function isWpAdminUrl(url) {
  if (!url) return false;
  try {
    return new URL(url).pathname.includes('/wp-admin/');
  } catch {
    return false;
  }
}

function setStatus(state, message) {
  statusEl.dataset.state = state;
  statusEl.textContent = message;
}

function addField(term, value) {
  const dt = document.createElement('dt');
  dt.textContent = term;

  const dd = document.createElement('dd');
  const display = value === null || value === undefined || value === '' ? '—' : String(value);
  dd.textContent = display;
  if (display === '—') dd.dataset.empty = 'true';

  detailsEl.append(dt, dd);
}

function editorLabel(type) {
  if (type === 'gutenberg') return 'Gutenberg';
  if (type === 'classic') return 'Classic';
  return 'None (admin screen)';
}

function fieldName(field) {
  return field.label || field.name || field.id || '(unnamed)';
}

function renderFields(fields) {
  fieldRows.replaceChildren();

  if (!fields?.length) {
    fieldsSection.hidden = true;
    return;
  }

  const count = fields.length;
  fieldsCaption.textContent = `${count} attached form element${count === 1 ? '' : 's'}`;

  for (const field of fields) {
    const row = document.createElement('tr');
    if (field.hidden) row.dataset.hidden = 'true';
    if (field.disabled) row.dataset.disabled = 'true';

    const nameCell = document.createElement('th');
    nameCell.scope = 'row';
    nameCell.textContent = fieldName(field);

    const typeCell = document.createElement('td');
    typeCell.textContent = field.type || field.tag;

    const valueCell = document.createElement('td');
    const display = field.value === '' ? '—' : field.value;
    valueCell.textContent = display;
    if (display === '—') valueCell.dataset.empty = 'true';

    row.append(nameCell, typeCell, valueCell);
    fieldRows.append(row);
  }

  fieldsSection.hidden = false;
}

function renderSession(session) {
  detailsEl.replaceChildren();

  addField('Site', session.siteName);
  addField('URL', session.url);
  addField('Logged in', session.loggedIn ? 'Yes' : 'No');
  addField('User', session.user);
  addField('Editor', editorLabel(session.editor?.type));
  addField('Post ID', session.editor?.postId);
  addField('Post type', session.editor?.postType);
  addField('Title', session.editor?.title);
  addField('REST root', session.rest?.root);
  addField('REST nonce', session.rest?.noncePresent ? 'Present' : 'Missing');
  addField('Fields', String(session.fields?.length ?? 0));
  addField('Detected at', session.detectedAt);
  renderFields(session.fields);
}

function renderDetached(url) {
  detailsEl.replaceChildren();
  addField('Tab URL', url || 'Unavailable');
  addField('Content script', 'Not injected');
  renderFields([]);
}

async function loadSession() {
  setStatus('checking', 'Checking session…');
  detailsEl.replaceChildren();
  renderFields([]);

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) {
      setStatus('unreachable', 'No active tab found.');
      renderDetached('');
      return;
    }

    try {
      const session = await chrome.tabs.sendMessage(tab.id, { type: 'GET_SESSION' });
      if (!session?.attached) {
        setStatus('detached', 'Not attached — this tab is not a WordPress admin page.');
        if (session) renderSession(session);
        else renderDetached(tab.url || '');
        return;
      }

      const fieldCount = session.fields?.length ?? 0;
      const fieldNote = `${fieldCount} form element${fieldCount === 1 ? '' : 's'}`;
      if (session.editor?.type) {
        const editor = editorLabel(session.editor.type);
        setStatus('attached-editor', `Attached to ${editor} editor · ${fieldNote}.`);
      } else {
        setStatus('attached', `Attached to wp-admin, but not on the article editor · ${fieldNote}.`);
      }

      renderSession(session);
    } catch {
      if (isWpAdminUrl(tab.url)) {
        setStatus('unreachable', 'WordPress admin tab detected, but the content script did not answer. Reload the tab.');
      } else {
        setStatus('detached', 'Not attached — this tab is not a WordPress admin page.');
      }
      renderDetached(tab.url || '');
    }
  } catch (err) {
    setStatus('unreachable', 'Could not read the active tab.');
    renderDetached('');
    console.error('Failed to load session:', err);
  }
}

refreshBtn.addEventListener('click', () => {
  loadSession();
});

loadCexAuth();
loadSession();
