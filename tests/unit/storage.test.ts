import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DEFAULT_STORAGE, STORAGE_VERSION } from '../../src/shared/types';

const mockStorage: Record<string, unknown> = {};

vi.stubGlobal('chrome', {
  storage: {
    local: {
      get: vi.fn(async () => mockStorage),
      set: vi.fn(async (data: Record<string, unknown>) => {
        Object.assign(mockStorage, data);
      }),
      clear: vi.fn(async () => {
        Object.keys(mockStorage).forEach((key) => delete mockStorage[key]);
      }),
    },
  },
});

import {
  getStorage,
  updateStorage,
  getPresetEnabled,
  setPresetEnabled,
  getStrictMode,
  setStrictMode,
  addAllowlistEntry,
  getAllowlist,
  removeAllowlistEntry,
  isDomainAllowed,
  logEvent,
  getEvents,
  clearEvents,
} from '../../src/shared/storage';

describe('storage', () => {
  beforeEach(() => {
    Object.keys(mockStorage).forEach((key) => delete mockStorage[key]);
  });

  describe('getStorage', () => {
    it('returns default storage when empty', async () => {
      const storage = await getStorage();
      expect(storage.version).toBe(STORAGE_VERSION);
      expect(storage.presets).toBeDefined();
      expect(storage.strictMode).toBe(false);
    });
  });

  describe('presets', () => {
    it('gets and sets preset enabled state', async () => {
      await getStorage();

      await setPresetEnabled('test_preset', true);
      expect(await getPresetEnabled('test_preset')).toBe(true);

      await setPresetEnabled('test_preset', false);
      expect(await getPresetEnabled('test_preset')).toBe(false);
    });
  });

  describe('strictMode', () => {
    it('gets and sets strict mode', async () => {
      await getStorage();

      await setStrictMode(true);
      expect(await getStrictMode()).toBe(true);

      await setStrictMode(false);
      expect(await getStrictMode()).toBe(false);
    });
  });

  describe('allowlist', () => {
    it('adds and removes allowlist entries', async () => {
      await getStorage();

      await addAllowlistEntry('example.com', null);
      let allowlist = await getAllowlist();
      expect(allowlist.length).toBe(1);
      expect(allowlist[0].domain).toBe('example.com');

      await removeAllowlistEntry('example.com');
      allowlist = await getAllowlist();
      expect(allowlist.length).toBe(0);
    });

    it('filters expired entries', async () => {
      await getStorage();

      await addAllowlistEntry('expired.com', -1000);
      const allowlist = await getAllowlist();
      expect(allowlist.length).toBe(0);
    });

    it('checks if domain is allowed', async () => {
      await getStorage();

      await addAllowlistEntry('allowed.com', null);
      expect(await isDomainAllowed('allowed.com')).toBe(true);
      expect(await isDomainAllowed('sub.allowed.com')).toBe(true);
      expect(await isDomainAllowed('different.org')).toBe(false);
    });
  });

  describe('events', () => {
    it('logs and retrieves events', async () => {
      await getStorage();

      await logEvent({ type: 'blocked_navigation', url: 'https://test.com', domain: 'test.com' });
      await logEvent({ type: 'bypass_granted', url: 'https://test.com', domain: 'test.com' });

      const events = await getEvents();
      expect(events.length).toBe(2);
      expect(events[0].type).toBe('blocked_navigation');
      expect(events[1].type).toBe('bypass_granted');
    });

    it('clears events', async () => {
      await getStorage();

      await logEvent({ type: 'blocked_navigation', url: 'https://test.com', domain: 'test.com' });
      await clearEvents();

      const events = await getEvents();
      expect(events.length).toBe(0);
    });

    it('filters events by timestamp', async () => {
      await getStorage();

      const now = Date.now();
      await logEvent({ type: 'blocked_navigation', url: 'https://test.com', domain: 'test.com' });

      const recentEvents = await getEvents(now - 1000);
      expect(recentEvents.length).toBe(1);

      const futureEvents = await getEvents(now + 10000);
      expect(futureEvents.length).toBe(0);
    });
  });
});
