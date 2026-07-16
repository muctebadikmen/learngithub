import { headCommitOid, resolveRef } from '../refs';
import { getBlob, treeOf } from '../store';
import type { EngineEvent, ReduceResult, RepoState } from '../types';

export function reset(
  state: RepoState,
  mode: 'soft' | 'mixed' | 'hard',
  target: string,
): ReduceResult {
  const oid = resolveRef(state, target);
  if (oid === null) {
    return { state, events: [{ kind: 'error', reasonKey: 'unknown-ref', params: { ref: target } }] };
  }
  const from = headCommitOid(state);
  const events: EngineEvent[] = [];

  // zone 1: the label
  let branches = state.branches;
  let head = state.head;
  if (head.kind === 'branch') {
    branches = { ...branches, [head.name]: oid };
    events.push({ kind: 'ref-moved', ref: head.name, from, to: oid });
  } else {
    head = { kind: 'detached', oid };
    events.push({ kind: 'head-moved', head });
  }

  const entries = treeOf(state, oid);

  // zone 2: the index
  let index = state.index;
  if (mode === 'mixed' || mode === 'hard') {
    index = { ...entries };
    events.push({ kind: 'index-updated', paths: Object.keys(entries) });
  }

  // zone 3: the working directory (untracked files survive)
  let workingDir = state.workingDir;
  if (mode === 'hard') {
    const oldTracked = treeOf(state, from);
    const next: Record<string, string> = {};
    for (const [path, content] of Object.entries(state.workingDir)) {
      if (!(path in oldTracked) && !(path in state.index)) next[path] = content;
    }
    for (const [path, blobOid] of Object.entries(entries)) {
      next[path] = getBlob(state, blobOid).content;
    }
    workingDir = next;
    events.push({ kind: 'worktree-updated', paths: Object.keys(entries) });
  }

  const reflog = [{ from, to: oid, action: 'reset' }, ...state.reflog];
  return { state: { ...state, branches, head, index, workingDir, reflog }, events };
}
