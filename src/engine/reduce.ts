import type { GitAction, ReduceResult, RepoState } from './types';
import { init } from './actions/init';
import { writeFile } from './actions/worktree';

export function reduce(state: RepoState, action: GitAction): ReduceResult {
  if (!state.initialised && action.cmd !== 'init' && action.cmd !== 'writeFile') {
    return { state, events: [{ kind: 'error', reasonKey: 'not-a-repo' }] };
  }
  switch (action.cmd) {
    case 'init': return init(state);
    case 'writeFile': return writeFile(state, action.path, action.content);
    default:
      return { state, events: [{ kind: 'error', reasonKey: 'not-implemented' }] };
  }
}
