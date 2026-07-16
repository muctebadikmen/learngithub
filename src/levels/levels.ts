import { canCommit } from '../ui/affordances';
import type { Level } from './types';
import { applyActions } from './seed';
import {
  commitCountOnHead, hasReachableMessage, headBranch, tipMessage, uniqueTo,
} from './predicates';

export const LEVELS: Level[] = [
  {
    id: 'first-commit',
    title: 'Your first commit',
    goal: 'Create a file, stage it (git add), then make your first commit.',
    checks: [{ label: 'at least one commit exists', done: (s) => commitCountOnHead(s) >= 1 }],
  },
  {
    id: 'commit-again',
    title: 'Commit again',
    goal: 'Edit a file, stage the change, and make a second commit.',
    seed: (f) => applyActions(f, [
      { cmd: 'writeFile', path: 'readme.md', content: 'start' }, { cmd: 'add', paths: ['readme.md'] }, { cmd: 'commit', message: 'start' },
    ]),
    checks: [{ label: 'two commits in history', done: (s) => commitCountOnHead(s) >= 2 }],
  },
  {
    id: 'stage-selectively',
    title: 'Stage selectively',
    goal: 'Two new files exist: a.txt and b.txt. Stage ONLY a.txt (leave b.txt unstaged).',
    seed: (f) => applyActions(f, [
      { cmd: 'writeFile', path: 'readme.md', content: 'x' }, { cmd: 'add', paths: ['readme.md'] }, { cmd: 'commit', message: 'init' },
      { cmd: 'writeFile', path: 'a.txt', content: 'aaa' },
      { cmd: 'writeFile', path: 'b.txt', content: 'bbb' },
    ]),
    checks: [
      { label: 'a.txt is staged', done: (s) => 'a.txt' in s.index },
      { label: 'b.txt is NOT staged', done: (s) => !('b.txt' in s.index) },
    ],
  },
  {
    id: 'branch',
    title: 'Make a branch',
    goal: "Create a branch named 'feature' and make a commit on it.",
    seed: (f) => applyActions(f, [
      { cmd: 'writeFile', path: 'readme.md', content: 'x' }, { cmd: 'add', paths: ['readme.md'] }, { cmd: 'commit', message: 'init' },
    ]),
    checks: [
      { label: "branch 'feature' exists", done: (s) => 'feature' in s.branches },
      { label: "'feature' has a commit main doesn't", done: (s) => uniqueTo(s, 'feature', 'main').length >= 1 },
    ],
  },
  {
    id: 'switch',
    title: 'Switch branches',
    goal: "You're on 'feature'. Switch back to the main branch.",
    seed: (f) => applyActions(f, [
      { cmd: 'writeFile', path: 'readme.md', content: 'x' }, { cmd: 'add', paths: ['readme.md'] }, { cmd: 'commit', message: 'init' },
      { cmd: 'switch', target: 'feature', create: true },
      { cmd: 'writeFile', path: 'feature.txt', content: 'wip' }, { cmd: 'add', paths: ['feature.txt'] }, { cmd: 'commit', message: 'feature work' },
    ]),
    checks: [{ label: 'HEAD is on main', done: (s) => headBranch(s) === 'main' }],
  },
  {
    id: 'diverge',
    title: 'Diverge two branches',
    goal: "main and 'feature' point at the same commit. Commit once on each so they diverge.",
    seed: (f) => applyActions(f, [
      { cmd: 'writeFile', path: 'readme.md', content: 'x' }, { cmd: 'add', paths: ['readme.md'] }, { cmd: 'commit', message: 'init' },
      { cmd: 'branch', name: 'feature' },
    ]),
    checks: [
      { label: 'main has its own commit', done: (s) => uniqueTo(s, 'main', 'feature').length >= 1 },
      { label: "'feature' has its own commit", done: (s) => uniqueTo(s, 'feature', 'main').length >= 1 },
    ],
  },
  {
    id: 'undo-soft',
    title: 'Undo a commit, keep the work',
    goal: 'Undo your most recent commit but keep its changes staged. Select the earlier commit, then reset (soft).',
    seed: (f) => applyActions(f, [
      { cmd: 'writeFile', path: 'readme.md', content: '1' }, { cmd: 'add', paths: ['readme.md'] }, { cmd: 'commit', message: 'first' },
      { cmd: 'writeFile', path: 'readme.md', content: '2' }, { cmd: 'add', paths: ['readme.md'] }, { cmd: 'commit', message: 'second' },
    ]),
    checks: [
      { label: 'history is back to one commit', done: (s) => commitCountOnHead(s) === 1 },
      { label: 'the change is still staged', done: (s) => canCommit(s) },
    ],
  },
  {
    id: 'amend',
    title: 'Fix the last commit message',
    goal: "Your last commit says 'tpyo'. Amend it to say 'add readme'.",
    seed: (f) => applyActions(f, [
      { cmd: 'writeFile', path: 'readme.md', content: 'x' }, { cmd: 'add', paths: ['readme.md'] }, { cmd: 'commit', message: 'tpyo' },
    ]),
    checks: [{ label: "the last commit says 'add readme'", done: (s) => tipMessage(s) === 'add readme' }],
  },
  {
    id: 'detach',
    title: 'Detach HEAD',
    goal: 'Check out an earlier commit directly (detached HEAD): select it, then "checkout (detached)".',
    seed: (f) => applyActions(f, [
      { cmd: 'writeFile', path: 'readme.md', content: '1' }, { cmd: 'add', paths: ['readme.md'] }, { cmd: 'commit', message: 'one' },
      { cmd: 'writeFile', path: 'readme.md', content: '2' }, { cmd: 'add', paths: ['readme.md'] }, { cmd: 'commit', message: 'two' },
    ]),
    checks: [{ label: 'HEAD is detached', done: (s) => s.head.kind === 'detached' }],
  },
  {
    id: 'rescue-ghost',
    title: 'Rescue a lost commit',
    goal: "You reset too far — 'important work' is now a ghost (faded, unreachable). Point main back at it: select the ghost, then reset (hard).",
    seed: (f) => applyActions(f, [
      { cmd: 'writeFile', path: 'readme.md', content: '1' }, { cmd: 'add', paths: ['readme.md'] }, { cmd: 'commit', message: 'one' },
      { cmd: 'writeFile', path: 'readme.md', content: '2' }, { cmd: 'add', paths: ['readme.md'] }, { cmd: 'commit', message: 'two' },
      { cmd: 'writeFile', path: 'readme.md', content: '3' }, { cmd: 'add', paths: ['readme.md'] }, { cmd: 'commit', message: 'important work' },
      { cmd: 'reset', mode: 'hard', target: 'HEAD~1' },
    ]),
    checks: [{ label: "'important work' is reachable again", done: (s) => hasReachableMessage(s, 'important work') }],
  },
];
