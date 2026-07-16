import { describe, it, expect } from 'vitest';
import { run, write, addF, commitM } from '../engine/helpers';
import { commitDetails } from '../../src/ui/commitDetails';

describe('commitDetails', () => {
  it('reports message, parents, and files of a commit', () => {
    const s = run([
      write('a.txt', 'one'), addF('a.txt'), commitM('c1'),
      write('b.txt', 'two'), addF('b.txt'), commitM('c2'),
    ]);
    const tip = s.branches['main'];
    const d = commitDetails(s, tip);
    expect(d.message).toBe('c2');
    expect(d.parents).toHaveLength(1);
    expect(d.files.map((f) => f.path).sort()).toEqual(['a.txt', 'b.txt']);
    expect(d.files.find((f) => f.path === 'a.txt')!.content).toBe('one');
  });
  it('reports no parents for the root commit', () => {
    const s = run([write('a.txt', '1'), addF('a.txt'), commitM('c1')]);
    expect(commitDetails(s, s.branches['main']).parents).toEqual([]);
  });
});
