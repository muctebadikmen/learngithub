import { putObject } from '../store';
import type { EngineEvent, Oid, ReduceResult, RepoState } from '../types';

export function add(state: RepoState, paths: string[]): ReduceResult {
  let objects = state.objects;
  let index: Record<string, Oid> = state.index;
  for (const path of paths) {
    if (!(path in state.workingDir)) {
      return { state, events: [{ kind: 'error', reasonKey: 'pathspec-no-match', params: { path } }] };
    }
    if (state.ignored.includes(path)) {
      return { state, events: [{ kind: 'error', reasonKey: 'path-is-ignored', params: { path } }] };
    }
    const res = putObject(objects, { kind: 'blob', content: state.workingDir[path] });
    objects = res.objects;
    index = { ...index, [path]: res.oid };
  }
  const events: EngineEvent[] = [{ kind: 'index-updated', paths }];
  return { state: { ...state, objects, index }, events };
}
