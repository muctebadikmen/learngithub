import { useMemo, useState, useEffect } from 'react';
import { layout } from './layout/layout';
import { GitGraph } from './graph/GitGraph';
import { useRepo } from './ui/useRepo';
import { WorkingDirPanel } from './ui/WorkingDirPanel';
import { StagingPanel } from './ui/StagingPanel';
import { CommitBar } from './ui/CommitBar';
import { RefBar } from './ui/RefBar';
import { HistoryTools } from './ui/HistoryTools';
import { CommitInspector } from './ui/CommitInspector';
import { Notice, noticeFromEvents, type NoticeData } from './ui/Notice';
import { announce } from './ui/liveRegion';
import { LEVELS } from './levels/levels';
import { LevelPanel } from './levels/LevelPanel';
import { loadProgress, saveProgress, withCompleted, type Progress } from './levels/progress';

export default function App() {
  const repo = useRepo();
  const model = useMemo(() => layout(repo.state), [repo.state]);
  const [selectedOid, setSelectedOid] = useState<string | null>(null);

  const [mode, setMode] = useState<'levels' | 'sandbox'>('levels');
  const [progress, setProgress] = useState<Progress>(() => loadProgress(LEVELS.length));

  const [notice, setNotice] = useState<NoticeData | null>(null);
  useEffect(() => { setNotice(noticeFromEvents(repo.lastEvents)); }, [repo.lastEvents]);
  const spoken = announce(repo.lastEvents);

  const index = progress.currentIndex;
  const level = LEVELS[index];
  const complete = mode === 'levels' && level.checks.every((c) => c.done(repo.state));
  const unlockedCount = Math.min(LEVELS.length, Math.max(index + 1, progress.completed.length + 1));

  // (re)seed the repo whenever the active level changes or we switch between levels/sandbox mode
  const levelKey = mode === 'levels' ? level.id : '__sandbox__';
  useEffect(() => {
    setSelectedOid(null);
    repo.reset(mode === 'levels' ? level.seed : undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [levelKey]);

  // persist completion the first time a level's checks all pass
  useEffect(() => {
    if (complete && !progress.completed.includes(level.id)) {
      const next = withCompleted(progress, level.id);
      setProgress(next);
      saveProgress(next);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [complete]);

  const goTo = (i: number) => {
    const next = { ...progress, currentIndex: i };
    setProgress(next);
    saveProgress(next);
  };

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 p-4 md:p-6">
      <div aria-live="polite" className="sr-only">{spoken}</div>
      <header className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">git, visually</h1>
          <p className="text-sm text-zinc-500 font-mono">learn git by doing — watch the graph</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded border border-zinc-700 overflow-hidden text-sm">
            <button
              className={`px-3 py-1 ${mode === 'levels' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-400'}`}
              onClick={() => setMode('levels')}
            >
              levels
            </button>
            <button
              className={`px-3 py-1 ${mode === 'sandbox' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-400'}`}
              onClick={() => setMode('sandbox')}
            >
              sandbox
            </button>
          </div>
          <button
            className="rounded border border-zinc-700 px-3 py-1 text-sm text-zinc-400 hover:bg-zinc-800"
            onClick={() => { setSelectedOid(null); repo.reset(mode === 'levels' ? level.seed : undefined); }}
          >
            {mode === 'levels' ? 'restart level' : 'reset repo'}
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4">
        <div className="space-y-4">
          {mode === 'levels' && (
            <LevelPanel
              level={level}
              index={index}
              total={LEVELS.length}
              state={repo.state}
              complete={complete}
              onNext={() => goTo(Math.min(LEVELS.length - 1, index + 1))}
              onRestart={() => { setSelectedOid(null); repo.reset(level.seed); }}
              onSelect={goTo}
              unlockedCount={unlockedCount}
            />
          )}
          <WorkingDirPanel state={repo.state} dispatch={repo.dispatch} />
          <StagingPanel state={repo.state} dispatch={repo.dispatch} />
          <CommitBar state={repo.state} dispatch={repo.dispatch} />
          <RefBar state={repo.state} dispatch={repo.dispatch} />
          <HistoryTools state={repo.state} dispatch={repo.dispatch} selectedOid={selectedOid} />
          <CommitInspector state={repo.state} oid={selectedOid} />
        </div>
        <div className="space-y-3">
          <Notice data={notice} onDismiss={() => setNotice(null)} />
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 overflow-auto min-h-[300px]">
            <GitGraph model={model} onSelect={setSelectedOid} selectedOid={selectedOid ?? undefined} />
          </div>
        </div>
      </div>
    </main>
  );
}
