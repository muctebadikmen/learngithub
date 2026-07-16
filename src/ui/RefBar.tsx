import { useState } from 'react';
import type { GitAction, RepoState } from '../engine/types';
import { branchNames, currentBranch, validBranchName } from './affordances';

export function RefBar({ state, dispatch }: { state: RepoState; dispatch: (a: GitAction) => unknown }) {
  const [name, setName] = useState('');
  const current = currentBranch(state);
  const branches = branchNames(state);
  const ok = validBranchName(name.trim());

  return (
    <section className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3 space-y-3">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Branches</h2>

      <div>
        <div className="text-[11px] text-zinc-500 mb-1">
          on <span className="font-mono text-emerald-400">{current ?? 'detached HEAD'}</span>
        </div>
        <div className="flex flex-wrap gap-1">
          {branches.map((b) => (
            <button
              key={b}
              className={`rounded px-2 py-0.5 text-xs font-mono border ${b === current ? 'border-emerald-600 text-emerald-300' : 'border-zinc-700 text-zinc-300 hover:bg-zinc-800'}`}
              disabled={b === current}
              onClick={() => dispatch({ cmd: 'switch', target: b })}
              title={`switch to ${b}`}
            >
              {b}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-2">
        <input
          value={name} onChange={(e) => setName(e.target.value)}
          placeholder="new-branch"
          className="flex-1 min-w-0 rounded bg-zinc-800 px-2 py-1 text-sm font-mono text-zinc-100 placeholder:text-zinc-600"
        />
        <button
          className="rounded bg-zinc-700 px-2 py-1 text-xs hover:bg-zinc-600 disabled:opacity-40"
          disabled={!ok}
          onClick={() => { dispatch({ cmd: 'branch', name: name.trim() }); setName(''); }}
          title="create a branch here (git branch)"
        >
          branch
        </button>
        <button
          className="rounded bg-emerald-700 px-2 py-1 text-xs hover:bg-emerald-600 disabled:opacity-40"
          disabled={!ok}
          onClick={() => { dispatch({ cmd: 'switch', target: name.trim(), create: true }); setName(''); }}
          title="create and switch (git switch -c)"
        >
          branch + switch
        </button>
      </div>
    </section>
  );
}
