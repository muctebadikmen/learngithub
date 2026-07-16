import { headCommitOid } from '../engine/refs';
import { getBlob, treeOf } from '../engine/store';
import type { RepoState } from '../engine/types';

export type WorkStatus = 'untracked' | 'modified' | 'staged' | 'clean' | 'deleted';
export interface WorkingFile { path: string; status: WorkStatus }
export interface StagedFile { path: string; kind: 'added' | 'modified' }

/** Every file in the working directory or tracked by index/HEAD, classified. */
export function workingFiles(state: RepoState): WorkingFile[] {
  const head = treeOf(state, headCommitOid(state));
  const idx = state.index;
  const rows: WorkingFile[] = [];
  const paths = new Set<string>([
    ...Object.keys(state.workingDir),
    ...Object.keys(idx),
    ...Object.keys(head),
  ]);
  for (const path of paths) {
    if (!(path in state.workingDir)) { rows.push({ path, status: 'deleted' }); continue; }
    const content = state.workingDir[path];
    if (!(path in idx)) { rows.push({ path, status: 'untracked' }); continue; }
    if (content !== getBlob(state, idx[path]).content) { rows.push({ path, status: 'modified' }); continue; }
    rows.push({ path, status: head[path] === idx[path] ? 'clean' : 'staged' });
  }
  return rows.sort((a, b) => a.path.localeCompare(b.path));
}

/** Index entries that differ from HEAD — i.e. what a commit would newly record. */
export function stagedFiles(state: RepoState): StagedFile[] {
  const head = treeOf(state, headCommitOid(state));
  const rows: StagedFile[] = [];
  for (const [path, oid] of Object.entries(state.index)) {
    if (head[path] === undefined) rows.push({ path, kind: 'added' });
    else if (head[path] !== oid) rows.push({ path, kind: 'modified' });
  }
  return rows.sort((a, b) => a.path.localeCompare(b.path));
}
