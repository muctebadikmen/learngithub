import { headCommitOid } from '../refs';
import type { ReduceResult, RepoState } from '../types';

export function branch(state: RepoState, name: string): ReduceResult {
  if (state.branches[name] !== undefined) {
    return { state, events: [{ kind: 'error', reasonKey: 'branch-exists', params: { name } }] };
  }
  const tip = headCommitOid(state);
  if (tip === null) return { state, events: [{ kind: 'error', reasonKey: 'no-commits-yet' }] };
  return {
    state: { ...state, branches: { ...state.branches, [name]: tip } },
    events: [{ kind: 'ref-moved', ref: name, from: null, to: tip }],
  };
}
