import type { GitAction, RepoState } from '../engine/types';
import { workingFiles } from './fileStatus';

export function HistoryTools({ state, dispatch, selectedOid }: {
  state: RepoState; dispatch: (a: GitAction) => unknown; selectedOid: string | null;
}) {
  const target = selectedOid ?? 'HEAD';
  const targetLabel = selectedOid ? selectedOid.slice(0, 8) : 'HEAD';
  const modified = workingFiles(state).filter((f) => f.status === 'modified').map((f) => f.path);

  const reset = (mode: 'soft' | 'mixed' | 'hard') => dispatch({ cmd: 'reset', mode, target });

  return (
    <section className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3 space-y-3">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">History tools</h2>

      <div>
        <div className="text-[11px] text-zinc-500 mb-1">
          move current branch to <span className="font-mono text-zinc-300">{targetLabel}</span>
        </div>
        <div className="flex gap-1">
          <button className="rounded border border-zinc-700 px-2 py-0.5 text-xs hover:bg-zinc-800" onClick={() => reset('soft')} title="keep index + working tree">soft</button>
          <button className="rounded border border-zinc-700 px-2 py-0.5 text-xs hover:bg-zinc-800" onClick={() => reset('mixed')} title="reset index, keep working tree">mixed</button>
          <button className="rounded border border-rose-800 text-rose-300 px-2 py-0.5 text-xs hover:bg-rose-950" onClick={() => reset('hard')} title="discard index + working tree">hard</button>
        </div>
      </div>

      <div>
        <div className="text-[11px] text-zinc-500 mb-1">discard unstaged edits ({modified.length})</div>
        <button
          className="rounded border border-zinc-700 px-2 py-0.5 text-xs hover:bg-zinc-800 disabled:opacity-40"
          disabled={modified.length === 0}
          onClick={() => dispatch({ cmd: 'restore', paths: modified })}
          title="git restore <files>"
        >
          restore
        </button>
      </div>
    </section>
  );
}
