import { describe, it, expect } from 'vitest';
import { reduce } from '../../src/engine/reduce';
import { danglingBlobs, log, reachableCommits, unreachableCommits } from '../../src/engine/queries';
import { run, write, addF, commitM } from './helpers';

describe('queries', () => {
  it('a hard reset makes the tip unreachable — but never gone', () => {
    let s = run([
      write('a.txt', 'one'), addF('a.txt'), commitM('c1'),
      write('a.txt', 'two'), addF('a.txt'), commitM('c2'),
    ]);
    const c2 = s.insertionOrder[1];
    s = reduce(s, { cmd: 'reset', mode: 'hard', target: 'HEAD~1' }).state;
    expect(reachableCommits(s).has(c2)).toBe(false);
    expect(unreachableCommits(s)).toEqual([c2]);   // the ghost the renderer draws
    expect(s.objects[c2]).toBeDefined();
  });

  it('the trap blob is dangling; committed and staged blobs are not', () => {
    let s = run([
      write('a.txt', 'one'), addF('a.txt'), commitM('c1: base'),
      write('a.txt', 'two'), addF('a.txt'),
      write('a.txt', 'three'),
    ]);
    const stagedOid = s.index['a.txt'];
    expect(danglingBlobs(s)).toEqual([]);          // staged => referenced by the index
    s = reduce(s, { cmd: 'commit', message: 'c2: trap', paths: ['a.txt'] }).state;
    expect(danglingBlobs(s)).toEqual([stagedOid]); // consumed => dangling. fsck finds it.
  });

  it('log lists reachable commits newest-first', () => {
    const s = run([
      write('a.txt', 'one'), addF('a.txt'), commitM('c1'),
      write('a.txt', 'two'), addF('a.txt'), commitM('c2'),
    ]);
    expect(log(s)).toEqual([s.insertionOrder[1], s.insertionOrder[0]]);
  });
});
