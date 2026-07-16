import { initialState } from '../engine/actions/init';
import { reduce } from '../engine/reduce';
import type { GitAction, RepoState } from '../engine/types';

/** A fresh, initialised, unborn repo on branch `main`. */
export const freshRepo = (): RepoState => reduce(initialState(), { cmd: 'init' }).state;

/** Apply a list of actions in order (used by level seeds and reference solutions). */
export function applyActions(state: RepoState, actions: GitAction[]): RepoState {
  let s = state;
  for (const a of actions) s = reduce(s, a).state;
  return s;
}
