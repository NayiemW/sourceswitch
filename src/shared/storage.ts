import { StorageSchema, DEFAULT_STORAGE, STORAGE_VERSION, AllowlistEntry, EventLogEntry, CustomBlockEntry, CustomApiEntry } from './types';

const MAX_EVENTS = 500;

export async function getStorage(): Promise<StorageSchema> {
  const result = await chrome.storage.local.get(null);

  if (!result.version) {
    await chrome.storage.local.set(DEFAULT_STORAGE);
    return DEFAULT_STORAGE;
  }

  if (result.version < STORAGE_VERSION) {
    const migrated = migrateStorage(result as StorageSchema);
    await chrome.storage.local.set(migrated);
    return migrated;
  }

  return result as StorageSchema;
}

export async function updateStorage(updates: Partial<StorageSchema>): Promise<void> {
  await chrome.storage.local.set(updates);
}

export async function getPresetEnabled(presetId: string): Promise<boolean> {
  const storage = await getStorage();
  return storage.presets[presetId]?.enabled ?? false;
}

export async function setPresetEnabled(presetId: string, enabled: boolean): Promise<void> {
  const storage = await getStorage();
  storage.presets[presetId] = { enabled };
  await updateStorage({ presets: storage.presets });
}

export async function getStrictMode(): Promise<boolean> {
  const storage = await getStorage();
  return storage.strictMode;
}

export async function setStrictMode(enabled: boolean): Promise<void> {
  await updateStorage({ strictMode: enabled });
}

export async function getGlobalRewriting(): Promise<boolean> {
  const storage = await getStorage();
  return storage.globalRewriting;
}

export async function setGlobalRewriting(enabled: boolean): Promise<void> {
  await updateStorage({ globalRewriting: enabled });
}

export async function getShowRewriteNotifications(): Promise<boolean> {
  const storage = await getStorage();
  return storage.showRewriteNotifications ?? true;
}

export async function setShowRewriteNotifications(enabled: boolean): Promise<void> {
  await updateStorage({ showRewriteNotifications: enabled });
}

export async function getAllowlist(): Promise<AllowlistEntry[]> {
  const storage = await getStorage();
  const now = Date.now();
  return storage.allowlist.filter((entry) => entry.expiresAt === null || entry.expiresAt > now);
}

export async function addAllowlistEntry(domain: string, durationMs: number | null): Promise<void> {
  const storage = await getStorage();
  const now = Date.now();

  const filtered = storage.allowlist.filter((e) => e.domain !== domain);

  filtered.push({
    domain,
    expiresAt: durationMs ? now + durationMs : null,
    createdAt: now,
  });

  await updateStorage({ allowlist: filtered });
}

export async function removeAllowlistEntry(domain: string): Promise<void> {
  const storage = await getStorage();
  const filtered = storage.allowlist.filter((e) => e.domain !== domain);
  await updateStorage({ allowlist: filtered });
}

export async function isDomainAllowed(domain: string): Promise<boolean> {
  const allowlist = await getAllowlist();
  return allowlist.some((entry) => domain.endsWith(entry.domain));
}

// Custom blocked domains
export async function getCustomBlockedDomains(): Promise<CustomBlockEntry[]> {
  const storage = await getStorage();
  return storage.customBlockedDomains || [];
}

export async function addCustomBlockedDomain(domain: string): Promise<void> {
  const storage = await getStorage();
  const existing = storage.customBlockedDomains || [];

  // Don't add duplicates
  if (existing.some((e) => e.domain === domain)) return;

  existing.push({
    domain,
    createdAt: Date.now(),
  });

  await updateStorage({ customBlockedDomains: existing });
}

export async function removeCustomBlockedDomain(domain: string): Promise<void> {
  const storage = await getStorage();
  const filtered = (storage.customBlockedDomains || []).filter((e) => e.domain !== domain);
  await updateStorage({ customBlockedDomains: filtered });
}

// Custom blocked APIs
export async function getCustomBlockedApis(): Promise<CustomApiEntry[]> {
  const storage = await getStorage();
  return storage.customBlockedApis || [];
}

export async function addCustomBlockedApi(endpoint: string): Promise<void> {
  const storage = await getStorage();
  const existing = storage.customBlockedApis || [];

  // Don't add duplicates
  if (existing.some((e) => e.endpoint === endpoint)) return;

  existing.push({
    endpoint,
    createdAt: Date.now(),
  });

  await updateStorage({ customBlockedApis: existing });
}

export async function removeCustomBlockedApi(endpoint: string): Promise<void> {
  const storage = await getStorage();
  const filtered = (storage.customBlockedApis || []).filter((e) => e.endpoint !== endpoint);
  await updateStorage({ customBlockedApis: filtered });
}

// Rewrite exceptions (sites excluded from link rewriting)
export async function getRewriteExceptions(): Promise<string[]> {
  const storage = await getStorage();
  return storage.rewriteExceptions || [];
}

export async function addRewriteException(domain: string): Promise<void> {
  const storage = await getStorage();
  const existing = storage.rewriteExceptions || [];

  if (existing.includes(domain)) return;

  existing.push(domain);
  await updateStorage({ rewriteExceptions: existing });
}

export async function removeRewriteException(domain: string): Promise<void> {
  const storage = await getStorage();
  const filtered = (storage.rewriteExceptions || []).filter((d) => d !== domain);
  await updateStorage({ rewriteExceptions: filtered });
}

export async function logEvent(event: Omit<EventLogEntry, 'timestamp'>): Promise<void> {
  const storage = await getStorage();
  const events = [...storage.events, { ...event, timestamp: Date.now() }];

  if (events.length > MAX_EVENTS) {
    events.splice(0, events.length - MAX_EVENTS);
  }

  await updateStorage({ events });
}

