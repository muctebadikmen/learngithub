import { describe, it, expect } from 'vitest';
import { initialState } from '../../src/engine/actions/init';
import { reduce } from '../../src/engine/reduce';

describe('init and writeFile', () => {
  it('starts uninitialised on an unborn main', () => {
    const s = initialState();
    expect(s.initialised).toBe(false);
    expect(s.head).toEqual({ kind: 'branch', name: 'main' });
    expect(s.branches).toEqual({});
  });

  it('rejects git actions before init', () => {
    const { state, events } = reduce(initialState(), { cmd: 'add', paths: ['a.txt'] });
    expect(events).toEqual([{ kind: 'error', reasonKey: 'not-a-repo' }]);
    expect(state).toEqual(initialState()); // unchanged
  });

  it('init initialises exactly once', () => {
    const r1 = reduce(initialState(), { cmd: 'init' });
    expect(r1.state.initialised).toBe(true);
    expect(r1.events).toEqual([{ kind: 'repo-initialised' }]);
    const r2 = reduce(r1.state, { cmd: 'init' });
    expect(r2.events).toEqual([{ kind: 'error', reasonKey: 'already-a-repo' }]);
  });

  it('writeFile works pre- and post-init and updates ignored on .gitignore', () => {
    const r1 = reduce(initialState(), { cmd: 'writeFile', path: 'a.txt', content: 'one' });
    expect(r1.state.workingDir).toEqual({ 'a.txt': 'one' });
    expect(r1.events).toEqual([{ kind: 'file-written', path: 'a.txt' }]);
    const r2 = reduce(r1.state, { cmd: 'writeFile', path: '.gitignore', content: 'secret.txt\n# c\n' });
    expect(r2.state.ignored).toEqual(['secret.txt']);
  });
});
