import { useState } from 'react';
import type { GitAction, RepoState } from '../engine/types';
import { workingFiles, type WorkStatus } from './fileStatus';

const STATUS_STYLE: Record<WorkStatus, string> = {
  untracked: 'text-zinc-500',
  modified: 'text-amber-400',
  staged: 'text-emerald-400',
  clean: 'text-zinc-400',
  deleted: 'text-rose-400 line-through',
};

export function WorkingDirPanel({ state, dispatch }: { state: RepoState; dispatch: (a: GitAction) => unknown }) {
  const files = workingFiles(state);
  const [newName, setNewName] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');

  const openEditor = (path: string) => { setEditing(path); setEditContent(state.workingDir[path] ?? ''); };
  const saveEditor = () => { if (editing) { dispatch({ cmd: 'writeFile', path: editing, content: editContent }); setEditing(null); } };

  return (
    <section className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 mb-2">Working directory</h2>
      <ul className="space-y-1 mb-3">
        {files.length === 0 && <li className="text-sm text-zinc-600 italic">empty</li>}
        {files.map((f) => (
          <li key={f.path} className="flex items-center justify-between gap-2 text-sm font-mono">
            <button className={`truncate hover:underline ${STATUS_STYLE[f.status]}`} onClick={() => openEditor(f.path)} title="edit">
              {f.path}
            </button>
            <span className="flex items-center gap-2">
              <span className="text-[10px] uppercase text-zinc-600">{f.status}</span>
              {f.status !== 'clean' && f.status !== 'staged' && f.status !== 'deleted' && (
                <button className="text-emerald-400 hover:text-emerald-300 text-xs" onClick={() => dispatch({ cmd: 'add', paths: [f.path] })} title="stage (git add)">
                  stage →
                </button>
              )}
            </span>
          </li>
        ))}
      </ul>

      <div className="flex gap-2">
        <input
          value={newName} onChange={(e) => setNewName(e.target.value)}
          placeholder="new-file.txt"
          className="flex-1 min-w-0 rounded bg-zinc-800 px-2 py-1 text-sm font-mono text-zinc-100 placeholder:text-zinc-600"
        />
        <button
          className="rounded bg-zinc-700 px-2 py-1 text-sm hover:bg-zinc-600 disabled:opacity-40"
          disabled={newName.trim() === ''}
          onClick={() => { dispatch({ cmd: 'writeFile', path: newName.trim(), content: '' }); openEditor(newName.trim()); setNewName(''); }}
        >
          + file
        </button>
      </div>

      {editing && (
        <div className="mt-3 rounded border border-zinc-700 bg-zinc-950 p-2">
          <div className="text-xs font-mono text-zinc-400 mb-1">{editing}</div>
          <textarea
            value={editContent} onChange={(e) => setEditContent(e.target.value)} rows={4}
            className="w-full rounded bg-zinc-900 p-2 text-sm font-mono text-zinc-100"
          />
          <div className="flex justify-end gap-2 mt-2">
            <button className="text-xs text-zinc-400 hover:text-zinc-200" onClick={() => setEditing(null)}>cancel</button>
            <button className="rounded bg-emerald-700 px-2 py-1 text-xs hover:bg-emerald-600" onClick={saveEditor}>save</button>
          </div>
        </div>
      )}
    </section>
  );
}
