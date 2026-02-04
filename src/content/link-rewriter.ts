import { isCoinMarketCapUrl, buildCoinGeckoUrl, extractCmcSlug } from '../shared/url-tools';

const PROCESSED_ATTR = 'data-sourceswitch-processed';
const BANNER_ID = 'sourceswitch-notification-banner';

interface RewriteRecord {
  original: string;
  rewritten: string;
}

const rewrittenLinks: RewriteRecord[] = [];
let showNotifications = true;
let rewriteExceptions: string[] = [];
let isExcludedSite = false;

async function loadSettings() {
  try {
    const result = await chrome.storage.local.get(['showRewriteNotifications', 'rewriteExceptions']);
    showNotifications = result.showRewriteNotifications ?? true;
    rewriteExceptions = result.rewriteExceptions || [];

    // Check if current site is excluded
    const currentDomain = window.location.hostname;
    isExcludedSite = rewriteExceptions.some((exception) =>
      currentDomain === exception || currentDomain.endsWith('.' + exception)
    );
  } catch {
    showNotifications = true;
    rewriteExceptions = [];
    isExcludedSite = false;
  }
}

async function logRewriteEvent(originalUrl: string, _rewrittenUrl: string) {
  try {
    const storage = await chrome.storage.local.get(['events']);
    const events = storage.events || [];
    events.push({
      type: 'link_rewritten',
      url: originalUrl,
      domain: window.location.hostname,
      timestamp: Date.now(),
    });
    // Keep max 500 events
    if (events.length > 500) {
      events.splice(0, events.length - 500);
    }
    await chrome.storage.local.set({ events });
  } catch {
    // Ignore errors
  }
}

function processLink(link: HTMLAnchorElement) {
  if (link.hasAttribute(PROCESSED_ATTR)) return;
  link.setAttribute(PROCESSED_ATTR, 'true');

  // Skip if this site is excluded from rewriting
  if (isExcludedSite) return;

  const href = link.href;
  if (!href || !isCoinMarketCapUrl(href)) return;

  const geckoUrl = buildCoinGeckoUrl(href);
  let newUrl: string;

  if (geckoUrl) {
    newUrl = geckoUrl;
    link.href = geckoUrl;
    link.title = `Redirected from CoinMarketCap to CoinGecko`;
  } else {
    const slug = extractCmcSlug(href);
    if (slug) {
      newUrl = `https://www.coingecko.com/en/search?query=${encodeURIComponent(slug)}`;
      link.href = newUrl;
      link.title = `Search on CoinGecko`;
    } else {
      newUrl = 'https://www.coingecko.com';
      link.href = newUrl;
      link.title = `Redirected to CoinGecko`;
    }
  }

  rewrittenLinks.push({
    original: href,
    rewritten: newUrl,
  });

  // Log the rewrite event
  logRewriteEvent(href, newUrl);
}

function processAllLinks() {
  const links = document.querySelectorAll<HTMLAnchorElement>(`a[href*="coinmarketcap.com"]:not([${PROCESSED_ATTR}])`);
  const countBefore = rewrittenLinks.length;
  links.forEach(processLink);

  if (showNotifications && rewrittenLinks.length > countBefore) {
    updateBanner();
  }
}

