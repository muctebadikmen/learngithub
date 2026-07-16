import { useState } from 'react';
import type { GitAction, RepoState } from '../engine/types';
import { canCommit } from './affordances';

export function CommitBar({ state, dispatch }: { state: RepoState; dispatch: (a: GitAction) => unknown }) {
  const [message, setMessage] = useState('');
  const ready = canCommit(state) && message.trim() !== '';
  const commit = (amend?: boolean) => {
    dispatch({ cmd: 'commit', message: message.trim(), amend });
    setMessage('');
  };
  return (
    <section className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 mb-2">Commit</h2>
      <input
        value={message} onChange={(e) => setMessage(e.target.value)}
        placeholder="commit message"
        className="w-full rounded bg-zinc-800 px-2 py-1 text-sm text-zinc-100 placeholder:text-zinc-600 mb-2"
      />
      <div className="flex gap-2">
        <button
          className="flex-1 rounded bg-emerald-700 px-2 py-1 text-sm hover:bg-emerald-600 disabled:opacity-40"
          disabled={!ready} onClick={() => commit(false)}
        >
          commit
        </button>
        <button
          className="rounded border border-zinc-700 px-2 py-1 text-sm text-zinc-300 hover:bg-zinc-800 disabled:opacity-40"
          disabled={message.trim() === ''} onClick={() => commit(true)}
          title="replace the last commit (git commit --amend)"
        >
          amend
        </button>
      </div>
    </section>
  );
}
