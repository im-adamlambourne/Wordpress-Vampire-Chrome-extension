/**
 * Workspace feature grid in the signed-in toolbar popup. Hidden for the
 * action-led beta; the catalog fetch, grid render, and Settings site picker
 * stay wired, so flipping this back to true restores the launcher.
 */
const SHOW_WORKSPACE_GRID = false;

if (SHOW_WORKSPACE_GRID) {
  document.documentElement.classList.add('popup--workspace-grid');
}

const statusEl = document.getElementById('connection-status');
const detailsEl = document.getElementById('session-details');
const fieldsSection = document.getElementById('fields-section');
const fieldsCaption = document.getElementById('fields-caption');
const fieldRows = document.getElementById('field-rows');
const refreshBtn = document.getElementById('refresh');
const cexAuthEl = document.getElementById('cex-auth');
const cexStatusEl = document.getElementById('cex-status');
const hostForm = document.getElementById('cex-host-form');
const hostSelect = document.getElementById('cex-host');
const LOOPBACK_HOST_ALIASES = {
  'http://127.0.0.1': 'http://localhost',
  'http://127.0.0.1:8080': 'http://localhost',
  'http://localhost:8080': 'http://localhost',
};
const loginBtn = document.getElementById('cex-login');
const accountNameEl = document.getElementById('account-name');
const accountBtn = document.getElementById('account-button');
const logoutDialog = document.getElementById('logout-dialog');
const logoutConfirmBtn = document.getElementById('logout-confirm');
const settingsDialog = document.getElementById('settings-dialog');
const openSettingsBtn = document.getElementById('open-settings');
const closeSettingsBtn = document.getElementById('close-settings');
const workspaceSection = document.getElementById('workspace-features');
const workspaceSiteSection = document.getElementById('workspace-site-section');
const workspaceSiteForm = document.getElementById('workspace-site-form');
const workspaceSiteName = document.getElementById('workspace-site-name');
const workspaceSiteSelect = document.getElementById('workspace-site-select');
const workspaceStatus = document.getElementById('workspace-status');
const workspaceEmpty = document.getElementById('workspace-empty');
const workspaceGrid = document.getElementById('workspace-grid');

let pendingPkce = null;
let workspaceCatalog = { selected_site_id: null, sites: [] };

async function refreshPkce() {
  pendingPkce = await generatePkce();
}

refreshPkce();

function setCexStatus(state, message) {
  cexStatusEl.dataset.state = state;
  cexStatusEl.textContent = message;
  cexAuthEl.hidden = !message;
}

function syncAccountHeader(signedIn, name = '') {
  loginBtn.hidden = signedIn;
  accountBtn.hidden = !signedIn;
  accountNameEl.hidden = !signedIn || !name;
  accountNameEl.textContent = name;
  accountBtn.setAttribute('aria-label', name ? `Log out ${name}` : 'Log out');
}

function setLogoutExpanded(open) {
  accountBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
}

function enableLightDismiss(dialog) {
  if ('closedBy' in HTMLDialogElement.prototype) {
    return;
  }

  dialog.addEventListener('click', (event) => {
    if (event.target !== dialog) {
      return;
    }

    const rect = dialog.getBoundingClientRect();
    const inContent =
      rect.top <= event.clientY &&
      event.clientY <= rect.top + rect.height &&
      rect.left <= event.clientX &&
      event.clientX <= rect.left + rect.width;
    if (inContent) {
      return;
    }

    dialog.close();
  });
}

function hostSelectHasValue(value) {
  return [...hostSelect.options].some((option) => option.value === value);
}

function setHostSelectValue(host) {
  const value = LOOPBACK_HOST_ALIASES[host] || host;
  if (!hostSelectHasValue(value) && ALLOWED_API_ORIGINS.includes(value)) {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = value;
    hostSelect.append(option);
  }
  hostSelect.value = hostSelectHasValue(value) ? value : DEFAULT_API_HOST;
}

async function grantAndSaveHost(host) {
  assertAllowedApiHost(host);
  let granted;
  try {
    granted = await chrome.permissions.request({ origins: pluginOptionalOrigins(host) });
  } catch (err) {
    throw new Error(err.message || 'Could not request access to that server.');
  }
  if (!granted) {
    return { granted: false };
  }

  const { apiHost: previousHost } = await chrome.storage.local.get('apiHost');
  if (previousHost && previousHost !== host) {
    await chrome.storage.local.remove(PLUGIN_SESSION_KEYS);
  }

  await chrome.storage.local.set({ apiHost: host });
  setHostSelectValue(host);
  return { granted: true, previousHost };
}

