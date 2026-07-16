import { describe, it, expect } from 'vitest';
import { reduce } from '../../src/engine/reduce';
import { run } from './helpers';

describe('add', () => {
  it('stages the current working content as a blob', () => {
    const s = run([
      { cmd: 'writeFile', path: 'a.txt', content: 'one' },
      { cmd: 'add', paths: ['a.txt'] },
    ]);
    const oid = s.index['a.txt'];
    expect(s.objects[oid]).toEqual({ kind: 'blob', content: 'one' });
  });

  it('keeps the staged snapshot when the file is edited again (spec §8.4 Topic 4)', () => {
    const s = run([
      { cmd: 'writeFile', path: 'a.txt', content: 'one' },
      { cmd: 'add', paths: ['a.txt'] },
      { cmd: 'writeFile', path: 'a.txt', content: 'two' },
    ]);
    expect(s.objects[s.index['a.txt']]).toEqual({ kind: 'blob', content: 'one' });
    expect(s.workingDir['a.txt']).toBe('two');
  });

  it('errors on a missing path without touching state', () => {
    const base = run([]);
    const r = reduce(base, { cmd: 'add', paths: ['nope.txt'] });
    expect(r.events).toEqual([
      { kind: 'error', reasonKey: 'pathspec-no-match', params: { path: 'nope.txt' } },
    ]);
    expect(r.state).toBe(base);
  });

  it('refuses to add an ignored path explicitly, like real git', () => {
    const base = run([
      { cmd: 'writeFile', path: '.gitignore', content: 'secret.txt' },
      { cmd: 'writeFile', path: 'secret.txt', content: 'shh' },
    ]);
    const r = reduce(base, { cmd: 'add', paths: ['secret.txt'] });
    expect(r.events).toEqual([
      { kind: 'error', reasonKey: 'path-is-ignored', params: { path: 'secret.txt' } },
    ]);
  });
});
