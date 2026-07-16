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

export default function App() {
  const repo = useRepo();
  const model = useMemo(() => layout(repo.state), [repo.state]);
  const [selectedOid, setSelectedOid] = useState<string | null>(null);

  const [notice, setNotice] = useState<NoticeData | null>(null);
  useEffect(() => { setNotice(noticeFromEvents(repo.lastEvents)); }, [repo.lastEvents]);
  const spoken = announce(repo.lastEvents);

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 p-4 md:p-6">
      <div aria-live="polite" className="sr-only">{spoken}</div>
      <header className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">git, visually</h1>
          <p className="text-sm text-zinc-500 font-mono">edit files · stage · commit · branch — watch the graph</p>
        </div>
        <button className="rounded border border-zinc-700 px-3 py-1 text-sm text-zinc-400 hover:bg-zinc-800"
                onClick={() => { repo.reset(); setSelectedOid(null); }}>
          reset repo
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4">
        <div className="space-y-4">
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
