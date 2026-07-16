import { describe, it, expect } from 'vitest';
import { reduce } from '../../src/engine/reduce';
import { run } from './add.test';

const write = (path: string, content: string) => ({ cmd: 'writeFile', path, content } as const);
const addF = (...paths: string[]) => ({ cmd: 'add', paths } as const);
const commitM = (message: string) => ({ cmd: 'commit', message } as const);

describe('commit --amend', () => {
  it('replaces the tip: new hash, same parents, old commit still in the store', () => {
    const base = run([
      write('a.txt', 'one'), addF('a.txt'), commitM('c1'),
      write('a.txt', 'two'), addF('a.txt'), commitM('c2'),
      write('a.txt', 'two fixed'), addF('a.txt'),
    ]);
    const oldTip = base.branches['main'];
    const r = reduce(base, { cmd: 'commit', message: 'c2 fixed', amend: true });
    const newTip = r.state.branches['main'];
    expect(newTip).not.toBe(oldTip);
    expect((r.state.objects[newTip] as any).parents)
      .toEqual((r.state.objects[oldTip] as any).parents);   // sibling, not child
    expect(r.state.objects[oldTip]).toBeDefined();          // the old commit is not gone
    expect(r.state.reflog[0]).toMatchObject({ from: oldTip, to: newTip, action: 'amend' });
  });

  it('amend with zero changes is a no-op with the SAME hash (content addressing, honestly)', () => {
    const base = run([write('a.txt', 'one'), addF('a.txt'), commitM('c1')]);
    const r = reduce(base, { cmd: 'commit', message: 'c1', amend: true });
    expect(r.events).toEqual([{ kind: 'no-op', reasonKey: 'amend-identical' }]);
    expect(r.state).toBe(base);
  });
});

describe('the git commit <path> trap (spec §8.4 Topic 4)', () => {
  const trapState = () => run([
    write('a.txt', 'one'), addF('a.txt'), commitM('c1: base'),
    write('a.txt', 'two'), addF('a.txt'),      // staged: "two"
    write('a.txt', 'three'),                   // working: "three"
  ]);

  it('commits the WORKING version, not the staged one', () => {
    const r = reduce(trapState(), { cmd: 'commit', message: 'c2: trap', paths: ['a.txt'] });
    const s = r.state;
    const tree = (s.objects[(s.objects[s.branches['main']] as any).tree] as any).entries;
    expect((s.objects[tree['a.txt']] as any).content).toBe('three');
  });

  it('CONSUMES the staged snapshot and reports the loss', () => {
    const base = trapState();
    const stagedOid = base.index['a.txt'];              // blob "two"
    const r = reduce(base, { cmd: 'commit', message: 'c2: trap', paths: ['a.txt'] });
    expect(r.events).toContainEqual({ kind: 'staged-snapshot-lost', oids: [stagedOid] });
    expect(r.state.index['a.txt']).not.toBe(stagedOid); // gone from the index
    expect(r.state.objects[stagedOid]).toEqual({ kind: 'blob', content: 'two' }); // but not from the store
  });
});
