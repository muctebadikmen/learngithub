import { reachableCommits } from '../engine/queries';
import { headCommitOid } from '../engine/refs';
import { getCommit } from '../engine/store';
import type { Oid, RepoState } from '../engine/types';

/** All ancestor commits of `oid` (inclusive), following every parent. */
export function ancestorsOf(state: RepoState, oid: Oid | null): Set<Oid> {
  const seen = new Set<Oid>();
  const stack: Oid[] = oid ? [oid] : [];
  while (stack.length) {
    const o = stack.pop()!;
    if (seen.has(o)) continue;
    seen.add(o);
    stack.push(...getCommit(state, o).parents);
  }
  return seen;
}

export const tipOf = (state: RepoState, branch: string): Oid | null => state.branches[branch] ?? null;

/** Commits reachable from `branch` that are not reachable from `other`. */
export function uniqueTo(state: RepoState, branch: string, other: string): Oid[] {
  const a = ancestorsOf(state, tipOf(state, branch));
  const b = ancestorsOf(state, tipOf(state, other));
  return [...a].filter((o) => !b.has(o));
}

export const headBranch = (state: RepoState): string | null =>
  state.head.kind === 'branch' ? state.head.name : null;

export const commitCountOnHead = (state: RepoState): number =>
  ancestorsOf(state, headCommitOid(state)).size;

/** Message of the commit HEAD points at, or null if unborn/detached-on-nothing. */
export function tipMessage(state: RepoState): string | null {
  const h = headCommitOid(state);
  return h === null ? null : getCommit(state, h).message;
}

/** Is there any reachable commit (from any branch or detached HEAD) with this message? */
export const hasReachableMessage = (state: RepoState, message: string): boolean =>
  [...reachableCommits(state)].some((o) => getCommit(state, o).message === message);

/** Is a commit with this message reachable from `branch`'s tip? */
export const messageInBranch = (state: RepoState, branch: string, message: string): boolean =>
  [...ancestorsOf(state, tipOf(state, branch))].some((o) => getCommit(state, o).message === message);
