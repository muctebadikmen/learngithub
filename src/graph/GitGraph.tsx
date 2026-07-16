import type { LayoutModel, LayoutNode } from '../layout/types';
import { COL_W, LANE_H, MARGIN_X, MARGIN_Y, NODE_R, laneColor, nodeX, nodeY, shortLabel } from './geometry';

const GHOST = '#6b7280'; // muted gray for unreachable commits

// Edge from a child (right) back to its parent (left). Straight when same lane;
// a gentle horizontal S-curve when the branch changes lanes.
function edgePath(cx: number, cy: number, px: number, py: number): string {
  if (cy === py) return `M ${cx} ${cy} L ${px} ${py}`;
  const midX = (cx + px) / 2;
  return `M ${cx} ${cy} C ${midX} ${cy}, ${midX} ${py}, ${px} ${py}`;
}

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

  const width = MARGIN_X * 2 + Math.max(0, model.rowCount - 1) * COL_W + 160;
  const height = MARGIN_Y * 2 + Math.max(0, model.laneCount - 1) * LANE_H;

  // Group refs by the commit they point at, so multiple labels stack above a node.
  const refsByOid = new Map<string, typeof refs>();
  for (const r of refs) {
    const list = refsByOid.get(r.oid) ?? [];
    list.push(r);
    refsByOid.set(r.oid, list);
  }

  return (
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" role="img" aria-label="commit graph"
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

      {/* nodes: ref pills above, dot, short message below */}
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
              const py = y - NODE_R - 12 - i * 22;
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
          </g>
        );
      })}

      {/* detached HEAD marker (no branch to attach to) */}
      {model.detachedHead && model.headOid && byOid.get(model.headOid) && (() => {
        const n = byOid.get(model.headOid)!;
        const x = nodeX(n.row);
        const y = nodeY(n.lane);
        return (
          <g>
            <rect x={x - 26} y={y - NODE_R - 25} rx={7} ry={7} width={52} height={19}
                  fill="none" stroke="#e4e4e7" strokeWidth={1.5} strokeDasharray="3 3" />
            <text x={x} y={y - NODE_R - 12} textAnchor="middle" fill="#e4e4e7" fontSize="11.5">HEAD</text>
          </g>
        );
      })()}
    </svg>
  );
}
