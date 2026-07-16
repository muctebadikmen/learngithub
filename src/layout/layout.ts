import { reachableCommits } from '../engine/queries';
import { getCommit } from '../engine/store';
import type { Oid, RepoState } from '../engine/types';
import type { LayoutEdge, LayoutModel, LayoutNode, LayoutRef } from './types';

/**
 * Pure mapping from repo state to grid positions.
 *
 * Rows are longest-path topological depth (oldest at row 0). Lanes are
 * per-branch-line columns: a commit inherits its first parent's lane unless
 * that parent already handed its lane to an earlier child, in which case it
 * opens the next free lane. Assignments are made once, in insertion order, and
 * never change — so an existing commit keeps its (row, lane) across actions.
 */
export function layout(state: RepoState): LayoutModel {
  const commits = state.insertionOrder; // parents precede children
  const reachable = reachableCommits(state);

  const row: Record<Oid, number> = {};
  for (const oid of commits) {
    const parents = getCommit(state, oid).parents;
    row[oid] = parents.length === 0 ? 0 : 1 + Math.max(...parents.map((p) => row[p] ?? 0));
  }

  const lane: Record<Oid, number> = {};
  const handedDown = new Set<Oid>();
  let nextLane = 0;
  for (const oid of commits) {
    const first = getCommit(state, oid).parents[0];
    if (first !== undefined && lane[first] !== undefined && !handedDown.has(first)) {
      lane[oid] = lane[first];
      handedDown.add(first);
    } else {
      lane[oid] = nextLane++;
    }
  }

  const nodes: LayoutNode[] = commits.map((oid) => {
    const c = getCommit(state, oid);
    return {
      oid,
      row: row[oid],
      lane: lane[oid],
      message: c.message,
      parents: c.parents,
      reachable: reachable.has(oid),
    };
  });

  const edges: LayoutEdge[] = [];
  for (const oid of commits) {
    for (const parent of getCommit(state, oid).parents) {
      edges.push({ child: oid, parent });
    }
  }

  const headBranch = state.head.kind === 'branch' ? state.head.name : null;
  const refs: LayoutRef[] = Object.entries(state.branches).map(([label, oid]) => ({
    label,
    oid,
    isHead: label === headBranch,
  }));

  const headOid =
    state.head.kind === 'detached'
      ? state.head.oid
      : headBranch !== null
        ? (state.branches[headBranch] ?? null)
        : null;

  return {
    nodes,
    edges,
    refs,
    headOid,
    detachedHead: state.head.kind === 'detached',
    rowCount: commits.length === 0 ? 0 : Math.max(...commits.map((o) => row[o])) + 1,
    laneCount: nextLane,
  };
}