async function loadCexAuth() {
  const apiHost = await ensureApiHost();
  const { apiToken, apiUserName } = await chrome.storage.local.get([
    'apiToken',
    'apiUserName',
  ]);
  setHostSelectValue(apiHost);

  syncAccountHeader(Boolean(apiToken), apiUserName || '');

  if (!apiToken) {
    setCexStatus('signed-out', 'Not signed in.');
    hideWorkspace();
    return;
  }

  setCexStatus('checking', apiUserName ? '' : 'Checking session…');

  try {
    const response = await fetch(`${apiHost}/api/plugin/me`, {
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${apiToken}`,
      },
    });

    if (response.status === 401) {
      await chrome.storage.local.remove(PLUGIN_SESSION_KEYS);
      syncAccountHeader(false);
      setCexStatus('signed-out', 'Session expired. Log in again.');
      hideWorkspace();
      return;
    }

    if (!response.ok) {
      throw new Error(`Could not load the signed-in user (${response.status}).`);
    }

    const user = await response.json();
    const name = user.name || user.email || 'Unknown user';
    await chrome.storage.local.set({ apiUserName: name });
    const { loginSuccessMessage } = await chrome.storage.session.get('loginSuccessMessage');
    if (loginSuccessMessage) {
      await chrome.storage.session.remove('loginSuccessMessage');
    }
    syncAccountHeader(true, name);
    setCexStatus('signed-in', loginSuccessMessage || '');
    await loadWorkspaceFeatures();
  } catch (err) {
    setCexStatus('error', err.message || 'Could not reach the server.');
    hideWorkspace();
  }
}

hostForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  let host;
  try {
    host = assertAllowedApiHost(hostSelect.value);
  } catch (err) {
    setCexStatus('error', err.message);
    return;
  }

  let granted;
  let previousHost;
  try {
    ({ granted, previousHost } = await grantAndSaveHost(host));
  } catch (err) {
    setCexStatus('error', err.message || 'Could not request access to that server.');
    return;
  }
  if (!granted) {
    setCexStatus('error', 'Host permission was not granted.');
    return;
  }

  await loadCexAuth();
  if (!previousHost || previousHost !== host) {
    setCexStatus('signed-out', 'Host saved. Log in to connect.');
  }
});

loginBtn.addEventListener('click', async () => {
  let host;
  try {
    host = assertAllowedApiHost(hostSelect.value || DEFAULT_API_HOST);
  } catch (err) {
    setCexStatus('error', err.message);
    return;
  }

  let granted;
  try {
    ({ granted } = await grantAndSaveHost(host));
  } catch (err) {
    setCexStatus('error', err.message || 'Could not request access to that server.');
    return;
  }
  if (!granted) {
    setCexStatus('error', 'Host permission was not granted.');
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

  setCexStatus('checking', 'Opening the sign-in window…');
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

if (!('commandForElement' in HTMLButtonElement.prototype)) {
  accountBtn.addEventListener('click', () => {
    if (!logoutDialog.open) {
      logoutDialog.showModal();
    }
    setLogoutExpanded(true);
  });
} else {
  accountBtn.addEventListener('click', () => {
    setLogoutExpanded(true);
  });
}

enableLightDismiss(logoutDialog);

let logoutPending = false;

logoutConfirmBtn.addEventListener('click', async () => {
  logoutPending = true;
  logoutDialog.close();
  try {
    await chrome.runtime.sendMessage({ type: 'PLUGIN_LOGOUT' });
    await loadCexAuth();
    if (!loginBtn.hidden) {
      loginBtn.focus();
    }
  } catch (err) {
    setCexStatus('error', err.message || 'Logout failed.');
  } finally {
    logoutPending = false;
  }
});

logoutDialog.addEventListener('close', () => {
  setLogoutExpanded(false);
  if (!logoutPending && !accountBtn.hidden) {
    accountBtn.focus();
  }
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && (changes.apiToken || changes.apiHost)) {
    loadCexAuth();
  }
});

function hideWorkspace() {
  workspaceSection.hidden = true;
  workspaceSiteSection.hidden = true;
  workspaceGrid.replaceChildren();
  workspaceEmpty.hidden = true;
  workspaceStatus.hidden = true;
  workspaceSiteSelect.replaceChildren();
  workspaceSiteName.textContent = '';
}

async function activeTabHttpUrl() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const url = tab?.url;
    if (!url || (!url.startsWith('http://') && !url.startsWith('https://'))) {
      return null;
    }
    return url;
  } catch {
    return null;
  }
}

function glyphFromMarkup(markup) {
  if (typeof markup !== 'string' || markup.trim() === '') return null;
  const parsed = new DOMParser().parseFromString(markup, 'image/svg+xml');
  if (parsed.querySelector('parsererror')) return null;
  const svg = parsed.documentElement;
  if (svg.namespaceURI !== 'http://www.w3.org/2000/svg' || svg.localName !== 'svg') {
    return null;
  }
  svg.setAttribute('class', 'feature-glyph');
  svg.setAttribute('aria-hidden', 'true');
  svg.removeAttribute('width');
  svg.removeAttribute('height');
  return document.importNode(svg, true);
}

function catalogSites() {
  return Array.isArray(workspaceCatalog.sites) ? workspaceCatalog.sites : [];
}

function selectedWorkspaceSite() {
  const sites = catalogSites();
  if (sites.length === 0) return null;
  const selectedId = Number(workspaceSiteSelect.value || workspaceCatalog.selected_site_id);
  return sites.find((site) => Number(site.id) === selectedId) || sites[0];
}

function renderWorkspaceGrid(site) {
  workspaceGrid.replaceChildren();
  const features = Array.isArray(site?.features) ? site.features : [];
  if (!site || features.length === 0) {
    workspaceEmpty.hidden = false;
    workspaceEmpty.textContent = site
      ? `No Workspace features are enabled for ${site.name}.`
      : 'No Workspace features are enabled for your assigned sites.';
    return;
  }

  workspaceEmpty.hidden = true;

  for (const feature of features) {
    const item = document.createElement('li');
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'feature-button';
    button.title = feature.description || feature.name;
    button.setAttribute('aria-label', `Open ${feature.name} in Workspace`);

    const plaque = document.createElement('span');
    plaque.className = 'feature-plaque';
    plaque.style.setProperty('--feature-accent', feature.accent || '#94a3b8');

    const glyph = glyphFromMarkup(feature.glyph);
    if (glyph) {
      plaque.append(glyph);
    }

    const label = document.createElement('span');
    label.className = 'feature-label';
    label.textContent = feature.name;

    button.append(plaque, label);
    button.addEventListener('click', () => {
      openWorkspaceFeature(site, feature);
    });
    item.append(button);
    workspaceGrid.append(item);
  }
}

function applySelectedWorkspaceSite() {
  const site = selectedWorkspaceSite();
  workspaceSiteName.textContent = site?.name || '';
  renderWorkspaceGrid(site);
}

function renderWorkspaceCatalog() {
  const sites = catalogSites();
  workspaceStatus.hidden = true;
  workspaceSection.hidden = false;

  if (sites.length === 0) {
    workspaceSiteSection.hidden = true;
    workspaceSiteSelect.replaceChildren();
    workspaceSiteName.textContent = '';
    renderWorkspaceGrid(null);
    return;
  }

  const previous = workspaceSiteSelect.value;
  workspaceSiteSelect.replaceChildren();
  for (const site of sites) {
    const option = document.createElement('option');
    option.value = String(site.id);
    option.textContent = site.name;
    workspaceSiteSelect.append(option);
  }

  const preferred = previous || String(workspaceCatalog.selected_site_id ?? sites[0].id);
  workspaceSiteSelect.value = sites.some((site) => String(site.id) === preferred)
    ? preferred
    : String(sites[0].id);

  workspaceSiteSection.hidden = sites.length < 2;
  applySelectedWorkspaceSite();
}

async function openWorkspaceFeature(site, feature) {
  const { apiHost } = await chrome.storage.local.get('apiHost');
  if (!apiHost) return;
  const path = feature?.url || site?.url || '/workspace';
  const url = new URL(path, apiHost).toString();
  await chrome.tabs.create({ url });
}

async function loadWorkspaceFeatures() {
  if (!SHOW_WORKSPACE_GRID) {
    hideWorkspace();
    return;
  }

  const { apiHost, apiToken } = await chrome.storage.local.get(['apiHost', 'apiToken']);
  if (!apiHost || !apiToken) {
    hideWorkspace();
    return;
  }

  workspaceSection.hidden = false;
  workspaceStatus.hidden = false;
  workspaceStatus.textContent = 'Loading Workspace features…';
  workspaceEmpty.hidden = true;
  workspaceGrid.replaceChildren();
  workspaceSiteSection.hidden = true;
  workspaceSiteName.textContent = '';

  try {
    const tabUrl = await activeTabHttpUrl();
    const endpoint = new URL('/api/plugin/workspace', apiHost);
    if (tabUrl) {
      endpoint.searchParams.set('url', tabUrl);
    }

    const response = await fetch(endpoint, {
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${apiToken}`,
      },
    });

    if (response.status === 401) {
      hideWorkspace();
      return;
    }

    if (!response.ok) {
      throw new Error(`Could not load Workspace features (${response.status}).`);
    }

    const payload = await response.json();
    workspaceCatalog = {
      selected_site_id: payload?.selected_site_id ?? null,
      sites: Array.isArray(payload?.sites) ? payload.sites : [],
    };
    renderWorkspaceCatalog();
  } catch (err) {
    workspaceStatus.hidden = false;
    workspaceStatus.textContent = err.message || 'Could not load Workspace features.';
  }
}

workspaceSiteForm.addEventListener('submit', (event) => {
  event.preventDefault();
});

workspaceSiteSelect.addEventListener('change', () => {
  applySelectedWorkspaceSite();
});

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

function setSettingsExpanded(open) {
  openSettingsBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
}

openSettingsBtn.addEventListener('click', () => {
  settingsDialog.showModal();
  setSettingsExpanded(true);
});

closeSettingsBtn.addEventListener('click', () => {
  settingsDialog.close();
});

settingsDialog.addEventListener('close', () => {
  setSettingsExpanded(false);
  openSettingsBtn.focus();
});

loadCexAuth();
loadSession();
