import { headCommitOid, resolveRef } from '../refs';
import { getBlob, treeOf } from '../store';
import type { Head, Oid, ReduceResult, RepoState } from '../types';

/** Tracked changes uncommitted? (untracked files never count) */
export function isDirty(state: RepoState): boolean {
  const headEntries = treeOf(state, headCommitOid(state));
  const idx = state.index;
  const same = (a: Record<string, Oid>, b: Record<string, Oid>) =>
    Object.keys(a).length === Object.keys(b).length &&
    Object.keys(a).every((k) => a[k] === b[k]);
  if (!same(idx, headEntries)) return true;
  for (const [path, blobOid] of Object.entries(headEntries)) {
    if (state.workingDir[path] !== getBlob(state, blobOid).content) return true;
  }
  return false;
}

export function switchTo(
  state: RepoState,
  target: string,
  opts: { create?: boolean; detach?: boolean } = {},
): ReduceResult {
  if (isDirty(state)) return { state, events: [{ kind: 'error', reasonKey: 'switch-dirty' }] };

  if (opts.create) {
    if (state.branches[target] !== undefined) {
      return { state, events: [{ kind: 'error', reasonKey: 'branch-exists', params: { name: target } }] };
    }
    const tip = headCommitOid(state);
    if (tip === null) return { state, events: [{ kind: 'error', reasonKey: 'no-commits-yet' }] };
    const head: Head = { kind: 'branch', name: target };
    return {
      state: {
        ...state,
        branches: { ...state.branches, [target]: tip },
        head,
        reflog: [{ from: tip, to: tip, action: 'switch' }, ...state.reflog],
      },
      events: [{ kind: 'ref-moved', ref: target, from: null, to: tip }, { kind: 'head-moved', head }],
    };
  }

  let head: Head;
  let targetOid: Oid;
  if (!opts.detach && state.branches[target] !== undefined) {
    head = { kind: 'branch', name: target };
    targetOid = state.branches[target];
  } else {
    const oid = resolveRef(state, target);
    if (oid === null) {
      return { state, events: [{ kind: 'error', reasonKey: 'unknown-ref', params: { ref: target } }] };
    }
    if (!opts.detach) {
      return { state, events: [{ kind: 'error', reasonKey: 'detach-requires-flag', params: { ref: target } }] };
    }
    head = { kind: 'detached', oid };
    targetOid = oid;
  }

  // rebuild tracked files from the target tree; carry untracked files
  const entries = treeOf(state, targetOid);
  const headEntries = treeOf(state, headCommitOid(state));
  const workingDir: Record<string, string> = {};
  for (const [path, content] of Object.entries(state.workingDir)) {
    if (!(path in headEntries)) workingDir[path] = content; // untracked survives
  }
  for (const [path, blobOid] of Object.entries(entries)) {
    workingDir[path] = getBlob(state, blobOid).content;
  }
  const from = headCommitOid(state);
  return {
    state: {
      ...state,
      head,
      index: { ...entries },
      workingDir,
      reflog: [{ from, to: targetOid, action: 'switch' }, ...state.reflog],
    },
    events: [
      { kind: 'head-moved', head },
      { kind: 'worktree-updated', paths: Object.keys(entries) },
    ],
  };
}
