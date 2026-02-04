import { describe, it, expect } from 'vitest';
import {
  extractDomain,
  extractBaseDomain,
  isCoinMarketCapUrl,
  isBinanceUrl,
  isTrustWalletUrl,
  extractCmcSlug,
  buildCoinGeckoUrl,
  buildCoinGeckoSearchUrl,
  isBlockedDomain,
  getBlockedDomainName,
  getAlternativeInfo,
} from '../../src/shared/url-tools';

describe('extractDomain', () => {
  it('extracts domain from URL', () => {
    expect(extractDomain('https://coinmarketcap.com/currencies/bitcoin/')).toBe('coinmarketcap.com');
    expect(extractDomain('https://www.binance.com/en/trade/BTC_USDT')).toBe('www.binance.com');
    expect(extractDomain('https://api.binance.com/api/v3/ticker')).toBe('api.binance.com');
  });

  it('returns empty string for invalid URL', () => {
    expect(extractDomain('not-a-url')).toBe('');
    expect(extractDomain('')).toBe('');
  });
});

describe('extractBaseDomain', () => {
  it('extracts base domain', () => {
    expect(extractBaseDomain('https://www.binance.com/en')).toBe('binance.com');
    expect(extractBaseDomain('https://api.coinmarketcap.com/v1')).toBe('coinmarketcap.com');
    expect(extractBaseDomain('https://trustwallet.com')).toBe('trustwallet.com');
  });
});

describe('isCoinMarketCapUrl', () => {
  it('returns true for CMC URLs', () => {
    expect(isCoinMarketCapUrl('https://coinmarketcap.com')).toBe(true);
    expect(isCoinMarketCapUrl('https://coinmarketcap.com/currencies/bitcoin/')).toBe(true);
    expect(isCoinMarketCapUrl('https://pro-api.coinmarketcap.com/v1/cryptocurrency')).toBe(true);
  });

  it('returns false for non-CMC URLs', () => {
    expect(isCoinMarketCapUrl('https://coingecko.com')).toBe(false);
    expect(isCoinMarketCapUrl('https://binance.com')).toBe(false);
  });
});

describe('isBinanceUrl', () => {
  it('returns true for Binance URLs', () => {
    expect(isBinanceUrl('https://binance.com')).toBe(true);
    expect(isBinanceUrl('https://www.binance.com/en/trade')).toBe(true);
    expect(isBinanceUrl('https://api.binance.com/api/v3')).toBe(true);
    expect(isBinanceUrl('https://binance.us')).toBe(true);
  });

  it('returns false for non-Binance URLs', () => {
    expect(isBinanceUrl('https://coinmarketcap.com')).toBe(false);
  });
});

describe('isTrustWalletUrl', () => {
  it('returns true for Trust Wallet URLs', () => {
    expect(isTrustWalletUrl('https://trustwallet.com')).toBe(true);
    expect(isTrustWalletUrl('https://assets.trustwallet.com/blockchains')).toBe(true);
  });

  it('returns false for non-Trust Wallet URLs', () => {
    expect(isTrustWalletUrl('https://metamask.io')).toBe(false);
  });
});

describe('extractCmcSlug', () => {
  it('extracts slug from CMC currency URL', () => {
    expect(extractCmcSlug('https://coinmarketcap.com/currencies/bitcoin/')).toBe('bitcoin');
    expect(extractCmcSlug('https://coinmarketcap.com/currencies/ethereum/')).toBe('ethereum');
    expect(extractCmcSlug('https://coinmarketcap.com/currencies/binancecoin/')).toBe('binancecoin');
    expect(extractCmcSlug('https://coinmarketcap.com/currencies/shiba-inu/')).toBe('shiba-inu');
  });

  it('returns null for non-currency URLs', () => {
    expect(extractCmcSlug('https://coinmarketcap.com/')).toBe(null);
    expect(extractCmcSlug('https://coinmarketcap.com/rankings/exchanges/')).toBe(null);
    expect(extractCmcSlug('https://coingecko.com/coins/bitcoin')).toBe(null);
  });
});

describe('buildCoinGeckoUrl', () => {
  it('builds CoinGecko URL from CMC URL', () => {
    expect(buildCoinGeckoUrl('https://coinmarketcap.com/currencies/bitcoin/')).toBe(
      'https://www.coingecko.com/en/coins/bitcoin'
    );
    expect(buildCoinGeckoUrl('https://coinmarketcap.com/currencies/ethereum/')).toBe(
      'https://www.coingecko.com/en/coins/ethereum'
    );
  });

  it('returns null for non-currency URLs', () => {
    expect(buildCoinGeckoUrl('https://coinmarketcap.com/')).toBe(null);
    expect(buildCoinGeckoUrl('https://binance.com')).toBe(null);
  });
});

describe('buildCoinGeckoSearchUrl', () => {
  it('builds search URL', () => {
    expect(buildCoinGeckoSearchUrl('bitcoin')).toBe(
      'https://www.coingecko.com/en/search?query=bitcoin'
    );
    expect(buildCoinGeckoSearchUrl('shiba inu')).toBe(
      'https://www.coingecko.com/en/search?query=shiba%20inu'
    );
  });
});

describe('isBlockedDomain', () => {
  it('returns true for blocked domains', () => {
    expect(isBlockedDomain('https://coinmarketcap.com')).toBe(true);
    expect(isBlockedDomain('https://binance.com')).toBe(true);
    expect(isBlockedDomain('https://trustwallet.com')).toBe(true);
  });

  it('returns false for non-blocked domains', () => {
    expect(isBlockedDomain('https://coingecko.com')).toBe(false);
    expect(isBlockedDomain('https://google.com')).toBe(false);
  });
});

describe('getBlockedDomainName', () => {
  it('returns friendly name for blocked domains', () => {
    expect(getBlockedDomainName('https://coinmarketcap.com')).toBe('CoinMarketCap');
    expect(getBlockedDomainName('https://binance.com')).toBe('Binance');
    expect(getBlockedDomainName('https://trustwallet.com')).toBe('Trust Wallet');
    expect(getBlockedDomainName('https://unknown.com')).toBe('Unknown');
  });
});

describe('getAlternativeInfo', () => {
  it('returns CoinGecko alternative for CMC currency URLs', () => {
    const result = getAlternativeInfo('https://coinmarketcap.com/currencies/bitcoin/');
    expect(result.hasAlternative).toBe(true);
    expect(result.primaryButton).toBe('Open on CoinGecko');
    expect(result.primaryUrl).toBe('https://www.coingecko.com/en/coins/bitcoin');
    expect(result.secondaryButton).toBe('Search on CoinGecko');
  });

  it('returns generic CoinGecko alternative for non-currency CMC URLs', () => {
    const result = getAlternativeInfo('https://coinmarketcap.com/');
    expect(result.hasAlternative).toBe(true);
    expect(result.primaryButton).toBe('Go to CoinGecko');
    expect(result.primaryUrl).toBe('https://www.coingecko.com');
  });

  it('returns no alternative for Binance URLs', () => {
    const result = getAlternativeInfo('https://binance.com');
    expect(result.hasAlternative).toBe(false);
  });
});
