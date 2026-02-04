import { Preset } from './types';

export const PRESETS: Record<string, Preset> = {
  preset_binance_ecosystem: {
    id: 'preset_binance_ecosystem',
    displayName: 'Binance ecosystem',
    enabled: true,
    domains: [
      { pattern: 'binance.com', action: 'block_main_frame' },
      { pattern: '*.binance.com', action: 'block_main_frame' },
      { pattern: 'binance.us', action: 'block_main_frame' },
      { pattern: '*.binance.us', action: 'block_main_frame' },
      { pattern: 'coinmarketcap.com', action: 'block_main_frame' },
      { pattern: '*.coinmarketcap.com', action: 'block_main_frame' },
      { pattern: 'trustwallet.com', action: 'block_main_frame' },
      { pattern: '*.trustwallet.com', action: 'block_main_frame' },
    ],
    apiEndpoints: [
      'api.binance.com',
      'api1.binance.com',
      'api2.binance.com',
      'api3.binance.com',
      'data-api.binance.vision',
      'api.binance.us',
      'pro-api.coinmarketcap.com',
      'api.coinmarketcap.com',
      'static.coinmarketcap.com',
      'files.coinmarketcap.com',
    ],
    alternatives: {
      coinmarketcap: {
        primaryButton: 'Open on CoinGecko',
        primaryUrl: (slug: string) => `https://www.coingecko.com/en/coins/${slug}`,
        secondaryButton: 'Search on CoinGecko',
        secondaryUrl: (slug: string) => `https://www.coingecko.com/en/search?query=${slug}`,
        slugExtractor: /coinmarketcap\.com\/currencies\/([a-z0-9-]+)/i,
      },
    },
  },
};

export function getPreset(id: string): Preset | undefined {
  return PRESETS[id];
}

export function getAllPresets(): Preset[] {
  return Object.values(PRESETS);
}

export function getPresetIds(): string[] {
  return Object.keys(PRESETS);
}
