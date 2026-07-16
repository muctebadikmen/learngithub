import type { LayoutModel, LayoutNode } from '../layout/types';
import { LABEL_W, LANE_W, MARGIN_X, MARGIN_Y, NODE_R, ROW_H, laneColor, nodeX, nodeY } from './geometry';

const GHOST = '#6b7280'; // muted gray for unreachable commits

function edgePath(cx: number, cy: number, px: number, py: number): string {
  if (cx === px) return `M ${cx} ${cy} L ${px} ${py}`; // straight, same lane
  const midY = (cy + py) / 2;
  return `M ${cx} ${cy} C ${cx} ${midY}, ${px} ${midY}, ${px} ${py}`; // gentle S-curve across lanes
}

export function GitGraph({ model }: { model: LayoutModel }) {
  const { nodes, edges, refs } = model;
  const byOid = new Map<string, LayoutNode>(nodes.map((n) => [n.oid, n]));

  const width = MARGIN_X * 2 + Math.max(0, model.laneCount - 1) * LANE_W + LABEL_W;
  const height = MARGIN_Y * 2 + Math.max(0, model.rowCount - 1) * ROW_H;

  if (nodes.length === 0) {
    return (
      <svg viewBox="0 0 400 200" width="100%" role="img" aria-label="commit graph">
        <text x="200" y="100" textAnchor="middle" fill="#6b7280" fontFamily="ui-monospace, monospace" fontSize="16">
          no commits yet
        </text>
      </svg>
    );
  }

  // refs grouped by the commit they point at, so multiple labels stack.
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
      <g strokeWidth={2} fill="none">
        {edges.map((e) => {
          const c = byOid.get(e.child)!;
          const p = byOid.get(e.parent)!;
          const ghost = !c.reachable || !p.reachable;
          return (
            <path
              key={`${e.child}->${e.parent}`}
              d={edgePath(nodeX(c.lane), nodeY(c.row), nodeX(p.lane), nodeY(p.row))}
              stroke={ghost ? GHOST : laneColor(c.lane)}
              strokeDasharray={ghost ? '4 4' : undefined}
              opacity={ghost ? 0.4 : 0.9}
            />
          );
        })}
      </g>

      {/* nodes + messages + ref pills */}
      {nodes.map((n) => {
        const x = nodeX(n.lane);
        const y = nodeY(n.row);
        const color = n.reachable ? laneColor(n.lane) : GHOST;
        const nodeRefs = refsByOid.get(n.oid) ?? [];
        return (
          <g key={n.oid} opacity={n.reachable ? 1 : 0.4}>
            <circle
              cx={x} cy={y} r={NODE_R}
              fill={n.reachable ? color : '#18181b'}
              stroke={color}
              strokeWidth={2}
              strokeDasharray={n.reachable ? undefined : '3 3'}
            />
            <text x={x + NODE_R + 10} y={y + 4} fill="#e4e4e7" fontSize="13">
              {n.message}
            </text>
            {nodeRefs.map((r, i) => {
              const label = r.isHead ? `HEAD → ${r.label}` : r.label;
              const px = x + NODE_R + 10;
              const py = y - NODE_R - 6 - i * 20;
              return (
                <g key={r.label}>
                  <rect x={px} y={py - 12} rx={6} ry={6}
                        width={label.length * 7.6 + 14} height={17}
                        fill="none" stroke={laneColor(n.lane)} strokeWidth={1.5} opacity={0.9} />
                  <text x={px + 7} y={py} fill={laneColor(n.lane)} fontSize="11">{label}</text>
                </g>
              );
            })}
          </g>
        );
      })}

      {/* detached HEAD marker */}
      {model.detachedHead && model.headOid && byOid.get(model.headOid) && (() => {
        const n = byOid.get(model.headOid)!;
        const x = nodeX(n.lane);
        const y = nodeY(n.row);
        return (
          <g>
            <rect x={x + NODE_R + 10} y={y - NODE_R - 18} rx={6} ry={6}
                  width={52} height={17} fill="none" stroke="#e4e4e7" strokeWidth={1.5} strokeDasharray="3 3" />
            <text x={x + NODE_R + 17} y={y - NODE_R - 6} fill="#e4e4e7" fontSize="11">HEAD</text>
          </g>
        );
      })()}
    </svg>
  );
}