export async function getEvents(since?: number): Promise<EventLogEntry[]> {
  const storage = await getStorage();
  if (since) {
    return storage.events.filter((e) => e.timestamp >= since);
  }
  return storage.events;
}

export async function clearEvents(): Promise<void> {
  await updateStorage({ events: [] });
}

export async function exportData(): Promise<string> {
  const storage = await getStorage();
  return JSON.stringify(storage, null, 2);
}

// Validates domain format to prevent XSS and injection
function isValidDomain(domain: string): boolean {
  // Only allow alphanumeric, dots, and hyphens (standard domain characters)
  return /^[a-zA-Z0-9][a-zA-Z0-9.-]*[a-zA-Z0-9]$/.test(domain) && domain.length <= 253;
}

function sanitizeAllowlist(allowlist: unknown[]): AllowlistEntry[] {
  if (!Array.isArray(allowlist)) return [];

  return allowlist
    .filter((entry): entry is AllowlistEntry => {
      if (typeof entry !== 'object' || entry === null) return false;
      const e = entry as Record<string, unknown>;
      return (
        typeof e.domain === 'string' &&
        isValidDomain(e.domain) &&
        (e.expiresAt === null || typeof e.expiresAt === 'number') &&
        typeof e.createdAt === 'number'
      );
    })
    .map((entry) => ({
      domain: entry.domain,
      expiresAt: entry.expiresAt,
      createdAt: entry.createdAt,
    }));
}

function sanitizeCustomBlockedDomains(domains: unknown[]): CustomBlockEntry[] {
  if (!Array.isArray(domains)) return [];

  return domains
    .filter((entry): entry is CustomBlockEntry => {
      if (typeof entry !== 'object' || entry === null) return false;
      const e = entry as Record<string, unknown>;
      return typeof e.domain === 'string' && isValidDomain(e.domain) && typeof e.createdAt === 'number';
    })
    .map((entry) => ({
      domain: entry.domain,
      createdAt: entry.createdAt,
    }));
}

function sanitizeCustomBlockedApis(apis: unknown[]): CustomApiEntry[] {
  if (!Array.isArray(apis)) return [];

  // API endpoints can contain paths, so we're more permissive but still validate
  const isValidEndpoint = (endpoint: string): boolean => {
    return /^[a-zA-Z0-9][a-zA-Z0-9./-]*[a-zA-Z0-9]$/.test(endpoint) && endpoint.length <= 500;
  };

  return apis
    .filter((entry): entry is CustomApiEntry => {
      if (typeof entry !== 'object' || entry === null) return false;
      const e = entry as Record<string, unknown>;
      return typeof e.endpoint === 'string' && isValidEndpoint(e.endpoint) && typeof e.createdAt === 'number';
    })
    .map((entry) => ({
      endpoint: entry.endpoint,
      createdAt: entry.createdAt,
    }));
}

export async function importData(json: string): Promise<void> {
  const data = JSON.parse(json);

  // Validate structure
  if (
    typeof data !== 'object' ||
    data === null ||
    typeof data.version !== 'number' ||
    typeof data.presets !== 'object' ||
    !Array.isArray(data.allowlist)
  ) {
    throw new Error('Invalid data format');
  }

  // Sanitize allowlist to prevent XSS
  const sanitizedAllowlist = sanitizeAllowlist(data.allowlist);
  const sanitizedCustomDomains = sanitizeCustomBlockedDomains(data.customBlockedDomains || []);
  const sanitizedCustomApis = sanitizeCustomBlockedApis(data.customBlockedApis || []);
  const sanitizedRewriteExceptions = (data.rewriteExceptions || [])
    .filter((d: unknown): d is string => typeof d === 'string' && isValidDomain(d));

  // Validate presets structure
  const sanitizedPresets: Record<string, { enabled: boolean }> = {};
  if (data.presets && typeof data.presets === 'object') {
    for (const [key, value] of Object.entries(data.presets)) {
      if (
        typeof key === 'string' &&
        /^[a-zA-Z0-9_-]+$/.test(key) &&
        typeof value === 'object' &&
        value !== null &&
        typeof (value as Record<string, unknown>).enabled === 'boolean'
      ) {
        sanitizedPresets[key] = { enabled: (value as { enabled: boolean }).enabled };
      }
    }
  }

  // Validate language
  const validLanguages = ['system', 'en', 'tr'];
  const sanitizedLanguage = validLanguages.includes(data.language) ? data.language : 'system';

  const sanitizedData: StorageSchema = {
    version: data.version,
    presets: sanitizedPresets,
    strictMode: typeof data.strictMode === 'boolean' ? data.strictMode : false,
    globalRewriting: typeof data.globalRewriting === 'boolean' ? data.globalRewriting : false,
    showRewriteNotifications: typeof data.showRewriteNotifications === 'boolean' ? data.showRewriteNotifications : true,
    language: sanitizedLanguage,
    allowlist: sanitizedAllowlist,
    customBlockedDomains: sanitizedCustomDomains,
    customBlockedApis: sanitizedCustomApis,
    rewriteExceptions: sanitizedRewriteExceptions,
    events: [], // Don't import events - they could be large and contain URLs
  };

  await chrome.storage.local.clear();
  await chrome.storage.local.set(sanitizedData);
}

function migrateStorage(oldStorage: StorageSchema): StorageSchema {
  return {
    ...DEFAULT_STORAGE,
    ...oldStorage,
    version: STORAGE_VERSION,
  };
}
