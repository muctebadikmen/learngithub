import { describe, it, expect } from 'vitest';
import { run, write, addF, commitM } from '../engine/helpers';
import { reduce } from '../../src/engine/reduce';
import type { CommitObj, RepoState } from '../../src/engine/types';
import { layout } from '../../src/layout/layout';

/** Build a linear 3-commit history on main. */
const linear = (): RepoState =>
  run([
    write('a.txt', '1'), addF('a.txt'), commitM('c1'),
    write('a.txt', '2'), addF('a.txt'), commitM('c2'),
    write('a.txt', '3'), addF('a.txt'), commitM('c3'),
  ]);

describe('layout — rows', () => {
  it('stacks a linear history in one lane, oldest at row 0', () => {
    const m = layout(linear());
    expect(m.nodes).toHaveLength(3);
    expect(m.rowCount).toBe(3);
    expect(m.laneCount).toBe(1);
    expect(m.nodes.every((n) => n.lane === 0)).toBe(true);
    const byMsg = Object.fromEntries(m.nodes.map((n) => [n.message, n.row]));
    expect(byMsg).toEqual({ c1: 0, c2: 1, c3: 2 });
  });

  it('emits one edge per parent, child->parent', () => {
    const m = layout(linear());
    expect(m.edges).toHaveLength(2); // c2->c1, c3->c2
    for (const e of m.edges) {
      const child = m.nodes.find((n) => n.oid === e.child)!;
      const parent = m.nodes.find((n) => n.oid === e.parent)!;
      expect(child.row).toBe(parent.row + 1);
    }
  });
});

describe('layout — lanes / branching', () => {
  it('puts a divergent branch in its own lane on the same row', () => {
    // c1, c2 on main; branch `feature` off c2 commits F; back on main commit G.
    const s = run([
      write('a.txt', '1'), addF('a.txt'), commitM('c1'),
      write('a.txt', '2'), addF('a.txt'), commitM('c2'),
      { cmd: 'switch', target: 'feature', create: true },
      write('b.txt', 'f'), addF('b.txt'), commitM('F'),
      { cmd: 'switch', target: 'main' },
      write('a.txt', '3'), addF('a.txt'), commitM('G'),
    ]);
    const m = layout(s);
    expect(m.nodes).toHaveLength(4);
    expect(m.laneCount).toBe(2);
    const F = m.nodes.find((n) => n.message === 'F')!;
    const G = m.nodes.find((n) => n.message === 'G')!;
    expect(F.row).toBe(2);
    expect(G.row).toBe(2);
    expect(F.lane).not.toBe(G.lane); // side by side, different columns
    // F was created first, so it inherits c2's trunk lane (0); G opens lane 1.
    expect(F.lane).toBe(0);
    expect(G.lane).toBe(1);
  });
});

describe('layout — refs and HEAD', () => {
  it('reports branch refs and marks the one HEAD is on', () => {
    const s = run([
      write('a.txt', '1'), addF('a.txt'), commitM('c1'),
      { cmd: 'switch', target: 'feature', create: true },
    ]);
    const m = layout(s);
    const feature = m.refs.find((r) => r.label === 'feature')!;
    const main = m.refs.find((r) => r.label === 'main')!;
    expect(feature.isHead).toBe(true);
    expect(main.isHead).toBe(false);
    expect(m.detachedHead).toBe(false);
    expect(m.headOid).toBe(s.branches['feature']);
  });

  it('reports a detached HEAD', () => {
    const s0 = run([
      write('a.txt', '1'), addF('a.txt'), commitM('c1'),
      write('a.txt', '2'), addF('a.txt'), commitM('c2'),
    ]);
    const tip = s0.branches['main'];
    const s = reduce(s0, { cmd: 'switch', target: tip, detach: true }).state;
    const m = layout(s);
    expect(m.detachedHead).toBe(true);
    expect(m.headOid).toBe(tip);
    expect(m.refs.every((r) => r.isHead === false)).toBe(true);
  });
});

describe('layout — ghosts (unreachable commits)', () => {
  it('keeps a reset-away commit as a node with reachable=false', () => {
    const s0 = run([
      write('a.txt', '1'), addF('a.txt'), commitM('c1'),
      write('a.txt', '2'), addF('a.txt'), commitM('c2'),
    ]);
    const droppedTip = s0.branches['main'];
    const s = reduce(s0, { cmd: 'reset', mode: 'hard', target: 'HEAD~1' }).state;
    const m = layout(s);
    expect(m.nodes).toHaveLength(2); // nothing deleted
    const ghost = m.nodes.find((n) => n.oid === droppedTip)!;
    expect(ghost.reachable).toBe(false);
    expect(m.nodes.filter((n) => n.reachable)).toHaveLength(1);
  });
});

describe('layout — merge commit (defensive; no merge action exists yet)', () => {
  it('inherits the first parent lane and edges to every parent', () => {
    // Hand-build a state with a 2-parent commit to exercise the merge path.
    const base = run([write('a.txt', '1'), addF('a.txt'), commitM('c1')]);
    const p1 = base.insertionOrder[0];
    const c2: CommitObj = { kind: 'commit', tree: (base.objects[p1] as CommitObj).tree, parents: [p1], message: 'c2' };
    const c2oid = 'aaaaaaaaaaaaaaaa';
    const merge: CommitObj = { kind: 'commit', tree: c2.tree, parents: [p1, c2oid], message: 'M' };
    const moid = 'bbbbbbbbbbbbbbbb';
    const s: RepoState = {
      ...base,
      objects: { ...base.objects, [c2oid]: c2, [moid]: merge },
      branches: { main: moid },
      insertionOrder: [p1, c2oid, moid],
    };
    const m = layout(s);
    const M = m.nodes.find((n) => n.oid === moid)!;
    expect(M.row).toBe(2); // 1 + max(row(c1)=0, row(c2)=1)
    const mergeEdges = m.edges.filter((e) => e.child === moid);
    expect(mergeEdges.map((e) => e.parent).sort()).toEqual([c2oid, p1].sort());
  });
});

describe('layout — empty repo', () => {
  it('returns an empty model with a null HEAD before the first commit', () => {
    const s = reduce({ ...run([]) }, { cmd: 'init' }).state; // init-only, no commits
    const m = layout(s);
    expect(m.nodes).toHaveLength(0);
    expect(m.edges).toHaveLength(0);
    expect(m.rowCount).toBe(0);
    expect(m.laneCount).toBe(0);
    expect(m.headOid).toBeNull();
  });
});
