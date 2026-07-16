import type { ReduceResult, RepoState } from '../types';

export function parseGitignore(content: string): string[] {
  return content.split('\n').map((l) => l.trim()).filter((l) => l !== '' && !l.startsWith('#'));
}

export function writeFile(state: RepoState, path: string, content: string): ReduceResult {
  const workingDir = { ...state.workingDir, [path]: content };
  const ignored = path === '.gitignore' ? parseGitignore(content) : state.ignored;
  return { state: { ...state, workingDir, ignored }, events: [{ kind: 'file-written', path }] };
}
