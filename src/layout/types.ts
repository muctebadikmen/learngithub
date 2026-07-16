import type { Oid } from '../engine/types';

/** A commit placed on the grid. row 0 = oldest (top); lane 0 = leftmost column. */
export interface LayoutNode {
  oid: Oid;
  row: number;
  lane: number;
  message: string;
  parents: Oid[];
  reachable: boolean; // false => ghost (unreachable) commit; still drawn, faded
}

/** A parent link, drawn from the child down/across to its parent. */
export interface LayoutEdge {
  child: Oid;
  parent: Oid;
}

/** A branch label. `isHead` when HEAD is attached to this branch. */
export interface LayoutRef {
  label: string;
  oid: Oid;
  isHead: boolean;
}

export interface LayoutModel {
  nodes: LayoutNode[];
  edges: LayoutEdge[];
  refs: LayoutRef[];
  headOid: Oid | null;   // commit HEAD resolves to, or null when unborn
  detachedHead: boolean; // HEAD points straight at a commit (no branch)
  rowCount: number;
  laneCount: number;
}
