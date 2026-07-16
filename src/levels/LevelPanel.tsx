import type { RepoState } from '../engine/types';
import type { Level } from './types';

export function LevelPanel({
  level, index, total, state, complete, onNext, onRestart, onSelect, unlockedCount,
}: {
  level: Level;
  index: number;
  total: number;
  state: RepoState;
  complete: boolean;
  onNext: () => void;
  onRestart: () => void;
  onSelect: (i: number) => void;
  unlockedCount: number; // levels 0..unlockedCount-1 are selectable
}) {
  return (
    <section className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
          Level {index + 1} / {total}
        </h2>
        <button className="text-[11px] text-zinc-500 hover:text-zinc-300" onClick={onRestart} title="restart this level">restart</button>
      </div>

      <div className="text-sm font-medium text-zinc-100 mb-1">{level.title}</div>
      <p className="text-sm text-zinc-400 mb-3">{level.goal}</p>

      <ul className="space-y-1 mb-3">
        {level.checks.map((c, i) => {
          const ok = c.done(state);
          return (
            <li key={i} className={`flex items-center gap-2 text-sm ${ok ? 'text-emerald-400' : 'text-zinc-500'}`}>
              <span aria-hidden>{ok ? '✓' : '○'}</span>
              <span>{c.label}</span>
            </li>
          );
        })}
      </ul>

      {complete && (
        <div className="rounded-md border border-emerald-800 bg-emerald-950/50 p-2 mb-3">
          <div className="text-sm text-emerald-300 mb-2">Level complete! 🎉</div>
          {index + 1 < total
            ? <button className="w-full rounded bg-emerald-700 px-2 py-1 text-sm hover:bg-emerald-600" onClick={onNext}>next level ▸</button>
            : <div className="text-sm text-emerald-300">You finished every level.</div>}
        </div>
      )}

      <div className="flex flex-wrap gap-1" role="group" aria-label="levels">
        {Array.from({ length: total }, (_, i) => {
          const locked = i >= unlockedCount;
          return (
            <button
              key={i}
              disabled={locked}
              onClick={() => onSelect(i)}
              className={`h-6 w-6 rounded text-[11px] ${i === index ? 'bg-emerald-700 text-white' : locked ? 'bg-zinc-900 text-zinc-700' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'}`}
              title={locked ? 'locked' : `level ${i + 1}`}
            >
              {i + 1}
            </button>
          );
        })}
      </div>
    </section>
  );
}
