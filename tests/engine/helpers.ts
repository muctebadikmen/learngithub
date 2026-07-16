import { initialState } from '../../src/engine/actions/init';
import { reduce } from '../../src/engine/reduce';
import type { GitAction, RepoState } from '../../src/engine/types';

export function run(actions: GitAction[], from?: RepoState): RepoState {
  let state = from ?? reduce(initialState(), { cmd: 'init' }).state;
  for (const a of actions) {
    const r = reduce(state, a);
    const err = r.events.find((e) => e.kind === 'error');
    if (err) throw new Error(`unexpected error: ${JSON.stringify(err)}`);
    state = r.state;
  }
  return state;
}

export const write = (path: string, content: string) => ({ cmd: 'writeFile', path, content } as const);
export const addF = (...paths: string[]) => ({ cmd: 'add', paths } as const);
export const commitM = (message: string) => ({ cmd: 'commit', message } as const);
