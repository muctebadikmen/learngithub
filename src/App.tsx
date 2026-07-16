import { useMemo } from 'react';
import { initialState } from './engine/actions/init';
import { reduce } from './engine/reduce';
import type { GitAction, RepoState } from './engine/types';
import { layout } from './layout/layout';
import { GitGraph } from './graph/GitGraph';

const DEMO: GitAction[] = [
  { cmd: 'init' },
  { cmd: 'writeFile', path: 'readme.md', content: '# project' }, { cmd: 'add', paths: ['readme.md'] }, { cmd: 'commit', message: 'init project' },
  { cmd: 'writeFile', path: 'readme.md', content: '# project\nhello' }, { cmd: 'add', paths: ['readme.md'] }, { cmd: 'commit', message: 'add greeting' },
  { cmd: 'switch', target: 'feature', create: true },
  { cmd: 'writeFile', path: 'feature.txt', content: 'wip' }, { cmd: 'add', paths: ['feature.txt'] }, { cmd: 'commit', message: 'start feature' },
  { cmd: 'switch', target: 'main' },
  { cmd: 'writeFile', path: 'readme.md', content: '# project\nhello world' }, { cmd: 'add', paths: ['readme.md'] }, { cmd: 'commit', message: 'polish greeting' },
];

function buildDemo(): RepoState {
  let state = initialState();
  for (const action of DEMO) state = reduce(state, action).state;
  return state;
}

export default function App() {
  const model = useMemo(() => layout(buildDemo()), []);
  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 p-6">
      <h1 className="text-lg font-mono text-zinc-400 mb-4">git graph</h1>
      <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4 overflow-auto">
        <GitGraph model={model} />
      </div>
    </main>
  );
}
