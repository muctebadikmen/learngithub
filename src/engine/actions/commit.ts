import { getCommit, putObject, treeOf } from '../store';
import { headCommitOid } from '../refs';
import type { EngineEvent, Oid, ReduceResult, RepoState } from '../types';

export function commit(
  state: RepoState,
  message: string,
  opts: { amend?: boolean; paths?: string[] } = {},
): ReduceResult {
  const parentOid = headCommitOid(state);
  const events: EngineEvent[] = [];
  let objects = state.objects;
  let index = state.index;

  // --- choose the snapshot ---
  let entries: Record<string, Oid>;
  if (opts.paths) {
    // `git commit <path>`: WORKING version of named paths over the HEAD tree — Task 9.
    entries = { ...treeOf(state, parentOid) };
    const lost: Oid[] = [];
    for (const path of opts.paths) {
      if (!(path in state.workingDir)) {
        return { state, events: [{ kind: 'error', reasonKey: 'pathspec-no-match', params: { path } }] };
      }
      const res = putObject(objects, { kind: 'blob', content: state.workingDir[path] });
      objects = res.objects;
      if (index[path] !== undefined && index[path] !== res.oid) lost.push(index[path]);
      entries[path] = res.oid;
      index = { ...index, [path]: res.oid }; // staged snapshot CONSUMED, not bypassed (spec §8.4)
    }
    if (lost.length > 0) events.push({ kind: 'staged-snapshot-lost', oids: lost });
  } else {
    entries = { ...index };
  }

  // --- parents ---
  let parents: Oid[];
  if (opts.amend) {
    if (parentOid === null) return { state, events: [{ kind: 'error', reasonKey: 'no-commits-yet' }] };
    parents = getCommit(state, parentOid).parents;
  } else {
    parents = parentOid === null ? [] : [parentOid];
  }

  // --- build objects ---
  const t = putObject(objects, { kind: 'tree', entries });
  objects = t.objects;
  if (!opts.amend) {
    if (parentOid === null && Object.keys(entries).length === 0) {
      return { state, events: [{ kind: 'error', reasonKey: 'nothing-to-commit' }] };
    }
    if (parentOid !== null && t.oid === getCommit(state, parentOid).tree) {
      return { state, events: [{ kind: 'error', reasonKey: 'nothing-to-commit' }] };
    }
  }
  const c = putObject(objects, { kind: 'commit', tree: t.oid, parents, message });
  objects = c.objects;

  if (opts.amend && c.oid === parentOid) {
    // identical content => identical hash: honest content-addressing, surfaced as a no-op
    return { state, events: [{ kind: 'no-op', reasonKey: 'amend-identical' }] };
  }

  // --- move ref / HEAD, reflog, insertion order ---
  let branches = state.branches;
  let head = state.head;
  if (head.kind === 'branch') {
    branches = { ...branches, [head.name]: c.oid };
    events.push({ kind: 'ref-moved', ref: head.name, from: parentOid, to: c.oid });
  } else {
    head = { kind: 'detached', oid: c.oid };
    events.push({ kind: 'head-moved', head });
  }
  const insertionOrder = c.isNew ? [...state.insertionOrder, c.oid] : state.insertionOrder;
  const reflog = [
    { from: parentOid, to: c.oid, action: opts.amend ? 'amend' : 'commit' },
    ...state.reflog,
  ];
  events.unshift({ kind: 'commit-created', oid: c.oid });

  return { state: { ...state, objects, index, branches, head, insertionOrder, reflog }, events };
}
