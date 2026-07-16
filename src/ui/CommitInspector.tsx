import type { RepoState } from '../engine/types';
import { commitDetails } from './commitDetails';

export function CommitInspector({ state, oid }: { state: RepoState; oid: string | null }) {
  if (!oid || !state.objects[oid] || state.objects[oid].kind !== 'commit') {
    return (
      <section className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 mb-2">Commit</h2>
        <p className="text-sm text-zinc-600 italic">select a commit in the graph</p>
      </section>
    );
  }
  const d = commitDetails(state, oid);
  return (
    <section className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 mb-2">Commit</h2>
      <div className="text-sm font-mono text-zinc-100 mb-1">{d.message}</div>
      <div className="text-[11px] font-mono text-zinc-500 mb-2">
        {oid.slice(0, 8)} · {d.parents.length === 0 ? 'root' : `${d.parents.length} parent${d.parents.length > 1 ? 's' : ''}`}
      </div>
      <ul className="space-y-0.5">
        {d.files.map((f) => (
          <li key={f.path} className="text-xs font-mono text-zinc-400 truncate">{f.path}</li>
        ))}
      </ul>
    </section>
  );
}
