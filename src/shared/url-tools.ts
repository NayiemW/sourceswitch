const SLUG_OVERRIDES: Record<string, string> = {
  binancecoin: 'binancecoin',
  bitcoin: 'bitcoin',
  ethereum: 'ethereum',
  solana: 'solana',
};

export function extractDomain(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.hostname;
  } catch {
    return '';
  }
}

export function extractBaseDomain(url: string): string {
  const domain = extractDomain(url);
  const parts = domain.split('.');
  if (parts.length <= 2) return domain;
  return parts.slice(-2).join('.');
}

export function isCoinMarketCapUrl(url: string): boolean {
  const domain = extractDomain(url);
  return domain === 'coinmarketcap.com' || domain.endsWith('.coinmarketcap.com');
}

export function isBinanceUrl(url: string): boolean {
  const domain = extractDomain(url);
  return (
    domain === 'binance.com' ||
    domain.endsWith('.binance.com') ||
    domain === 'binance.us' ||
    domain.endsWith('.binance.us')
  );
}

export function isTrustWalletUrl(url: string): boolean {
  const domain = extractDomain(url);
  return domain === 'trustwallet.com' || domain.endsWith('.trustwallet.com');
}

export function extractCmcSlug(url: string): string | null {
  const match = url.match(/coinmarketcap\.com\/currencies\/([a-z0-9-]+)/i);
  return match ? match[1].toLowerCase() : null;
}

export function buildCoinGeckoUrl(cmcUrl: string): string | null {
  const slug = extractCmcSlug(cmcUrl);
  if (!slug) return null;

  const override = SLUG_OVERRIDES[slug];
  return `https://www.coingecko.com/en/coins/${override || slug}`;
}

export function buildCoinGeckoSearchUrl(query: string): string {
  return `https://www.coingecko.com/en/search?query=${encodeURIComponent(query)}`;
}

export function isBlockedDomain(url: string): boolean {
  return isCoinMarketCapUrl(url) || isBinanceUrl(url) || isTrustWalletUrl(url);
}

export function getBlockedDomainName(url: string): string {
  if (isCoinMarketCapUrl(url)) return 'CoinMarketCap';
  if (isBinanceUrl(url)) return 'Binance';
  if (isTrustWalletUrl(url)) return 'Trust Wallet';
  return 'Unknown';
}

export function getAlternativeInfo(url: string): {
  hasAlternative: boolean;
  primaryButton?: string;
  primaryUrl?: string;
  secondaryButton?: string;
  secondaryUrl?: string;
} {
  if (isCoinMarketCapUrl(url)) {
    const geckoUrl = buildCoinGeckoUrl(url);
    const slug = extractCmcSlug(url);

    if (geckoUrl && slug) {
      return {
        hasAlternative: true,
        primaryButton: 'Open on CoinGecko',
        primaryUrl: geckoUrl,
        secondaryButton: 'Search on CoinGecko',
        secondaryUrl: buildCoinGeckoSearchUrl(slug),
      };
    }

    return {
      hasAlternative: true,
      primaryButton: 'Go to CoinGecko',
      primaryUrl: 'https://www.coingecko.com',
    };
  }

  return { hasAlternative: false };
}
