import { hashObject } from './hash';
import type { BlobObj, CommitObj, GitObject, Oid, RepoState, TreeObj } from './types';

export function putObject(
  objects: Record<Oid, GitObject>,
  obj: GitObject,
): { objects: Record<Oid, GitObject>; oid: Oid; isNew: boolean } {
  const oid = hashObject(obj);
  if (objects[oid]) return { objects, oid, isNew: false };
  return { objects: { ...objects, [oid]: obj }, oid, isNew: true };
}

function get(state: RepoState, oid: Oid, kind: GitObject['kind']): GitObject {
  const o = state.objects[oid];
  if (!o || o.kind !== kind) throw new Error(`engine bug: ${oid} is not a ${kind}`);
  return o;
}
export const getCommit = (s: RepoState, oid: Oid) => get(s, oid, 'commit') as CommitObj;
export const getTree = (s: RepoState, oid: Oid) => get(s, oid, 'tree') as TreeObj;
export const getBlob = (s: RepoState, oid: Oid) => get(s, oid, 'blob') as BlobObj;

/** Tree entries of a commit, or {} for the null (unborn) commit. */
export function treeOf(state: RepoState, commitOid: Oid | null): Record<string, Oid> {
  if (commitOid === null) return {};
  return getTree(state, getCommit(state, commitOid).tree).entries;
}
