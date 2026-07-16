import { describe, it, expect } from 'vitest';
import { run, write, addF, commitM } from '../engine/helpers';
import { canCommit, currentBranch, branchNames, validBranchName } from '../../src/ui/affordances';

describe('canCommit', () => {
  it('is false on an empty repo', () => {
    expect(canCommit(run([]))).toBe(false);
  });
  it('is true when something is staged', () => {
    expect(canCommit(run([write('a.txt', '1'), addF('a.txt')]))).toBe(true);
  });
  it('is false right after committing', () => {
    expect(canCommit(run([write('a.txt', '1'), addF('a.txt'), commitM('c1')]))).toBe(false);
  });
});

describe('branches', () => {
  it('reports the current branch and the branch list', () => {
    const s = run([write('a.txt', '1'), addF('a.txt'), commitM('c1'), { cmd: 'branch', name: 'feature' }]);
    expect(currentBranch(s)).toBe('main');
    expect(branchNames(s)).toEqual(['feature', 'main']);
  });
});

describe('validBranchName', () => {
  it('accepts ordinary names', () => {
    expect(validBranchName('feature')).toBe(true);
    expect(validBranchName('release/1.2')).toBe(true);
  });
  it('rejects HEAD, spaces, ~, leading dash, and empties', () => {
    for (const n of ['', 'HEAD', 'a b', 'main~1', '-x', 'fe..ture', 'x/']) {
      expect(validBranchName(n), n).toBe(false);
    }
  });
});
