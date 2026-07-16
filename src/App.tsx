import { useMemo } from 'react';
import { layout } from './layout/layout';
import { GitGraph } from './graph/GitGraph';
import { useRepo } from './ui/useRepo';
import { WorkingDirPanel } from './ui/WorkingDirPanel';
import { StagingPanel } from './ui/StagingPanel';

export default function App() {
  const repo = useRepo();
  const model = useMemo(() => layout(repo.state), [repo.state]);

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 p-4 md:p-6">
      <header className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">git, visually</h1>
          <p className="text-sm text-zinc-500 font-mono">edit files · stage · commit · branch — watch the graph</p>
        </div>
        <button className="rounded border border-zinc-700 px-3 py-1 text-sm text-zinc-400 hover:bg-zinc-800" onClick={repo.reset}>
          reset repo
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4">
        <div className="space-y-4">
          <WorkingDirPanel state={repo.state} dispatch={repo.dispatch} />
          <StagingPanel state={repo.state} dispatch={repo.dispatch} />
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 overflow-auto min-h-[300px]">
          <GitGraph model={model} />
        </div>
      </div>
    </main>
  );
}
