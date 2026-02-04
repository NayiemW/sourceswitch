type MessageKey = string;
type LanguageCode = 'system' | 'en' | 'tr';

let cachedMessages: Record<string, string> | null = null;
let currentLanguage: LanguageCode = 'system';

export async function initI18n(): Promise<void> {
  try {
    const result = await chrome.storage.local.get(['language']);
    currentLanguage = result.language || 'system';

    if (currentLanguage !== 'system') {
      await loadMessages(currentLanguage);
    }
  } catch {
    currentLanguage = 'system';
  }
}

async function loadMessages(lang: 'en' | 'tr'): Promise<void> {
  try {
    const url = chrome.runtime.getURL(`_locales/${lang}/messages.json`);
    const response = await fetch(url);
    const messages = await response.json();

    cachedMessages = {};
    for (const [key, value] of Object.entries(messages)) {
      cachedMessages[key] = (value as { message: string }).message;
    }
  } catch {
    cachedMessages = null;
  }
}

export function getMessage(key: MessageKey, substitutions?: string | string[]): string {
  if (currentLanguage !== 'system' && cachedMessages && cachedMessages[key]) {
    let message = cachedMessages[key];
    if (substitutions) {
      const subs = Array.isArray(substitutions) ? substitutions : [substitutions];
      subs.forEach((sub, i) => {
        message = message.replace(`$${i + 1}`, sub);
      });
    }
    return message;
  }

  return chrome.i18n.getMessage(key, substitutions) || key;
}

export function getLanguage(): LanguageCode {
  return currentLanguage;
}

export async function setLanguage(lang: LanguageCode): Promise<void> {
  currentLanguage = lang;
  await chrome.storage.local.set({ language: lang });

  if (lang !== 'system') {
    await loadMessages(lang);
  } else {
    cachedMessages = null;
  }
}

export function applyI18nToPage(): void {
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    if (key) {
      el.textContent = getMessage(key);
    }
  });

  document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
    const key = el.getAttribute('data-i18n-placeholder');
    if (key && el instanceof HTMLInputElement) {
      el.placeholder = getMessage(key);
    }
  });

  document.querySelectorAll('[data-i18n-title]').forEach((el) => {
    const key = el.getAttribute('data-i18n-title');
    if (key) {
      (el as HTMLElement).title = getMessage(key);
    }
  });
}
