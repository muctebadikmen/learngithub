import { headCommitOid } from '../refs';
import { getBlob, treeOf } from '../store';
import type { Oid, ReduceResult, RepoState } from '../types';

export function restore(
  state: RepoState,
  paths: string[],
  opts: { staged?: boolean } = {},
): ReduceResult {
  if (opts.staged) {
    const headEntries = treeOf(state, headCommitOid(state));
    const index: Record<string, Oid> = { ...state.index };
    for (const path of paths) {
      if (path in headEntries) index[path] = headEntries[path];
      else if (path in index) delete index[path];
      else {
        return { state, events: [{ kind: 'error', reasonKey: 'pathspec-no-match', params: { path } }] };
      }
    }
    return { state: { ...state, index }, events: [{ kind: 'index-updated', paths }] };
  }
  const workingDir = { ...state.workingDir };
  for (const path of paths) {
    const blobOid = state.index[path];
    if (blobOid === undefined) {
      return { state, events: [{ kind: 'error', reasonKey: 'pathspec-no-match', params: { path } }] };
    }
    workingDir[path] = getBlob(state, blobOid).content;
  }
  return { state: { ...state, workingDir }, events: [{ kind: 'worktree-updated', paths }] };
}
