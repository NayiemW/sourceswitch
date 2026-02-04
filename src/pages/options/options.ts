import { getAllPresets } from '../../shared/presets';
import {
  getStorage,
  setPresetEnabled,
  getStrictMode,
  setStrictMode,
  getGlobalRewriting,
  setGlobalRewriting,
  getShowRewriteNotifications,
  setShowRewriteNotifications,
  getAllowlist,
  removeAllowlistEntry,
  getCustomBlockedDomains,
  addCustomBlockedDomain,
  removeCustomBlockedDomain,
  getCustomBlockedApis,
  addCustomBlockedApi,
  removeCustomBlockedApi,
  getRewriteExceptions,
  addRewriteException,
  removeRewriteException,
  getEvents,
  clearEvents,
  exportData,
  importData,
} from '../../shared/storage';
import { initI18n, getMessage, applyI18nToPage, setLanguage, getLanguage } from '../../shared/i18n';

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

async function init() {
  // Initialize i18n first
  await initI18n();
  applyI18nToPage();

  // Set up language selector
  const languageSelect = document.getElementById('language-select') as HTMLSelectElement;
  if (languageSelect) {
    languageSelect.value = getLanguage();
    languageSelect.addEventListener('change', async () => {
      await setLanguage(languageSelect.value as 'system' | 'en' | 'tr');
      window.location.reload();
    });
  }

  await renderPresets();
  await renderOptions();
  await renderCustomDomains();
  await renderCustomApis();
  await renderRewriteExceptions();
  await renderAllowlist();
  await renderStats();
  setupEventListeners();
  setupCustomDomainsListeners();
  setupCustomApisListeners();
  setupRewriteExceptionsListeners();
}

async function renderPresets() {
  const container = document.getElementById('presets-list');
  if (!container) return;

  const presets = getAllPresets();
  const storage = await getStorage();

  container.innerHTML = presets
    .map(
      (preset) => `
    <div class="preset-item">
      <span class="preset-name">${preset.displayName}</span>
      <label class="toggle">
        <input type="checkbox" data-preset-id="${preset.id}" ${storage.presets[preset.id]?.enabled ? 'checked' : ''}>
        <span class="slider"></span>
      </label>
    </div>
  `
    )
    .join('');

  container.querySelectorAll('input[data-preset-id]').forEach((input) => {
    input.addEventListener('change', async (e) => {
      const target = e.target as HTMLInputElement;
      const presetId = target.dataset.presetId!;
      await setPresetEnabled(presetId, target.checked);
      await chrome.runtime.sendMessage({ type: 'RULES_UPDATED' });
    });
  });
}

async function renderOptions() {
  const strictModeToggle = document.getElementById('strict-mode-toggle') as HTMLInputElement;
  const globalRewriteToggle = document.getElementById('global-rewrite-toggle') as HTMLInputElement;
  const notificationsToggle = document.getElementById('show-notifications-toggle') as HTMLInputElement;

  if (strictModeToggle) {
    strictModeToggle.checked = await getStrictMode();
    strictModeToggle.addEventListener('change', async () => {
      await setStrictMode(strictModeToggle.checked);
      await chrome.runtime.sendMessage({ type: 'RULES_UPDATED' });
    });
  }

  if (globalRewriteToggle) {
    globalRewriteToggle.checked = await getGlobalRewriting();
    globalRewriteToggle.addEventListener('change', async () => {
      if (globalRewriteToggle.checked) {
        const granted = await chrome.permissions.request({
          origins: ['*://*/*'],
        });
        if (!granted) {
          globalRewriteToggle.checked = false;
          return;
        }
      }
      await setGlobalRewriting(globalRewriteToggle.checked);
      await chrome.runtime.sendMessage({ type: 'REWRITING_UPDATED' });
    });
  }

  if (notificationsToggle) {
    notificationsToggle.checked = await getShowRewriteNotifications();
    notificationsToggle.addEventListener('change', async () => {
      await setShowRewriteNotifications(notificationsToggle.checked);
    });
  }
}

