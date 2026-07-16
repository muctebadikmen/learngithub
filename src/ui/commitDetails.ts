import { getBlob, getCommit, getTree } from '../engine/store';
import type { Oid, RepoState } from '../engine/types';

export interface CommitDetails {
  oid: Oid;
  message: string;
  parents: Oid[];
  files: { path: string; content: string }[];
}

export function commitDetails(state: RepoState, oid: Oid): CommitDetails {
  const c = getCommit(state, oid);
  const tree = getTree(state, c.tree);
  const files = Object.entries(tree.entries)
    .map(([path, blobOid]) => ({ path, content: getBlob(state, blobOid).content }))
    .sort((a, b) => a.path.localeCompare(b.path));
  return { oid, message: c.message, parents: c.parents, files };
}
