import { describe, it, expect } from 'vitest';
import { reduce } from '../../src/engine/reduce';
import { resolveRef } from '../../src/engine/refs';
import { run, write, addF, commitM } from './helpers';

const threeCommits = () => run([
  write('a.txt', 'one'), addF('a.txt'), commitM('c1'),
  write('a.txt', 'two'), addF('a.txt'), commitM('c2'),
  write('a.txt', 'three'), addF('a.txt'), commitM('c3'),
]);

describe('ref suffixes', () => {
  it('resolves HEAD~n by first parent', () => {
    const s = threeCommits();
    expect(resolveRef(s, 'HEAD~1')).toBe(s.insertionOrder[1]);
    expect(resolveRef(s, 'HEAD~2')).toBe(s.insertionOrder[0]);
    expect(resolveRef(s, 'HEAD~9')).toBeNull();
  });

  it('resolves HEAD@{n} from the reflog', () => {
    const s = threeCommits();
    expect(resolveRef(s, 'HEAD@{0}')).toBe(s.insertionOrder[2]);
    expect(resolveRef(s, 'HEAD@{1}')).toBe(s.insertionOrder[1]);
  });
});

describe('reset', () => {
  it('--soft moves only the label', () => {
    const base = threeCommits();
    const r = reduce(base, { cmd: 'reset', mode: 'soft', target: 'HEAD~1' });
    expect(r.state.branches['main']).toBe(base.insertionOrder[1]);
    expect(r.state.index).toEqual(base.index);            // untouched
    expect(r.state.workingDir).toEqual(base.workingDir);  // untouched
  });

  it('--mixed (the real default) moves label + index', () => {
    const base = threeCommits();
    const r = reduce(base, { cmd: 'reset', mode: 'mixed', target: 'HEAD~1' });
    const s = r.state;
    expect((s.objects[s.index['a.txt']] as any).content).toBe('two'); // index reset
    expect(s.workingDir['a.txt']).toBe('three');                      // working dir untouched
  });

  it('--hard moves all three zones but spares untracked files', () => {
    const base = run([write('notes.md', 'keep me')], threeCommits());
    const r = reduce(base, { cmd: 'reset', mode: 'hard', target: 'HEAD~2' });
    expect(r.state.workingDir['a.txt']).toBe('one');
    expect(r.state.workingDir['notes.md']).toBe('keep me');
  });

  it('the commit survives a hard reset: unreachable is not gone (spec §8.4 Topic 3)', () => {
    const base = threeCommits();
    const c3 = base.insertionOrder[2];
    const r = reduce(base, { cmd: 'reset', mode: 'hard', target: 'HEAD~2' });
    expect(r.state.objects[c3]).toBeDefined();
    expect(r.state.reflog[0]).toMatchObject({ to: base.insertionOrder[0], action: 'reset' });
    // and the rescue path exists:
    expect(resolveRef(r.state, 'HEAD@{1}')).toBe(c3);
  });

  it('errors on an unknown target', () => {
    const r = reduce(threeCommits(), { cmd: 'reset', mode: 'hard', target: 'nope' });
    expect(r.events[0]).toMatchObject({ kind: 'error', reasonKey: 'unknown-ref' });
  });
});
