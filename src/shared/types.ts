export interface Preset {
  id: string;
  displayName: string;
  enabled: boolean;
  domains: BlockedDomain[];
  apiEndpoints: string[];
  alternatives: Record<string, Alternative>;
}

export interface BlockedDomain {
  pattern: string;
  action: 'block_main_frame' | 'block_subresource';
}

export interface Alternative {
  primaryButton: string;
  primaryUrl: (slug: string) => string;
  secondaryButton?: string;
  secondaryUrl?: (slug: string) => string;
  slugExtractor?: RegExp;
}

export interface AllowlistEntry {
  domain: string;
  expiresAt: number | null;
  createdAt: number;
}

export interface EventLogEntry {
  type: 'blocked_navigation' | 'bypass_granted' | 'link_rewritten' | 'api_blocked';
  url: string;
  timestamp: number;
  domain: string;
}

export interface CustomBlockEntry {
  domain: string;
  createdAt: number;
}

export interface CustomApiEntry {
  endpoint: string;
  createdAt: number;
}

export interface StorageSchema {
  version: number;
  presets: Record<string, PresetState>;
  strictMode: boolean;
  globalRewriting: boolean;
  showRewriteNotifications: boolean;
  allowlist: AllowlistEntry[];
  customBlockedDomains: CustomBlockEntry[];
  customBlockedApis: CustomApiEntry[];
  rewriteExceptions: string[];
  events: EventLogEntry[];
}

export interface PresetState {
  enabled: boolean;
}

export const STORAGE_VERSION = 1;

export const DEFAULT_STORAGE: StorageSchema = {
  version: STORAGE_VERSION,
  presets: {
    preset_binance_ecosystem: { enabled: true },
  },
  strictMode: false,
  globalRewriting: false,
  showRewriteNotifications: true,
  allowlist: [],
  customBlockedDomains: [],
  customBlockedApis: [],
  rewriteExceptions: [],
  events: [],
};
