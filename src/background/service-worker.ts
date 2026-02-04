import { getStorage, getStrictMode, getGlobalRewriting, getAllowlist, getCustomBlockedDomains, getCustomBlockedApis } from '../shared/storage';
import { PRESETS } from '../shared/presets';

const BLOCK_RULE_ID_START = 1;
const CUSTOM_BLOCK_RULE_ID_START = 100;
const ALLOWLIST_RULE_ID_START = 500;
const STRICT_MODE_RULE_ID_START = 1000;
const CUSTOM_API_RULE_ID_START = 2000;

// Default domains to block (main frame navigation)
const DEFAULT_BLOCKED_DOMAINS = [
  'binance.com',
  'binance.us',
  'coinmarketcap.com',
  'trustwallet.com',
];

chrome.runtime.onInstalled.addListener(async () => {
  await updateDynamicRules();
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'RULES_UPDATED') {
    updateDynamicRules().then(() => sendResponse({ success: true }));
    return true;
  }

  if (message.type === 'REWRITING_UPDATED') {
    updateContentScriptRegistration().then(() => sendResponse({ success: true }));
    return true;
  }

  if (message.type === 'OPEN_OPTIONS') {
    chrome.runtime.openOptionsPage();
    sendResponse({ success: true });
    return true;
  }

  return false;
});

async function updateDynamicRules() {
  const storage = await getStorage();
  const strictMode = await getStrictMode();
  const allowlist = await getAllowlist();
  const customDomains = await getCustomBlockedDomains();
  const customApis = await getCustomBlockedApis();
  const extensionId = chrome.runtime.id;

  // Get all existing dynamic rules
  const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
  const existingRuleIds = existingRules.map((r) => r.id);

  // Remove all existing rules
  if (existingRuleIds.length > 0) {
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: existingRuleIds,
    });
  }

  const newRules: chrome.declarativeNetRequest.Rule[] = [];

  // Create allowlist rules (highest priority)
  let ruleId = ALLOWLIST_RULE_ID_START;
  for (const entry of allowlist) {
    newRules.push({
      id: ruleId++,
      priority: 100, // Highest priority
      action: { type: 'allow' as chrome.declarativeNetRequest.RuleActionType },
      condition: {
        urlFilter: `||${entry.domain}`,
        resourceTypes: ['main_frame' as chrome.declarativeNetRequest.ResourceType],
      },
    });
  }

  // Create blocking rules for default domains
  ruleId = BLOCK_RULE_ID_START;
  for (const domain of DEFAULT_BLOCKED_DOMAINS) {
    const blockedPageUrl = `chrome-extension://${extensionId}/pages/blocked/blocked.html?blocked=${encodeURIComponent(domain)}`;

    newRules.push({
      id: ruleId++,
      priority: 1,
      action: {
        type: 'redirect' as chrome.declarativeNetRequest.RuleActionType,
        redirect: { url: blockedPageUrl },
      },
      condition: {
        urlFilter: `||${domain}`,
        resourceTypes: ['main_frame' as chrome.declarativeNetRequest.ResourceType],
      },
    });
  }

  // Create blocking rules for custom domains
  ruleId = CUSTOM_BLOCK_RULE_ID_START;
  for (const entry of customDomains) {
    const blockedPageUrl = `chrome-extension://${extensionId}/pages/blocked/blocked.html?blocked=${encodeURIComponent(entry.domain)}`;

    newRules.push({
      id: ruleId++,
      priority: 1,
      action: {
        type: 'redirect' as chrome.declarativeNetRequest.RuleActionType,
        redirect: { url: blockedPageUrl },
      },
      condition: {
        urlFilter: `||${entry.domain}`,
        resourceTypes: ['main_frame' as chrome.declarativeNetRequest.ResourceType],
      },
    });
  }

  // Add strict mode rules if enabled
  if (strictMode) {
    ruleId = STRICT_MODE_RULE_ID_START;
    for (const presetId of Object.keys(storage.presets)) {
      if (!storage.presets[presetId]?.enabled) continue;

      const preset = PRESETS[presetId];
      if (!preset) continue;

      for (const endpoint of preset.apiEndpoints) {
        newRules.push({
          id: ruleId++,
          priority: 5,
          action: { type: 'block' as chrome.declarativeNetRequest.RuleActionType },
          condition: {
            urlFilter: `||${endpoint}`,
            resourceTypes: [
              'xmlhttprequest' as chrome.declarativeNetRequest.ResourceType,
              'script' as chrome.declarativeNetRequest.ResourceType,
              'image' as chrome.declarativeNetRequest.ResourceType,
              'stylesheet' as chrome.declarativeNetRequest.ResourceType,
              'font' as chrome.declarativeNetRequest.ResourceType,
              'media' as chrome.declarativeNetRequest.ResourceType,
              'other' as chrome.declarativeNetRequest.ResourceType,
            ],
          },
        });
      }
    }

    // Add custom API blocking rules
    ruleId = CUSTOM_API_RULE_ID_START;
    for (const entry of customApis) {
      newRules.push({
        id: ruleId++,
        priority: 5,
        action: { type: 'block' as chrome.declarativeNetRequest.RuleActionType },
        condition: {
          urlFilter: `||${entry.endpoint}`,
          resourceTypes: [
            'xmlhttprequest' as chrome.declarativeNetRequest.ResourceType,
            'script' as chrome.declarativeNetRequest.ResourceType,
            'image' as chrome.declarativeNetRequest.ResourceType,
            'stylesheet' as chrome.declarativeNetRequest.ResourceType,
            'font' as chrome.declarativeNetRequest.ResourceType,
            'media' as chrome.declarativeNetRequest.ResourceType,
            'other' as chrome.declarativeNetRequest.ResourceType,
          ],
        },
      });
    }
  }

  // Apply new rules
  if (newRules.length > 0) {
    await chrome.declarativeNetRequest.updateDynamicRules({
      addRules: newRules,
    });
  }
}

async function updateContentScriptRegistration() {
  const globalRewriting = await getGlobalRewriting();

  try {
    await chrome.scripting.unregisterContentScripts({ ids: ['link-rewriter'] });
  } catch {
    // Script not registered, ignore
  }

  if (globalRewriting) {
    await chrome.scripting.registerContentScripts([
      {
        id: 'link-rewriter',
        matches: ['<all_urls>'],
        excludeMatches: [
          '*://*.binance.com/*',
          '*://binance.us/*',
          '*://*.binance.us/*',
          '*://coinmarketcap.com/*',
          '*://*.coinmarketcap.com/*',
          '*://trustwallet.com/*',
          '*://*.trustwallet.com/*',
        ],
        js: ['content/link-rewriter.js'],
        runAt: 'document_idle',
      },
    ]);
  }
}
