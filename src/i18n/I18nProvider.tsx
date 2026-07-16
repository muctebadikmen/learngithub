import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { Locale, MessageKey } from './dict';
import { translate } from './t';

const STORAGE_KEY = 'git-game-locale';

function initialLocale(): Locale {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'en' || saved === 'tr') return saved;
  } catch { /* ignore */ }
  try {
    if (navigator.language.toLowerCase().startsWith('tr')) return 'tr';
  } catch { /* ignore */ }
  return 'en';
}

export type TFn = (key: MessageKey, params?: Record<string, string | number>) => string;
interface I18n { locale: Locale; setLocale: (l: Locale) => void; t: TFn }

const Ctx = createContext<I18n | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);
  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    try { localStorage.setItem(STORAGE_KEY, l); } catch { /* ignore */ }
  }, []);
  const t = useCallback<TFn>((key, params) => translate(locale, key, params), [locale]);
  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useT(): I18n {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useT must be used within I18nProvider');
  return ctx;
}
