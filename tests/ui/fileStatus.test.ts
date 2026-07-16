import { describe, it, expect } from 'vitest';
import { run, write, addF, commitM } from '../engine/helpers';
import { workingFiles, stagedFiles } from '../../src/ui/fileStatus';

describe('workingFiles', () => {
  it('marks a brand-new unstaged file untracked', () => {
    const s = run([write('a.txt', '1')]);
    expect(workingFiles(s)).toEqual([{ path: 'a.txt', status: 'untracked' }]);
  });
  it('marks a staged-but-uncommitted file staged', () => {
    const s = run([write('a.txt', '1'), addF('a.txt')]);
    expect(workingFiles(s)).toEqual([{ path: 'a.txt', status: 'staged' }]);
  });
  it('marks a committed-then-edited file modified', () => {
    const s = run([write('a.txt', '1'), addF('a.txt'), commitM('c1'), write('a.txt', '2')]);
    expect(workingFiles(s)).toEqual([{ path: 'a.txt', status: 'modified' }]);
  });
  it('marks a committed unchanged file clean', () => {
    const s = run([write('a.txt', '1'), addF('a.txt'), commitM('c1')]);
    expect(workingFiles(s)).toEqual([{ path: 'a.txt', status: 'clean' }]);
  });
});

describe('stagedFiles', () => {
  it('lists an added file', () => {
    const s = run([write('a.txt', '1'), addF('a.txt')]);
    expect(stagedFiles(s)).toEqual([{ path: 'a.txt', kind: 'added' }]);
  });
  it('lists a modified-and-restaged file as modified', () => {
    const s = run([write('a.txt', '1'), addF('a.txt'), commitM('c1'), write('a.txt', '2'), addF('a.txt')]);
    expect(stagedFiles(s)).toEqual([{ path: 'a.txt', kind: 'modified' }]);
  });
  it('is empty right after a commit', () => {
    const s = run([write('a.txt', '1'), addF('a.txt'), commitM('c1')]);
    expect(stagedFiles(s)).toEqual([]);
  });
});
