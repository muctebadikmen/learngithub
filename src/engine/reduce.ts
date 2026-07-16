import type { GitAction, ReduceResult, RepoState } from './types';
import { init } from './actions/init';
import { writeFile } from './actions/worktree';
import { add } from './actions/add';
import { commit } from './actions/commit';
import { branch } from './actions/branch';
import { switchTo } from './actions/switch';

export function reduce(state: RepoState, action: GitAction): ReduceResult {
  if (!state.initialised && action.cmd !== 'init' && action.cmd !== 'writeFile') {
    return { state, events: [{ kind: 'error', reasonKey: 'not-a-repo' }] };
  }
  switch (action.cmd) {
    case 'init': return init(state);
    case 'writeFile': return writeFile(state, action.path, action.content);
    case 'add': return add(state, action.paths);
    case 'commit': return commit(state, action.message, { amend: action.amend, paths: action.paths });
    case 'branch': return branch(state, action.name);
    case 'switch': return switchTo(state, action.target, { create: action.create, detach: action.detach });
    default:
      return { state, events: [{ kind: 'error', reasonKey: 'not-implemented' }] };
  }
}
