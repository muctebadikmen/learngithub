import { describe, it, expect } from 'vitest';
import type { EngineEvent } from '../../src/engine/types';
import { announce } from '../../src/ui/liveRegion';

describe('announce', () => {
  it('describes a commit', () => {
    const ev: EngineEvent[] = [{ kind: 'commit-created', oid: 'abcd1234abcd1234' }];
    expect(announce(ev)).toBe('Created commit abcd1234.');
  });
  it('describes a head move', () => {
    const ev: EngineEvent[] = [{ kind: 'head-moved', head: { kind: 'branch', name: 'feature' } }];
    expect(announce(ev)).toBe('Now on branch feature.');
  });
  it('describes an error', () => {
    const ev: EngineEvent[] = [{ kind: 'error', reasonKey: 'switch-dirty' }];
    expect(announce(ev)).toBe('You have uncommitted changes — commit or discard them first.');
  });
  it('is empty for no events', () => {
    expect(announce([])).toBe('');
  });
  it('describes staging an add', () => {
    expect(announce([{ kind: 'index-updated', paths: ['a.txt'] }])).toBe('Staging area updated.');
  });
  it('describes a working-tree restore', () => {
    expect(announce([{ kind: 'worktree-updated', paths: ['a.txt'] }])).toBe('Working files updated.');
  });
  it('describes a file save', () => {
    expect(announce([{ kind: 'file-written', path: 'a.txt' }])).toBe('File saved.');
  });
  it('does not add staging noise to a branch switch', () => {
    const ev: EngineEvent[] = [
      { kind: 'head-moved', head: { kind: 'branch', name: 'feature' } },
      { kind: 'index-updated', paths: [] },
      { kind: 'worktree-updated', paths: [] },
    ];
    expect(announce(ev)).toBe('Now on branch feature.');
  });
});
