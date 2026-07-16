import { dict, en, type Locale, type MessageKey } from './dict';

/** Pure translation with `{param}` interpolation and English fallback. */
export function translate(
  locale: Locale, key: MessageKey, params?: Record<string, string | number>,
): string {
  const template = dict[locale]?.[key] ?? en[key] ?? key;
  if (!params) return template;
  return Object.entries(params).reduce((s, [k, v]) => s.replaceAll(`{${k}}`, String(v)), template);
}
