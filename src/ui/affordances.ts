import { headCommitOid } from '../engine/refs';
import { treeOf } from '../engine/store';
import { isDirty } from '../engine/actions/switch';
import type { RepoState } from '../engine/types';

/** Does the index differ from HEAD? (i.e. a commit would create a new snapshot) */
export function canCommit(state: RepoState): boolean {
  const head = treeOf(state, headCommitOid(state));
  const idx = state.index;
  const keys = new Set<string>([...Object.keys(head), ...Object.keys(idx)]);
  for (const k of keys) if (head[k] !== idx[k]) return true;
  return false;
}

export function currentBranch(state: RepoState): string | null {
  return state.head.kind === 'branch' ? state.head.name : null;
}

export function branchNames(state: RepoState): string[] {
  return Object.keys(state.branches).sort();
}

export { isDirty };