async function renderAllowlist() {
  const container = document.getElementById('allowlist');
  if (!container) return;

  const allowlist = await getAllowlist();

  if (allowlist.length === 0) {
    container.innerHTML = `<p class="empty-state">${getMessage('noSitesBypassed')}</p>`;
    return;
  }

  // Clear container and build DOM safely
  container.innerHTML = '';

  for (const entry of allowlist) {
    const expiry = entry.expiresAt
      ? `Expires ${new Date(entry.expiresAt).toLocaleTimeString()}`
      : 'Permanent';

    const item = document.createElement('div');
    item.className = 'allowlist-item';

    const info = document.createElement('div');

    const domainSpan = document.createElement('span');
    domainSpan.className = 'allowlist-domain';
    domainSpan.textContent = entry.domain; // Safe: textContent escapes HTML

    const expirySpan = document.createElement('span');
    expirySpan.className = 'allowlist-expiry';
    expirySpan.textContent = expiry;

    info.appendChild(domainSpan);
    info.appendChild(expirySpan);

    const removeBtn = document.createElement('button');
    removeBtn.className = 'allowlist-remove';
    removeBtn.textContent = getMessage('remove');
    removeBtn.addEventListener('click', async () => {
      await removeAllowlistEntry(entry.domain);
      await chrome.runtime.sendMessage({ type: 'RULES_UPDATED' });
      await renderAllowlist();
    });

    item.appendChild(info);
    item.appendChild(removeBtn);
    container.appendChild(item);
  }
}

async function renderStats() {
  const blockedEl = document.getElementById('stat-blocked');
  const bypassedEl = document.getElementById('stat-bypassed');
  const rewrittenEl = document.getElementById('stat-rewritten');

  const since = Date.now() - SEVEN_DAYS_MS;
  const events = await getEvents(since);

  const blocked = events.filter((e) => e.type === 'blocked_navigation').length;
  const bypassed = events.filter((e) => e.type === 'bypass_granted').length;
  const rewritten = events.filter((e) => e.type === 'link_rewritten').length;

  if (blockedEl) blockedEl.textContent = String(blocked);
  if (bypassedEl) bypassedEl.textContent = String(bypassed);
  if (rewrittenEl) rewrittenEl.textContent = String(rewritten);
}

async function renderCustomDomains() {
  const container = document.getElementById('custom-domains-list');
  if (!container) return;

  const domains = await getCustomBlockedDomains();

  if (domains.length === 0) {
    container.innerHTML = `<p class="empty-state">${getMessage('noCustomDomains')}</p>`;
    return;
  }

  container.innerHTML = '';

  for (const entry of domains) {
    const item = document.createElement('div');
    item.className = 'list-item';

    const text = document.createElement('span');
    text.className = 'list-item-text';
    text.textContent = entry.domain;

    const removeBtn = document.createElement('button');
    removeBtn.className = 'list-item-remove';
    removeBtn.textContent = getMessage('remove');
    removeBtn.addEventListener('click', async () => {
      await removeCustomBlockedDomain(entry.domain);
      await chrome.runtime.sendMessage({ type: 'RULES_UPDATED' });
      await renderCustomDomains();
    });

    item.appendChild(text);
    item.appendChild(removeBtn);
    container.appendChild(item);
  }
}

async function renderCustomApis() {
  const container = document.getElementById('custom-apis-list');
  if (!container) return;

  const apis = await getCustomBlockedApis();

  if (apis.length === 0) {
    container.innerHTML = `<p class="empty-state">${getMessage('noCustomApis')}</p>`;
    return;
  }

  container.innerHTML = '';

  for (const entry of apis) {
    const item = document.createElement('div');
    item.className = 'list-item';

    const text = document.createElement('span');
    text.className = 'list-item-text';
    text.textContent = entry.endpoint;

    const removeBtn = document.createElement('button');
    removeBtn.className = 'list-item-remove';
    removeBtn.textContent = getMessage('remove');
    removeBtn.addEventListener('click', async () => {
      await removeCustomBlockedApi(entry.endpoint);
      await chrome.runtime.sendMessage({ type: 'RULES_UPDATED' });
      await renderCustomApis();
    });

    item.appendChild(text);
    item.appendChild(removeBtn);
    container.appendChild(item);
  }
}

