import { getAlternativeInfo, extractDomain, getBlockedDomainName } from '../../shared/url-tools';
import { addAllowlistEntry, logEvent } from '../../shared/storage';

const TEN_MINUTES_MS = 10 * 60 * 1000;

function getBlockedUrl(): string {
  const params = new URLSearchParams(window.location.search);

  // Try to get full URL first
  const url = params.get('url') || '';
  if (url) {
    try {
      return decodeURIComponent(url);
    } catch {
      return url;
    }
  }

  // Fallback: get blocked domain and reconstruct URL
  const blockedDomain = params.get('blocked') || '';
  if (blockedDomain) {
    return `https://${blockedDomain}/`;
  }

  return '';
}

async function updateRulesAndNavigate(url: string) {
  // Tell service worker to update rules
  await chrome.runtime.sendMessage({ type: 'RULES_UPDATED' });
  // Small delay to ensure rules are applied
  await new Promise(r => setTimeout(r, 100));
  // Navigate
  window.location.href = url;
}

function init() {
  const blockedUrl = getBlockedUrl();
  const domain = extractDomain(blockedUrl);
  const siteName = getBlockedDomainName(blockedUrl);

  // Update UI elements
  const urlElement = document.getElementById('blocked-url');
  const siteNameElement = document.getElementById('site-name');
  const domainBadge = document.getElementById('domain-badge');
  const alternativeSection = document.getElementById('alternative-section');
  const primaryBtn = document.getElementById('primary-btn') as HTMLButtonElement;
  const secondaryBtn = document.getElementById('secondary-btn') as HTMLButtonElement;
  const allowOnceBtn = document.getElementById('allow-once-btn') as HTMLButtonElement;
  const allowTempBtn = document.getElementById('allow-temp-btn') as HTMLButtonElement;
  const settingsBtn = document.getElementById('settings-btn') as HTMLButtonElement;

  // Show the blocked URL
  if (urlElement) {
    if (blockedUrl) {
      urlElement.textContent = blockedUrl;
    } else {
      urlElement.textContent = 'URL not captured';
      urlElement.style.opacity = '0.5';
    }
  }

  // Show site name
  if (siteNameElement) {
    siteNameElement.textContent = siteName !== 'Unknown' ? siteName : domain || 'this site';
  }

  // Show domain badge
  if (domainBadge && domain) {
    domainBadge.textContent = domain;
  }

  // Handle alternatives (CMC -> CoinGecko)
  const alternative = getAlternativeInfo(blockedUrl);

  if (alternative.hasAlternative && alternativeSection) {
    alternativeSection.classList.remove('hidden');

    if (alternative.primaryButton && alternative.primaryUrl) {
      primaryBtn.textContent = alternative.primaryButton;
      primaryBtn.addEventListener('click', () => {
        window.location.href = alternative.primaryUrl!;
      });
    } else {
      primaryBtn.classList.add('hidden');
    }

    if (alternative.secondaryButton && alternative.secondaryUrl) {
      secondaryBtn.textContent = alternative.secondaryButton;
      secondaryBtn.classList.remove('hidden');
      secondaryBtn.addEventListener('click', () => {
        window.location.href = alternative.secondaryUrl!;
      });
    }
  }

  // Bypass buttons - only work if we have a valid URL
  if (!blockedUrl || !domain) {
    allowOnceBtn.disabled = true;
    allowTempBtn.disabled = true;
    allowOnceBtn.title = 'Cannot bypass - URL not captured';
    allowTempBtn.title = 'Cannot bypass - URL not captured';
  } else {
    allowOnceBtn.addEventListener('click', async () => {
      allowOnceBtn.disabled = true;
      allowOnceBtn.textContent = 'Allowing...';

      await addAllowlistEntry(domain, 5000); // 5 seconds for "once"
      await logEvent({
        type: 'bypass_granted',
        url: blockedUrl,
        domain,
      });
      await updateRulesAndNavigate(blockedUrl);
    });

    allowTempBtn.addEventListener('click', async () => {
      allowTempBtn.disabled = true;
      allowTempBtn.textContent = 'Allowing...';

      await addAllowlistEntry(domain, TEN_MINUTES_MS);
      await logEvent({
        type: 'bypass_granted',
        url: blockedUrl,
        domain,
      });
      await updateRulesAndNavigate(blockedUrl);
    });
  }

  settingsBtn.addEventListener('click', () => {
    // Get extension ID from current URL and navigate to options
    const extensionId = chrome.runtime.id;
    window.location.href = `chrome-extension://${extensionId}/pages/options/options.html`;
  });

  // Log the block event
  if (blockedUrl && domain) {
    logEvent({
      type: 'blocked_navigation',
      url: blockedUrl,
      domain,
    });
  }
}

document.addEventListener('DOMContentLoaded', init);
