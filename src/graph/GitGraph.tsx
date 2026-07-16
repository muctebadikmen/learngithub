import type { LayoutModel, LayoutNode, LayoutRef } from '../layout/types';
import { COL_W, LANE_H, MARGIN_X, MARGIN_Y, NODE_R, laneColor, nodeX, nodeY, shortLabel } from './geometry';

const GHOST = '#6b7280'; // muted gray for unreachable commits
const PILL_STEP = 22;    // vertical gap between stacked labels above a node
const CHAR_W = 7;        // approx px per label character at our font size
const PAD = 16;          // viewBox padding around content

// Edge from a child (right) back to its parent (left). Straight when same lane;
// a gentle horizontal S-curve when the branch changes lanes.
function edgePath(cx: number, cy: number, px: number, py: number): string {
  if (cy === py) return `M ${cx} ${cy} L ${px} ${py}`;
  const midX = (cx + px) / 2;
  return `M ${cx} ${cy} C ${midX} ${cy}, ${midX} ${py}, ${px} ${py}`;
}

// Baseline Y of the i-th stacked label above a node (i=0 is closest to the dot).
const pillY = (y: number, i: number): number => y - NODE_R - 12 - i * PILL_STEP;
const refLabel = (r: LayoutRef): string => (r.isHead ? `HEAD → ${r.label}` : r.label);

// Half-width (px from the node's centre x) of the widest label on a node, so the
// viewBox reserves horizontal room and no label clips off the left or right edge.
function labelHalfWidth(nodeRefs: LayoutRef[], message: string, detached: boolean): number {
  let half = (shortLabel(message).length * CHAR_W) / 2 + 6;
  for (const r of nodeRefs) half = Math.max(half, (refLabel(r).length * CHAR_W + 16) / 2);
  if (detached) half = Math.max(half, 26);
  return half;
}

export interface GitGraphLabels {
  empty: string;
  aria: string;
  commitAria: (message: string) => string;
}

const DEFAULT_LABELS: GitGraphLabels = {
  empty: 'no commits yet',
  aria: 'commit graph',
  commitAria: (message: string) => `commit ${message}`,
};

