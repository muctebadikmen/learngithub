import type { LayoutModel, LayoutNode } from '../layout/types';
import { COL_W, LANE_H, MARGIN_X, MARGIN_Y, NODE_R, laneColor, nodeX, nodeY, shortLabel } from './geometry';

const GHOST = '#6b7280'; // muted gray for unreachable commits
const PILL_STEP = 22;    // vertical gap between stacked labels above a node

// Edge from a child (right) back to its parent (left). Straight when same lane;
// a gentle horizontal S-curve when the branch changes lanes.
function edgePath(cx: number, cy: number, px: number, py: number): string {
  if (cy === py) return `M ${cx} ${cy} L ${px} ${py}`;
  const midX = (cx + px) / 2;
  return `M ${cx} ${cy} C ${midX} ${cy}, ${midX} ${py}, ${px} ${py}`;
}

// Baseline Y of the i-th stacked label above a node (i=0 is closest to the dot).
const pillY = (y: number, i: number): number => y - NODE_R - 12 - i * PILL_STEP;

export function GitGraph({ model }: { model: LayoutModel }) {
  const { nodes, edges, refs } = model;
  const byOid = new Map<string, LayoutNode>(nodes.map((n) => [n.oid, n]));

  if (nodes.length === 0) {
    return (
      <svg viewBox="0 0 420 200" width="100%" role="img" aria-label="commit graph">
        <text x="210" y="100" textAnchor="middle" fill="#6b7280"
              fontFamily="ui-monospace, monospace" fontSize="16">
          no commits yet
        </text>
      </svg>
    );
  }

  // Refs grouped by the commit they point at, so multiple labels stack above a node.
  const refsByOid = new Map<string, typeof refs>();
  for (const r of refs) {
    const list = refsByOid.get(r.oid) ?? [];
    list.push(r);
    refsByOid.set(r.oid, list);
  }

  // A detached HEAD draws its own marker, stacked ABOVE any branch pills on the same commit.
  const detachedOid = model.detachedHead ? model.headOid : null;

  // Tallest label stack across all nodes → headroom the viewBox needs so pills on
  // a lane-0 (topmost) node never clip above the top edge.
  let maxStack = 0;
  for (const n of nodes) {
    const count = (refsByOid.get(n.oid)?.length ?? 0) + (n.oid === detachedOid ? 1 : 0);
    if (count > maxStack) maxStack = count;
  }

  const topPad = maxStack === 0 ? 26 : 26 + maxStack * PILL_STEP;
  const botPad = NODE_R + 34; // room for the message under the lowest lane
  const minY = MARGIN_Y - NODE_R - topPad;
  const bottom = MARGIN_Y + Math.max(0, model.laneCount - 1) * LANE_H + botPad;
  const width = MARGIN_X * 2 + Math.max(0, model.rowCount - 1) * COL_W + 160;
  const height = bottom - minY;

  return (
    <svg viewBox={`0 ${minY} ${width} ${height}`} width="100%" role="img" aria-label="commit graph"
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

      {/* nodes: ref pills (and detached-HEAD marker) above, dot, short message below */}
      {nodes.map((n) => {
        const x = nodeX(n.row);
        const y = nodeY(n.lane);
        const color = n.reachable ? laneColor(n.lane) : GHOST;
        const nodeRefs = refsByOid.get(n.oid) ?? [];
        return (
          <g key={n.oid} opacity={n.reachable ? 1 : 0.45}>
            <circle cx={x} cy={y} r={NODE_R}
                    fill={n.reachable ? color : '#18181b'}
                    stroke={color} strokeWidth={2.5}
                    strokeDasharray={n.reachable ? undefined : '3 3'} />
            <text x={x} y={y + NODE_R + 18} textAnchor="middle" fill="#d4d4d8" fontSize="12.5">
              {shortLabel(n.message)}
            </text>
            {nodeRefs.map((r, i) => {
              const label = r.isHead ? `HEAD → ${r.label}` : r.label;
              const w = label.length * 7 + 16;
              const py = pillY(y, i);
              return (
                <g key={r.label}>
                  <rect x={x - w / 2} y={py - 13} rx={7} ry={7} width={w} height={19}
                        fill={laneColor(n.lane)} opacity={r.isHead ? 0.28 : 0.16}
                        stroke={laneColor(n.lane)} strokeWidth={1.5} />
                  <text x={x} y={py} textAnchor="middle" fill={laneColor(n.lane)} fontSize="11.5"
                        fontWeight={r.isHead ? 700 : 500}>
                    {label}
                  </text>
                </g>
              );
            })}
            {n.oid === detachedOid && (() => {
              const py = pillY(y, nodeRefs.length); // above any branch pills on this commit
              return (
                <g>
                  <rect x={x - 26} y={py - 13} rx={7} ry={7} width={52} height={19}
                        fill="none" stroke="#e4e4e7" strokeWidth={1.5} strokeDasharray="3 3" />
                  <text x={x} y={py} textAnchor="middle" fill="#e4e4e7" fontSize="11.5">HEAD</text>
                </g>
              );
            })()}
          </g>
        );
      })}
    </svg>
  );
}
