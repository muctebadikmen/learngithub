import { useCallback, useMemo, useRef, useState } from 'react';
import { initialState } from '../engine/actions/init';
import { reduce } from '../engine/reduce';
import type { EngineEvent, GitAction, RepoState } from '../engine/types';

export interface RepoApi {
  state: RepoState;
  lastEvents: EngineEvent[];
  dispatch: (action: GitAction) => EngineEvent[];
  reset: () => void;
}

const freshRepo = (): RepoState => reduce(initialState(), { cmd: 'init' }).state;

/** The single source of truth: live RepoState + the one dispatch entry point. */
export function useRepo(seed?: (s: RepoState) => RepoState): RepoApi {
  const [state, setState] = useState<RepoState>(() => (seed ? seed(freshRepo()) : freshRepo()));
  const [lastEvents, setLastEvents] = useState<EngineEvent[]>([]);
  const ref = useRef(state);

  const dispatch = useCallback((action: GitAction): EngineEvent[] => {
    const r = reduce(ref.current, action);
    ref.current = r.state;
    setState(r.state);
    setLastEvents(r.events);
    return r.events;
  }, []);

  const reset = useCallback(() => {
    const fresh = freshRepo();
    ref.current = fresh;
    setState(fresh);
    setLastEvents([]);
  }, []);

  return useMemo(() => ({ state, lastEvents, dispatch, reset }), [state, lastEvents, dispatch, reset]);
}
