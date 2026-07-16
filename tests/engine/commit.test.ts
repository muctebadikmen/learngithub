import { describe, it, expect } from 'vitest';
import { reduce } from '../../src/engine/reduce';
import { run, write, addF, commitM } from './helpers';

describe('commit', () => {
  it('creates a commit from the index and moves the branch', () => {
    const s = run([write('a.txt', 'one'), addF('a.txt'), commitM('c1')]);
    const oid = s.branches['main'];
    const c = s.objects[oid];
    expect(c).toMatchObject({ kind: 'commit', parents: [], message: 'c1' });
    expect(s.insertionOrder).toEqual([oid]);
    expect(s.reflog[0]).toEqual({ from: null, to: oid, action: 'commit' });
  });

  it('commits the STAGED version, not the working version (spec §8.4 Topic 4)', () => {
    const s = run([
      write('a.txt', 'one'), addF('a.txt'),
      write('a.txt', 'two'),                 // edit after staging
      commitM('c1'),
    ]);
    const tree = (s.objects[(s.objects[s.branches['main']] as any).tree] as any).entries;
    expect((s.objects[tree['a.txt']] as any).content).toBe('one');
    expect(s.workingDir['a.txt']).toBe('two');
  });

  it('chains parents', () => {
    const s = run([
      write('a.txt', 'one'), addF('a.txt'), commitM('c1'),
      write('a.txt', 'two'), addF('a.txt'), commitM('c2'),
    ]);
    const c2 = s.objects[s.branches['main']] as any;
    expect(c2.parents).toEqual([s.insertionOrder[0]]);
    expect(s.insertionOrder).toHaveLength(2);
  });

  it('errors with nothing-to-commit when the index matches HEAD', () => {
    const base = run([write('a.txt', 'one'), addF('a.txt'), commitM('c1')]);
    const r = reduce(base, commitM('c2'));
    expect(r.events).toEqual([{ kind: 'error', reasonKey: 'nothing-to-commit' }]);
  });

  it('errors on an empty first commit', () => {
    const r = reduce(run([]), commitM('c1'));
    expect(r.events).toEqual([{ kind: 'error', reasonKey: 'nothing-to-commit' }]);
  });
});
