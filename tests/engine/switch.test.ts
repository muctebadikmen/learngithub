import { describe, it, expect } from 'vitest';
import { reduce } from '../../src/engine/reduce';
import { run, write, addF, commitM } from './helpers';

const twoCommits = () => run([
  write('a.txt', 'one'), addF('a.txt'), commitM('c1'),
  write('a.txt', 'two'), addF('a.txt'), commitM('c2'),
]);

describe('branch and switch', () => {
  it('branch creates a label at HEAD and moves nothing', () => {
    const base = twoCommits();
    const r = reduce(base, { cmd: 'branch', name: 'feature' });
    expect(r.state.branches['feature']).toBe(base.branches['main']);
    expect(r.state.head).toEqual({ kind: 'branch', name: 'main' });
    expect(r.state.workingDir).toEqual(base.workingDir);
  });

  it('switch to an older commit detaches and rebuilds files', () => {
    const base = twoCommits();
    const c1 = base.insertionOrder[0];
    const r = reduce(base, { cmd: 'switch', target: c1, detach: true });
    expect(r.state.head).toEqual({ kind: 'detached', oid: c1 });
    expect(r.state.workingDir['a.txt']).toBe('one');
    expect(r.state.index['a.txt']).toBeDefined();
  });

  it('switch to a commit oid without --detach is refused, like real git', () => {
    const base = twoCommits();
    const r = reduce(base, { cmd: 'switch', target: base.insertionOrder[0] });
    expect(r.events[0]).toMatchObject({ kind: 'error', reasonKey: 'detach-requires-flag' });
  });

  it('switch -c creates and moves in one step without touching files', () => {
    const base = twoCommits();
    const r = reduce(base, { cmd: 'switch', target: 'feature', create: true });
    expect(r.state.head).toEqual({ kind: 'branch', name: 'feature' });
    expect(r.state.branches['feature']).toBe(base.branches['main']);
  });

  it('refuses to switch with uncommitted tracked changes', () => {
    const base = run([write('a.txt', 'dirty')], twoCommits());
    const r = reduce(base, { cmd: 'switch', target: 'main' });
    expect(r.events).toEqual([{ kind: 'error', reasonKey: 'switch-dirty' }]);
  });

  it('carries untracked files across a switch', () => {
    let s = twoCommits();
    s = run([{ cmd: 'branch', name: 'feature' }, write('notes.md', 'todo')], s);
    const r = reduce(s, { cmd: 'switch', target: 'feature' });
    expect(r.state.workingDir['notes.md']).toBe('todo');
  });

  it('branch errors: duplicate name, no commits yet', () => {
    expect(reduce(twoCommits(), { cmd: 'branch', name: 'main' }).events[0])
      .toMatchObject({ kind: 'error', reasonKey: 'branch-exists' });
    expect(reduce(run([]), { cmd: 'branch', name: 'x' }).events[0])
      .toMatchObject({ kind: 'error', reasonKey: 'no-commits-yet' });
  });
});
