import type { Oid, RepoState } from './types';
import { getCommit } from './store';

export function headCommitOid(state: RepoState): Oid | null {
  if (state.head.kind === 'detached') return state.head.oid;
  return state.branches[state.head.name] ?? null;
}

export function resolveRef(state: RepoState, ref: string): Oid | null {
  const tilde = ref.match(/^(.+)~(\d+)$/);
  if (tilde) {
    let oid = resolveRef(state, tilde[1]);
    for (let i = 0; i < Number(tilde[2]); i++) {
      if (oid === null) return null;
      const parents = getCommit(state, oid).parents;
      oid = parents.length > 0 ? parents[0] : null;
    }
    return oid;
  }
  const at = ref.match(/^HEAD@\{(\d+)\}$/);
  if (at) {
    const entry = state.reflog[Number(at[1])];
    return entry ? entry.to : null;
  }
  if (ref === 'HEAD') return headCommitOid(state);
  if (state.branches[ref] !== undefined) return state.branches[ref];
  if (/^[0-9a-f]{16}$/.test(ref) && state.objects[ref]?.kind === 'commit') return ref;
  if (/^[0-9a-f]{4,15}$/.test(ref)) {
    const hits = Object.keys(state.objects)
      .filter((o) => o.startsWith(ref) && state.objects[o].kind === 'commit');
    return hits.length === 1 ? hits[0] : null;
  }
  return null;
}
