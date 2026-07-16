import type { ReduceResult, RepoState } from '../types';

export function initialState(): RepoState {
  return {
    initialised: false,
    objects: {},
    branches: {},
    head: { kind: 'branch', name: 'main' }, // unborn branch, like real `git init -b main`
    index: {},
    workingDir: {},
    reflog: [],
    insertionOrder: [],
    ignored: [],
  };
}

export function init(state: RepoState): ReduceResult {
  if (state.initialised) {
    return { state, events: [{ kind: 'error', reasonKey: 'already-a-repo' }] };
  }
  return { state: { ...state, initialised: true }, events: [{ kind: 'repo-initialised' }] };
}