function createBanner(): HTMLElement {
  const banner = document.createElement('div');
  banner.id = BANNER_ID;
  banner.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    max-width: 380px;
    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
    color: #e0e0e0;
    padding: 16px 20px;
    border-radius: 12px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 14px;
    z-index: 2147483647;
    border: 1px solid rgba(78, 205, 196, 0.3);
    animation: sourceswitch-slide-in 0.3s ease-out;
  `;

  // Add animation keyframes
  const style = document.createElement('style');
  style.textContent = `
    @keyframes sourceswitch-slide-in {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
  `;
  document.head.appendChild(style);

  return banner;
}

function updateBanner() {
  let banner = document.getElementById(BANNER_ID);

  if (!banner) {
    banner = createBanner();
    document.body.appendChild(banner);
  }

  const count = rewrittenLinks.length;

  banner.innerHTML = `
    <div style="display: flex; align-items: flex-start; gap: 12px;">
      <div style="color: #4ecdc4; font-size: 20px; line-height: 1;">🔄</div>
      <div style="flex: 1;">
        <div style="font-weight: 600; color: #fff; margin-bottom: 6px;">
          SourceSwitch Active
        </div>
        <div style="color: #a0a0a0; line-height: 1.4;">
          ${count} link${count !== 1 ? 's' : ''} to CoinMarketCap ${count !== 1 ? 'have' : 'has'} been rewritten to CoinGecko.
        </div>
        <div style="margin-top: 10px; display: flex; gap: 10px;">
          <button id="sourceswitch-view-log" style="
            background: rgba(78, 205, 196, 0.2);
            color: #4ecdc4;
            border: 1px solid rgba(78, 205, 196, 0.5);
            padding: 6px 12px;
            border-radius: 6px;
            font-size: 12px;
            cursor: pointer;
            font-family: inherit;
          ">View details</button>
          <button id="sourceswitch-dismiss" style="
            background: transparent;
            color: #888;
            border: 1px solid rgba(255, 255, 255, 0.2);
            padding: 6px 12px;
            border-radius: 6px;
            font-size: 12px;
            cursor: pointer;
            font-family: inherit;
          ">Dismiss</button>
        </div>
      </div>
    </div>
  `;

  // Add event listeners
  document.getElementById('sourceswitch-view-log')?.addEventListener('click', showLogModal);
  document.getElementById('sourceswitch-dismiss')?.addEventListener('click', () => {
    banner?.remove();
  });
}

function showLogModal() {
  // Remove existing modal if any
  document.getElementById('sourceswitch-log-modal')?.remove();

  const modal = document.createElement('div');
  modal.id = 'sourceswitch-log-modal';
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 2147483647;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  `;

  const content = document.createElement('div');
  content.style.cssText = `
    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
    color: #e0e0e0;
    padding: 24px;
    border-radius: 16px;
    max-width: 600px;
    max-height: 80vh;
    overflow: auto;
    border: 1px solid rgba(78, 205, 196, 0.3);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  `;

  const logEntries = rewrittenLinks.map((entry, i) => `
    <div style="
      background: rgba(0, 0, 0, 0.3);
      padding: 12px;
      border-radius: 8px;
      margin-bottom: 8px;
      font-size: 12px;
    ">
      <div style="color: #ff6b6b; margin-bottom: 4px;">
        <span style="color: #888;">${i + 1}.</span> Original:
      </div>
      <div style="color: #888; word-break: break-all; margin-bottom: 8px; padding-left: 16px;">
        ${escapeHtml(entry.original)}
      </div>
      <div style="color: #4ecdc4; margin-bottom: 4px;">
        → Rewritten to:
      </div>
      <div style="color: #4ecdc4; word-break: break-all; padding-left: 16px;">
        ${escapeHtml(entry.rewritten)}
      </div>
    </div>
  `).join('');

  content.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
      <h2 style="margin: 0; color: #fff; font-size: 18px;">Rewritten Links on This Page</h2>
      <button id="sourceswitch-close-modal" style="
        background: transparent;
        border: none;
        color: #888;
        font-size: 24px;
        cursor: pointer;
        padding: 0;
        line-height: 1;
      ">×</button>
    </div>
    <div style="
      background: rgba(78, 205, 196, 0.1);
      border: 1px solid rgba(78, 205, 196, 0.3);
      border-radius: 8px;
      padding: 12px;
      margin-bottom: 16px;
      font-size: 13px;
      color: #4ecdc4;
    ">
      This page contained ${rewrittenLinks.length} link${rewrittenLinks.length !== 1 ? 's' : ''} to CoinMarketCap.
      SourceSwitch automatically rewrote ${rewrittenLinks.length === 1 ? 'it' : 'them'} to point to CoinGecko instead.
      <br><br>
      <strong>Why?</strong> You chose to block CoinMarketCap. These rewrites ensure you can still access
      cryptocurrency data through an alternative source.
    </div>
    <div style="max-height: 300px; overflow-y: auto;">
      ${logEntries || '<p style="color: #888;">No links rewritten yet.</p>'}
    </div>
    <div style="margin-top: 16px; text-align: right;">
      <button id="sourceswitch-open-settings" style="
        background: #4ecdc4;
        color: #1a1a2e;
        border: none;
        padding: 10px 20px;
        border-radius: 8px;
        font-size: 14px;
        cursor: pointer;
        font-family: inherit;
        font-weight: 500;
      ">Open Settings</button>
    </div>
  `;

  modal.appendChild(content);
  document.body.appendChild(modal);

  // Event listeners
  document.getElementById('sourceswitch-close-modal')?.addEventListener('click', () => modal.remove());
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.remove();
  });
  document.getElementById('sourceswitch-open-settings')?.addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'OPEN_OPTIONS' });
    modal.remove();
  });
}

function escapeHtml(str: string): string {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

async function init() {
  await loadSettings();
  processAllLinks();

  const observer = new MutationObserver((mutations) => {
    let shouldProcess = false;

    for (const mutation of mutations) {
      if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
        shouldProcess = true;
        break;
      }
    }

    if (shouldProcess) {
      requestAnimationFrame(processAllLinks);
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
