import { describe, it, expect } from 'vitest';
import { reduce } from '../../src/engine/reduce';
import { run, write, addF, commitM } from './helpers';

describe('restore', () => {
  it('restore <path> copies index -> working dir', () => {
    const base = run([
      write('a.txt', 'one'), addF('a.txt'), commitM('c1'),
      write('a.txt', 'oops'),
    ]);
    const r = reduce(base, { cmd: 'restore', paths: ['a.txt'] });
    expect(r.state.workingDir['a.txt']).toBe('one');
    expect(r.events).toEqual([{ kind: 'worktree-updated', paths: ['a.txt'] }]);
  });

  it('restore --staged copies HEAD -> index and leaves the working dir alone', () => {
    const base = run([
      write('a.txt', 'one'), addF('a.txt'), commitM('c1'),
      write('a.txt', 'two'), addF('a.txt'),
    ]);
    const r = reduce(base, { cmd: 'restore', paths: ['a.txt'], staged: true });
    const s = r.state;
    expect((s.objects[s.index['a.txt']] as any).content).toBe('one');
    expect(s.workingDir['a.txt']).toBe('two');
  });

  it('restore --staged removes a path that is not in HEAD', () => {
    const base = run([
      write('a.txt', 'one'), addF('a.txt'), commitM('c1'),
      write('new.txt', 'n'), addF('new.txt'),
    ]);
    const r = reduce(base, { cmd: 'restore', paths: ['new.txt'], staged: true });
    expect(r.state.index['new.txt']).toBeUndefined();
  });

  it('errors on unknown path', () => {
    const base = run([write('a.txt', 'one'), addF('a.txt'), commitM('c1')]);
    const r = reduce(base, { cmd: 'restore', paths: ['nope.txt'] });
    expect(r.events[0]).toMatchObject({ kind: 'error', reasonKey: 'pathspec-no-match' });
  });
});
