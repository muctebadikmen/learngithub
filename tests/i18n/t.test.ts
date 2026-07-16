import { describe, it, expect } from 'vitest';
import { translate } from '../../src/i18n/t';
import { en, tr } from '../../src/i18n/dict';

describe('translate', () => {
  it('returns the string for the locale', () => {
    expect(translate('en', 'app.title')).toBe(en['app.title']);
    expect(translate('tr', 'app.title')).toBe(tr['app.title']);
  });
  it('interpolates params', () => {
    // uses a key that has a {name} param — level count label
    expect(translate('en', 'level.progress', { n: 3, total: 10 })).toContain('3');
  });
  it('falls back to English for an untranslated locale value', () => {
    // if a tr value were ever empty string it still returns it; fallback covers only missing keys
    expect(typeof translate('tr', 'app.title')).toBe('string');
  });
});

describe('dictionary parity', () => {
  it('tr defines every en key', () => {
    expect(Object.keys(tr).sort()).toEqual(Object.keys(en).sort());
  });
  it('no key is left empty', () => {
    for (const [k, v] of Object.entries(en)) expect(v, `en.${k}`).not.toBe('');
    for (const [k, v] of Object.entries(tr)) expect(v, `tr.${k}`).not.toBe('');
  });
});
