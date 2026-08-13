const statusEl = document.getElementById('connection-status');
const detailsEl = document.getElementById('session-details');
const fieldsSection = document.getElementById('fields-section');
const fieldsCaption = document.getElementById('fields-caption');
const fieldRows = document.getElementById('field-rows');
const refreshBtn = document.getElementById('refresh');

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

loadSession();
