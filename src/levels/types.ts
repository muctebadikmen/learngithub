import type { RepoState } from '../engine/types';

export interface Check {
  label: string;
  done: (state: RepoState) => boolean;
}

export interface Level {
  id: string;
  title: string;
  goal: string;                          // short instruction shown to the player
  checks: Check[];                       // level is complete when ALL pass
  seed?: (fresh: RepoState) => RepoState; // starting repo (defaults to a fresh empty repo)
}
