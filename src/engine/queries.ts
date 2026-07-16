import { getCommit, getTree } from './store';
import type { Oid, RepoState } from './types';

export function reachableCommits(state: RepoState): Set<Oid> {
  const seen = new Set<Oid>();
  const stack: Oid[] = [...Object.values(state.branches)];
  if (state.head.kind === 'detached') stack.push(state.head.oid);
  while (stack.length > 0) {
    const oid = stack.pop()!;
    if (seen.has(oid)) continue;
    seen.add(oid);
    stack.push(...getCommit(state, oid).parents);
  }
  return seen;
}

export function unreachableCommits(state: RepoState): Oid[] {
  const reachable = reachableCommits(state);
  return state.insertionOrder.filter((oid) => !reachable.has(oid));
}

/** Blobs no tree references and the index doesn't hold: what `git fsck --lost-found` finds. */
export function danglingBlobs(state: RepoState): Oid[] {
  const referenced = new Set<Oid>(Object.values(state.index));
  for (const commitOid of state.insertionOrder) {
    const tree = getTree(state, getCommit(state, commitOid).tree);
    for (const blobOid of Object.values(tree.entries)) referenced.add(blobOid);
  }
  return Object.keys(state.objects).filter(
    (oid) => state.objects[oid].kind === 'blob' && !referenced.has(oid),
  );
}

export function log(state: RepoState): Oid[] {
  const reachable = reachableCommits(state);
  return [...state.insertionOrder].reverse().filter((oid) => reachable.has(oid));
}
