import type { Oid, RepoState } from './types';

export function headCommitOid(state: RepoState): Oid | null {
  if (state.head.kind === 'detached') return state.head.oid;
  return state.branches[state.head.name] ?? null;
}
