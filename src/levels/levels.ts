import type { Level } from './types';
import { applyActions } from './seed';
import {
  commitCountOnHead, messageInBranch, headBranch, tipMessage, uniqueTo,
} from './predicates';
import { getBlob } from '../engine/store';

export const LEVELS: Level[] = [
  {
    id: 'first-commit',
    title: 'level.first-commit.title',
    goal: 'level.first-commit.goal',
    checks: [{ label: 'level.first-commit.check.0', done: (s) => commitCountOnHead(s) >= 1 }],
  },
  {
    id: 'commit-again',
    title: 'level.commit-again.title',
    goal: 'level.commit-again.goal',
    seed: (f) => applyActions(f, [
      { cmd: 'writeFile', path: 'readme.md', content: 'start' }, { cmd: 'add', paths: ['readme.md'] }, { cmd: 'commit', message: 'start' },
    ]),
    checks: [{ label: 'level.commit-again.check.0', done: (s) => commitCountOnHead(s) >= 2 }],
  },
  {
    id: 'stage-selectively',
    title: 'level.stage-selectively.title',
    goal: 'level.stage-selectively.goal',
    seed: (f) => applyActions(f, [
      { cmd: 'writeFile', path: 'readme.md', content: 'x' }, { cmd: 'add', paths: ['readme.md'] }, { cmd: 'commit', message: 'init' },
      { cmd: 'writeFile', path: 'a.txt', content: 'aaa' },
      { cmd: 'writeFile', path: 'b.txt', content: 'bbb' },
    ]),
    checks: [
      { label: 'level.stage-selectively.check.0', done: (s) => 'a.txt' in s.index },
      { label: 'level.stage-selectively.check.1', done: (s) => !('b.txt' in s.index) },
    ],
  },
  {
    id: 'branch',
    title: 'level.branch.title',
    goal: 'level.branch.goal',
    seed: (f) => applyActions(f, [
      { cmd: 'writeFile', path: 'readme.md', content: 'x' }, { cmd: 'add', paths: ['readme.md'] }, { cmd: 'commit', message: 'init' },
    ]),
    checks: [
      { label: 'level.branch.check.0', done: (s) => 'feature' in s.branches },
      { label: 'level.branch.check.1', done: (s) => uniqueTo(s, 'feature', 'main').length >= 1 },
    ],
  },
  {
    id: 'switch',
    title: 'level.switch.title',
    goal: 'level.switch.goal',
    seed: (f) => applyActions(f, [
      { cmd: 'writeFile', path: 'readme.md', content: 'x' }, { cmd: 'add', paths: ['readme.md'] }, { cmd: 'commit', message: 'init' },
      { cmd: 'switch', target: 'feature', create: true },
      { cmd: 'writeFile', path: 'feature.txt', content: 'wip' }, { cmd: 'add', paths: ['feature.txt'] }, { cmd: 'commit', message: 'feature work' },
    ]),
    checks: [{ label: 'level.switch.check.0', done: (s) => headBranch(s) === 'main' }],
  },
  {
    id: 'diverge',
    title: 'level.diverge.title',
    goal: 'level.diverge.goal',
    seed: (f) => applyActions(f, [
      { cmd: 'writeFile', path: 'readme.md', content: 'x' }, { cmd: 'add', paths: ['readme.md'] }, { cmd: 'commit', message: 'init' },
      { cmd: 'branch', name: 'feature' },
    ]),
    checks: [
      { label: 'level.diverge.check.0', done: (s) => uniqueTo(s, 'main', 'feature').length >= 1 },
      { label: 'level.diverge.check.1', done: (s) => uniqueTo(s, 'feature', 'main').length >= 1 },
    ],
  },
  {
    id: 'undo-soft',
    title: 'level.undo-soft.title',
    goal: 'level.undo-soft.goal',
    seed: (f) => applyActions(f, [
      { cmd: 'writeFile', path: 'readme.md', content: '1' }, { cmd: 'add', paths: ['readme.md'] }, { cmd: 'commit', message: 'first' },
      { cmd: 'writeFile', path: 'readme.md', content: '2' }, { cmd: 'add', paths: ['readme.md'] }, { cmd: 'commit', message: 'second' },
    ]),
    checks: [
      { label: 'level.undo-soft.check.0', done: (s) => commitCountOnHead(s) === 1 },
      { label: 'level.undo-soft.check.1', done: (s) => 'readme.md' in s.index && getBlob(s, s.index['readme.md']).content === '2' },
    ],
  },
  {
    id: 'amend',
    title: 'level.amend.title',
    goal: 'level.amend.goal',
    seed: (f) => applyActions(f, [
      { cmd: 'writeFile', path: 'readme.md', content: 'x' }, { cmd: 'add', paths: ['readme.md'] }, { cmd: 'commit', message: 'tpyo' },
    ]),
    checks: [
      { label: 'level.amend.check.0', done: (s) => tipMessage(s) === 'add readme' },
      { label: 'level.amend.check.1', done: (s) => commitCountOnHead(s) === 1 },
    ],
  },
  {
    id: 'detach',
    title: 'level.detach.title',
    goal: 'level.detach.goal',
    seed: (f) => applyActions(f, [
      { cmd: 'writeFile', path: 'readme.md', content: '1' }, { cmd: 'add', paths: ['readme.md'] }, { cmd: 'commit', message: 'one' },
      { cmd: 'writeFile', path: 'readme.md', content: '2' }, { cmd: 'add', paths: ['readme.md'] }, { cmd: 'commit', message: 'two' },
    ]),
    checks: [{ label: 'level.detach.check.0', done: (s) => s.head.kind === 'detached' }],
  },
  {
    id: 'rescue-ghost',
    title: 'level.rescue-ghost.title',
    goal: 'level.rescue-ghost.goal',
    seed: (f) => applyActions(f, [
      { cmd: 'writeFile', path: 'readme.md', content: '1' }, { cmd: 'add', paths: ['readme.md'] }, { cmd: 'commit', message: 'one' },
      { cmd: 'writeFile', path: 'readme.md', content: '2' }, { cmd: 'add', paths: ['readme.md'] }, { cmd: 'commit', message: 'two' },
      { cmd: 'writeFile', path: 'readme.md', content: '3' }, { cmd: 'add', paths: ['readme.md'] }, { cmd: 'commit', message: 'important work' },
      { cmd: 'reset', mode: 'hard', target: 'HEAD~1' },
    ]),
    checks: [{ label: 'level.rescue-ghost.check.0', done: (s) => messageInBranch(s, 'main', 'important work') }],
  },
];
