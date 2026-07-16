import { useMemo } from 'react';
import { initialState } from './engine/actions/init';
import { reduce } from './engine/reduce';
import type { GitAction, RepoState } from './engine/types';
import { layout } from './layout/layout';
import { GitGraph } from './graph/GitGraph';

// A tiny scripted history that reads like a textbook branch diagram:
// main goes first-commit → add-intro → start-app (a straight trunk), and
// `feature` splits off after add-intro into its own lane.
const DEMO: GitAction[] = [
  { cmd: 'init' },
  { cmd: 'writeFile', path: 'readme.md', content: '# project' }, { cmd: 'add', paths: ['readme.md'] }, { cmd: 'commit', message: 'first commit' },
  { cmd: 'writeFile', path: 'readme.md', content: '# project\nintro' }, { cmd: 'add', paths: ['readme.md'] }, { cmd: 'commit', message: 'add intro' },
  { cmd: 'branch', name: 'feature' },
  { cmd: 'writeFile', path: 'app.js', content: 'start' }, { cmd: 'add', paths: ['app.js'] }, { cmd: 'commit', message: 'start app' },
  { cmd: 'switch', target: 'feature' },
  { cmd: 'writeFile', path: 'feature.txt', content: 'wip' }, { cmd: 'add', paths: ['feature.txt'] }, { cmd: 'commit', message: 'begin feature' },
  { cmd: 'writeFile', path: 'feature.txt', content: 'wip more' }, { cmd: 'add', paths: ['feature.txt'] }, { cmd: 'commit', message: 'more feature' },
  { cmd: 'switch', target: 'main' },
];

function buildDemo(): RepoState {
  let state = initialState();
  for (const action of DEMO) {
    const result = reduce(state, action);
    const err = result.events.find((e) => e.kind === 'error');
    if (err) throw new Error(`demo build error on ${JSON.stringify(action)}: ${JSON.stringify(err)}`);
    state = result.state;
  }
  return state;
}

export default function App() {
  const model = useMemo(() => layout(buildDemo()), []);
  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 p-6 md:p-10">
      <header className="mb-6">
        <h1 className="text-xl font-semibold text-zinc-100">git, visually</h1>
        <p className="text-sm text-zinc-500 mt-1 font-mono">
          time flows left → right · each dot is a commit · a branch splits into its own lane
        </p>
      </header>
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 overflow-x-auto">
        <GitGraph model={model} />
      </div>
    </main>
  );
}
