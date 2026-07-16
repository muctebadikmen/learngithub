import { describe, it, expect } from 'vitest';
import type { GitAction } from '../../src/engine/types';
import { LEVELS } from '../../src/levels/levels';
import { applyActions, freshRepo } from '../../src/levels/seed';

// A commit oid helper: resolve a message to its oid in a given state (for reset/detach targets).
import { getCommit } from '../../src/engine/store';
import { reachableCommits } from '../../src/engine/queries';
const oidOf = (s: import('../../src/engine/types').RepoState, message: string): string =>
  [...reachableCommits(s)].find((o) => getCommit(s, o).message === message) ??
  Object.keys(s.objects).find((o) => s.objects[o].kind === 'commit' && getCommit(s, o).message === message)!;

const SOLUTIONS: Record<string, (start: import('../../src/engine/types').RepoState) => GitAction[]> = {
  'first-commit': () => [
    { cmd: 'writeFile', path: 'readme.md', content: 'hi' }, { cmd: 'add', paths: ['readme.md'] }, { cmd: 'commit', message: 'first' },
  ],
  'commit-again': () => [
    { cmd: 'writeFile', path: 'readme.md', content: 'more' }, { cmd: 'add', paths: ['readme.md'] }, { cmd: 'commit', message: 'second' },
  ],
  'stage-selectively': () => [{ cmd: 'add', paths: ['a.txt'] }],
  'branch': () => [
    { cmd: 'switch', target: 'feature', create: true },
    { cmd: 'writeFile', path: 'f.txt', content: 'x' }, { cmd: 'add', paths: ['f.txt'] }, { cmd: 'commit', message: 'feat' },
  ],
  'switch': () => [{ cmd: 'switch', target: 'main' }],
  'diverge': () => [
    { cmd: 'writeFile', path: 'm.txt', content: 'm' }, { cmd: 'add', paths: ['m.txt'] }, { cmd: 'commit', message: 'on main' },
    { cmd: 'switch', target: 'feature' },
    { cmd: 'writeFile', path: 'f.txt', content: 'f' }, { cmd: 'add', paths: ['f.txt'] }, { cmd: 'commit', message: 'on feature' },
  ],
  'undo-soft': (start) => [{ cmd: 'reset', mode: 'soft', target: oidOf(start, 'first') }],
  'amend': () => [{ cmd: 'commit', message: 'add readme', amend: true }],
  'detach': (start) => [{ cmd: 'switch', target: oidOf(start, 'one'), detach: true }],
  'rescue-ghost': (start) => [{ cmd: 'reset', mode: 'hard', target: oidOf(start, 'important work') }],
};

describe.each(LEVELS)('level $id', (level) => {
  const start = level.seed ? level.seed(freshRepo()) : freshRepo();

  it('does not start already complete', () => {
    expect(level.checks.every((c) => c.done(start))).toBe(false);
  });

  it('is solved by its reference solution', () => {
    const solved = applyActions(start, SOLUTIONS[level.id](start));
    for (const c of level.checks) expect(c.done(solved), c.label).toBe(true);
  });
});

it('every level has a reference solution', () => {
  for (const l of LEVELS) expect(SOLUTIONS[l.id], l.id).toBeTypeOf('function');
});