function setupCustomDomainsListeners() {
  const input = document.getElementById('add-domain-input') as HTMLInputElement;
  const addBtn = document.getElementById('add-domain-btn');

  if (!input || !addBtn) return;

  const addDomain = async () => {
    const domain = input.value.trim().toLowerCase();
    if (!domain) return;

    // Basic validation
    if (!/^[a-zA-Z0-9][a-zA-Z0-9.-]*[a-zA-Z0-9]$/.test(domain)) {
      alert(getMessage('invalidDomainFormat'));
      return;
    }

    await addCustomBlockedDomain(domain);
    await chrome.runtime.sendMessage({ type: 'RULES_UPDATED' });
    input.value = '';
    await renderCustomDomains();
  };

  addBtn.addEventListener('click', addDomain);
  input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') addDomain();
  });
}

function setupCustomApisListeners() {
  const input = document.getElementById('add-api-input') as HTMLInputElement;
  const addBtn = document.getElementById('add-api-btn');

  if (!input || !addBtn) return;

  const addApi = async () => {
    const endpoint = input.value.trim().toLowerCase();
    if (!endpoint) return;

    // Basic validation - allow domains and paths
    if (!/^[a-zA-Z0-9][a-zA-Z0-9./-]*[a-zA-Z0-9]$/.test(endpoint)) {
      alert(getMessage('invalidApiFormat'));
      return;
    }

    await addCustomBlockedApi(endpoint);
    await chrome.runtime.sendMessage({ type: 'RULES_UPDATED' });
    input.value = '';
    await renderCustomApis();
  };

  addBtn.addEventListener('click', addApi);
  input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') addApi();
  });
}

async function renderRewriteExceptions() {
  const container = document.getElementById('rewrite-exceptions-list');
  if (!container) return;

  const exceptions = await getRewriteExceptions();

  if (exceptions.length === 0) {
    container.innerHTML = `<p class="empty-state">${getMessage('noExceptions')}</p>`;
    return;
  }

  container.innerHTML = '';

  for (const domain of exceptions) {
    const item = document.createElement('div');
    item.className = 'list-item';

    const text = document.createElement('span');
    text.className = 'list-item-text';
    text.textContent = domain;

    const removeBtn = document.createElement('button');
    removeBtn.className = 'list-item-remove';
    removeBtn.textContent = getMessage('remove');
    removeBtn.addEventListener('click', async () => {
      await removeRewriteException(domain);
      await renderRewriteExceptions();
    });

    item.appendChild(text);
    item.appendChild(removeBtn);
    container.appendChild(item);
  }
}

function setupRewriteExceptionsListeners() {
  const input = document.getElementById('add-exception-input') as HTMLInputElement;
  const addBtn = document.getElementById('add-exception-btn');

  if (!input || !addBtn) return;

  const addException = async () => {
    const domain = input.value.trim().toLowerCase();
    if (!domain) return;

    if (!/^[a-zA-Z0-9][a-zA-Z0-9.-]*[a-zA-Z0-9]$/.test(domain)) {
      alert(getMessage('invalidDomainFormat'));
      return;
    }

    await addRewriteException(domain);
    input.value = '';
    await renderRewriteExceptions();
  };

  addBtn.addEventListener('click', addException);
  input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') addException();
  });
}

function setupEventListeners() {
  const exportBtn = document.getElementById('export-btn');
  const importBtn = document.getElementById('import-btn');
  const importFile = document.getElementById('import-file') as HTMLInputElement;
  const clearBtn = document.getElementById('clear-btn');

  exportBtn?.addEventListener('click', async () => {
    const data = await exportData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sourceswitch-backup-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  });

  importBtn?.addEventListener('click', () => {
    importFile?.click();
  });

  importFile?.addEventListener('change', async () => {
    const file = importFile.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      await importData(text);
      window.location.reload();
    } catch {
      alert(getMessage('importFailed'));
    }
  });

  clearBtn?.addEventListener('click', async () => {
    if (confirm(getMessage('confirmClearHistory'))) {
      await clearEvents();
      await renderStats();
    }
  });
}

document.addEventListener('DOMContentLoaded', init);
