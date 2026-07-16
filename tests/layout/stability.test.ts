import { describe, it, expect } from 'vitest';
import { initialState } from '../../src/engine/actions/init';
import { reduce } from '../../src/engine/reduce';
import type { GitAction, RepoState } from '../../src/engine/types';
import { layout } from '../../src/layout/layout';

/** Positions of every commit, keyed by oid, from a layout. */
function positions(state: RepoState): Map<string, string> {
  const m = layout(state);
  return new Map(m.nodes.map((n) => [n.oid, `${n.row}:${n.lane}`]));
}

/**
 * Apply each action one at a time; after every step assert that no commit that
 * existed before the step changed its (row, lane). New commits may appear;
 * reachability and refs may change; positions of survivors must not.
 */
function assertStable(actions: GitAction[]) {
  let state = initialState();
  for (const action of actions) {
    const before = positions(state);
    const next = reduce(state, action);
    const err = next.events.find((e) => e.kind === 'error');
    expect(err, `unexpected error on ${JSON.stringify(action)}: ${JSON.stringify(err)}`).toBeUndefined();
    const after = positions(next.state);
    for (const [oid, pos] of before) {
      if (after.has(oid)) {
        expect(after.get(oid), `commit ${oid} moved on ${JSON.stringify(action)}`).toBe(pos);
      }
    }
    state = next.state;
  }
}

describe('layout stability: layout(reduce(S,a)) moves only created/re-pointed nodes', () => {
  it('linear growth never moves earlier commits', () => {
    assertStable([
      { cmd: 'init' },
      { cmd: 'writeFile', path: 'a.txt', content: '1' }, { cmd: 'add', paths: ['a.txt'] }, { cmd: 'commit', message: 'c1' },
      { cmd: 'writeFile', path: 'a.txt', content: '2' }, { cmd: 'add', paths: ['a.txt'] }, { cmd: 'commit', message: 'c2' },
      { cmd: 'writeFile', path: 'a.txt', content: '3' }, { cmd: 'add', paths: ['a.txt'] }, { cmd: 'commit', message: 'c3' },
    ]);
  });

  it('branching and switching back never move existing commits', () => {
    assertStable([
      { cmd: 'init' },
      { cmd: 'writeFile', path: 'a.txt', content: '1' }, { cmd: 'add', paths: ['a.txt'] }, { cmd: 'commit', message: 'c1' },
      { cmd: 'writeFile', path: 'a.txt', content: '2' }, { cmd: 'add', paths: ['a.txt'] }, { cmd: 'commit', message: 'c2' },
      { cmd: 'switch', target: 'feature', create: true },
      { cmd: 'writeFile', path: 'b.txt', content: 'f' }, { cmd: 'add', paths: ['b.txt'] }, { cmd: 'commit', message: 'F' },
      { cmd: 'switch', target: 'main' },
      { cmd: 'writeFile', path: 'a.txt', content: '3' }, { cmd: 'add', paths: ['a.txt'] }, { cmd: 'commit', message: 'G' },
    ]);
  });

  it('reset (creating a ghost) and amend never move survivors', () => {
    assertStable([
      { cmd: 'init' },
      { cmd: 'writeFile', path: 'a.txt', content: '1' }, { cmd: 'add', paths: ['a.txt'] }, { cmd: 'commit', message: 'c1' },
      { cmd: 'writeFile', path: 'a.txt', content: '2' }, { cmd: 'add', paths: ['a.txt'] }, { cmd: 'commit', message: 'c2' },
      { cmd: 'reset', mode: 'hard', target: 'HEAD~1' },
      { cmd: 'writeFile', path: 'a.txt', content: '2b' }, { cmd: 'add', paths: ['a.txt'] }, { cmd: 'commit', message: 'c2b' },
      { cmd: 'commit', message: 'c2b-amended', amend: true },
    ]);
  });
});
