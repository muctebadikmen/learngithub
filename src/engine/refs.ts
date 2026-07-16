import type { Oid, RepoState } from './types';

export function headCommitOid(state: RepoState): Oid | null {
  if (state.head.kind === 'detached') return state.head.oid;
  return state.branches[state.head.name] ?? null;
}

export function resolveRef(state: RepoState, ref: string): Oid | null {
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