export function GitGraph({ model, onSelect, selectedOid, labels }: {
  model: LayoutModel;
  onSelect?: (oid: string) => void;
  selectedOid?: string;
  labels?: GitGraphLabels;
}) {
  const L = labels ?? DEFAULT_LABELS;
  const { nodes, edges, refs } = model;
  const byOid = new Map<string, LayoutNode>(nodes.map((n) => [n.oid, n]));

  if (nodes.length === 0) {
    return (
      <svg viewBox="0 0 420 180" width={420} height={180} role={onSelect ? 'group' : 'img'} aria-label={L.aria}>
        <text x="210" y="94" textAnchor="middle" fill="#6b7280"
              fontFamily="ui-monospace, monospace" fontSize="16">
          {L.empty}
        </text>
      </svg>
    );
  }

  // Refs grouped by the commit they point at, so multiple labels stack above a node.
  const refsByOid = new Map<string, LayoutRef[]>();
  for (const r of refs) {
    const list = refsByOid.get(r.oid) ?? [];
    list.push(r);
    refsByOid.set(r.oid, list);
  }

  // A detached HEAD draws its own marker, stacked ABOVE any branch pills on the same commit.
  const detachedOid = model.detachedHead ? model.headOid : null;

  // Tallest label stack → vertical headroom; widest labels → horizontal room.
  let maxStack = 0;
  let minX = Infinity;
  let maxX = -Infinity;
  for (const n of nodes) {
    const nodeRefs = refsByOid.get(n.oid) ?? [];
    const stack = nodeRefs.length + (n.oid === detachedOid ? 1 : 0);
    if (stack > maxStack) maxStack = stack;
    const x = nodeX(n.row);
    const half = labelHalfWidth(nodeRefs, n.message, n.oid === detachedOid);
    minX = Math.min(minX, x - half);
    maxX = Math.max(maxX, x + half);
  }

  const topPad = maxStack === 0 ? 26 : 26 + maxStack * PILL_STEP;
  const botPad = NODE_R + 34; // room for the message under the lowest lane
  const vbX = Math.min(minX, MARGIN_X - NODE_R) - PAD;
  const vbY = MARGIN_Y - NODE_R - topPad;
  const contentRight = MARGIN_X + Math.max(0, model.rowCount - 1) * COL_W + NODE_R;
  const vbW = Math.max(maxX, contentRight) + PAD - vbX;
  const vbH = MARGIN_Y + Math.max(0, model.laneCount - 1) * LANE_H + botPad - vbY;

  // Native pixel size (viewBox units == px) so nodes never rescale as history grows —
  // the container scrolls instead, keeping every existing commit visually put.
  return (
    <svg viewBox={`${vbX} ${vbY} ${vbW} ${vbH}`} width={vbW} height={vbH}
         role={onSelect ? 'group' : 'img'} aria-label={L.aria}
         fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace">
      {/* edges under nodes */}
      <g strokeWidth={2.5} fill="none">
        {edges.map((e) => {
          const c = byOid.get(e.child)!;
          const p = byOid.get(e.parent)!;
          const ghost = !c.reachable || !p.reachable;
          return (
            <path key={`${e.child}->${e.parent}`}
                  d={edgePath(nodeX(c.row), nodeY(c.lane), nodeX(p.row), nodeY(p.lane))}
                  stroke={ghost ? GHOST : laneColor(c.lane)}
                  strokeDasharray={ghost ? '4 4' : undefined}
                  opacity={ghost ? 0.4 : 0.9} />
          );
        })}
      </g>

      {/* nodes: ref pills (and detached-HEAD marker) above, dot, short message below.
          Each node group is positioned via `transform` (relative-coordinate children) so
          that when a node's (row, lane) changes, React updates the transform and the
          `.graph-node` CSS transition animates the move instead of the SVG snapping. */}
      {nodes.map((n) => {
        const x = nodeX(n.row);
        const y = nodeY(n.lane);
        const color = n.reachable ? laneColor(n.lane) : GHOST;
        const nodeRefs = refsByOid.get(n.oid) ?? [];
        return (
          <g key={n.oid} className="graph-node" transform={`translate(${x} ${y})`}
             opacity={n.reachable ? 1 : 0.45}
             role={onSelect ? 'button' : undefined}
             tabIndex={onSelect ? 0 : undefined}
             aria-label={onSelect ? L.commitAria(n.message) : undefined}
             style={onSelect ? { cursor: 'pointer' } : undefined}
             onClick={onSelect ? () => onSelect(n.oid) : undefined}
             onKeyDown={onSelect ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(n.oid); } } : undefined}>
            {n.oid === selectedOid && (
              <circle cx={0} cy={0} r={NODE_R + 5} fill="none" stroke="#fafafa" strokeWidth={2} opacity={0.9} />
            )}
            <circle cx={0} cy={0} r={NODE_R}
                    fill={n.reachable ? color : '#18181b'}
                    stroke={color} strokeWidth={2.5}
                    strokeDasharray={n.reachable ? undefined : '3 3'} />
            <text x={0} y={NODE_R + 18} textAnchor="middle" fill="#d4d4d8" fontSize="12.5">
              {shortLabel(n.message)}
            </text>
            {nodeRefs.map((r, i) => {
              const label = refLabel(r);
              const w = label.length * CHAR_W + 16;
              const py = pillY(0, i);
              return (
                <g key={r.label}>
                  <rect x={-w / 2} y={py - 13} rx={7} ry={7} width={w} height={19}
                        fill={laneColor(n.lane)} opacity={r.isHead ? 0.28 : 0.16}
                        stroke={laneColor(n.lane)} strokeWidth={1.5} />
                  <text x={0} y={py} textAnchor="middle" fill={laneColor(n.lane)} fontSize="11.5"
                        fontWeight={r.isHead ? 700 : 500}>
                    {label}
                  </text>
                </g>
              );
            })}
            {n.oid === detachedOid && (() => {
              const py = pillY(0, nodeRefs.length); // above any branch pills on this commit
              return (
                <g>
                  <rect x={-26} y={py - 13} rx={7} ry={7} width={52} height={19}
                        fill="none" stroke="#e4e4e7" strokeWidth={1.5} strokeDasharray="3 3" />
                  <text x={0} y={py} textAnchor="middle" fill="#e4e4e7" fontSize="11.5">HEAD</text>
                </g>
              );
            })()}
          </g>
        );
      })}
    </svg>
  );
}
