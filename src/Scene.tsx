import type { Branch, Commit, ModelState } from './model'
import { abandonedIds, branchCommits, headCommit } from './model'

// One persistent scene: computer (left) + GitHub (right), drawn from ModelState.
// Node positions/opacity animate via CSS transitions in index.css (.scene-node).

const THEMES = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#06b6d4']
const BLOCK_WIDTHS = [204, 156, 224, 132, 180]

// index 0 = main, 1..3 = the three possible side-branch lanes
const LANE_COLORS = ['#34d399', '#c4b5fd', '#fbbf24', '#38bdf8']
const laneColor = (laneIdx: number) => LANE_COLORS[laneIdx] ?? LANE_COLORS[0]

// main 572, lane1 464, lane2 400, lane3 336
function laneY(laneIdx: number): number {
  return 572 - 108 * Math.min(laneIdx, 1) - 64 * Math.max(laneIdx - 1, 0)
}

// same shape, compressed: main 592, lane1 528, lane2 464, lane3 400
function cloudLaneY(laneIdx: number): number {
  return 592 - 64 * Math.min(laneIdx, 1) - 64 * Math.max(laneIdx - 1, 0)
}

function AppCard({ state }: { state: ModelState }) {
  const look = state.workLook
  const theme = THEMES[look.theme % THEMES.length]
  const x = 246
  const y = 96
  const w = 300
  const h = 204
  const headerH = 36
  const rowH = 20
  const rowSpacing = 28
  const rowsStartY = y + headerH + 16
  return (
    <g className={look.broken ? 'app-card app-broken' : 'app-card'}>
      <rect x={x} y={y} width={w} height={h} rx={16} fill="#111827" stroke={look.broken ? '#ef4444' : '#374151'} strokeWidth={look.broken ? 3 : 1.5} />
      <rect x={x} y={y} width={w} height={headerH} rx={16} fill={look.broken ? '#7f1d1d' : theme} />
      <rect x={x} y={y + headerH - 16} width={w} height={16} fill={look.broken ? '#7f1d1d' : theme} />
      <text x={x + 16} y={y + 24} fontSize={16} fontWeight={700} fill="#fff">
        Uygulamam
      </text>
      {Array.from({ length: look.blocks }).map((_, i) => (
        <rect
          key={i}
          x={x + 20 + (look.broken && i % 2 ? 26 : 0)}
          y={rowsStartY + i * rowSpacing}
          width={BLOCK_WIDTHS[i % BLOCK_WIDTHS.length]}
          height={rowH}
          rx={6}
          fill={look.broken ? '#ef4444' : theme}
          opacity={look.broken ? 0.55 : 0.35 + 0.12 * ((i + 1) % 3)}
          transform={look.broken && i % 2 ? `rotate(-3 ${x + 130} ${rowsStartY + 7 + i * rowSpacing})` : undefined}
        />
      ))}
      {look.broken && (
        <g>
          <rect x={x + w - 92} y={y + h - 40} width={76} height={26} rx={13} fill="#ef4444" />
          <text x={x + w - 54} y={y + h - 22} fontSize={14} fontWeight={800} fill="#fff" textAnchor="middle">
            HATA!
          </text>
        </g>
      )}
      {state.dirty && !look.broken && (
        <g>
          <circle cx={x + w - 18} cy={y + 20} r={7} fill="#fbbf24" />
          <text x={x + w - 30} y={y + h + 24} fontSize={13} fill="#fbbf24" textAnchor="end">
            kaydedilmemiş değişiklik
          </text>
        </g>
      )}
    </g>
  )
}

type Slot = { px: (x: number) => number; r: number; laneY: (laneIdx: number) => number }

function timelineSlots(commits: Commit[], startX: number, endX: number, r: number, laneYFn: (laneIdx: number) => number): Slot {
  const maxX = commits.length ? Math.max(...commits.map((c) => c.x)) : 0
  const gap = maxX > 0 ? Math.min(92, (endX - startX) / maxX) : 0
  return {
    px: (x: number) => startX + x * gap,
    r,
    laneY: laneYFn,
  }
}

function Timeline({
  state,
  commits,
  slot,
  pushedOnly,
  showHead,
  fontSize,
}: {
  state: ModelState
  commits: Commit[]
  slot: Slot
  pushedOnly: boolean
  showHead: boolean
  fontSize: number
}) {
  const abandoned = new Set(abandonedIds(state))
  const head = headCommit(state)
  const byId = new Map(commits.map((c) => [c.id, c]))
  const suffix = pushedOnly ? 'cloud' : 'local'

  const edges: { from: Commit; to: Commit }[] = []
  for (const c of commits) {
    const parent = c.parentId ? byId.get(c.parentId) : undefined
    if (parent) edges.push({ from: parent, to: c })
    // A merge node also connects to the branch tip it merged.
    const mergedFrom = c.mergeFromId ? byId.get(c.mergeFromId) : undefined
    if (mergedFrom) edges.push({ from: mergedFrom, to: c })
  }

  return (
    <g>
      {edges.map(({ from, to }) => (
        <line
          key={`${suffix}-${from.id}-${to.id}`}
          x1={slot.px(from.x)}
          y1={slot.laneY(from.laneIdx)}
          x2={slot.px(to.x)}
          y2={slot.laneY(to.laneIdx)}
          stroke={to.laneIdx > 0 ? laneColor(to.laneIdx) : from.laneIdx > 0 ? laneColor(from.laneIdx) : '#3f3f46'}
          strokeWidth={3}
          opacity={abandoned.has(to.id) && !pushedOnly ? 0.25 : 0.8}
        />
      ))}
      {commits.map((c) => {
        const cx = slot.px(c.x)
        const cy = slot.laneY(c.laneIdx)
        const dim = !pushedOnly && abandoned.has(c.id)
        const fill = c.look.broken ? '#ef4444' : laneColor(c.laneIdx)
        return (
          <g key={`${suffix}-${c.id}`} className="scene-node" style={{ transform: `translate(${cx}px, ${cy}px)`, opacity: dim ? 0.3 : 1 }}>
            <circle r={slot.r} fill={fill} stroke="#0b0f1a" strokeWidth={3} />
            {c.isMerge && (
              <text y={5} fontSize={slot.r} textAnchor="middle">
                ⇄
              </text>
            )}
            <text y={slot.r + fontSize + 6} fontSize={fontSize} fill={dim ? '#52525b' : '#a1a1aa'} textAnchor="middle">
              {c.label}
            </text>
          </g>
        )
      })}
      {showHead && head && (
        <g className="scene-node" style={{ transform: `translate(${slot.px(head.x)}px, ${slot.laneY(head.laneIdx)}px)` }}>
          <circle r={slot.r + 7} fill="none" stroke="#fff" strokeWidth={3} />
          <g transform={`translate(0, ${slot.r + 34})`}>
            <rect x={-52} y={0} width={104} height={26} rx={13} fill="#27272a" stroke="#52525b" />
            <text y={18} fontSize={14} fontWeight={700} fill="#fff" textAnchor="middle">
              📍 buradasın
            </text>
          </g>
        </g>
      )}
    </g>
  )
}

// Dashed fork line + ghost node for every active branch that has no commits
// yet — computer panel only (nothing to show on the cloud side for those).
function GhostForks({ state, slot }: { state: ModelState; slot: Slot }) {
  return (
    <g>
      {state.branches.map((b) => {
        if (branchCommits(state, b.name).length > 0) return null
        const fork = state.commits.find((c) => c.id === b.forkId)
        if (!fork) return null
        const color = laneColor(b.laneIdx)
        const x1 = slot.px(fork.x)
        const x2 = x1 + 56
        return (
          <g key={b.name} className="scene-node">
            <line x1={x1} y1={slot.laneY(0)} x2={x2} y2={slot.laneY(b.laneIdx)} stroke={color} strokeWidth={3} strokeDasharray="7 7" opacity={0.7} />
            <circle cx={x2} cy={slot.laneY(b.laneIdx)} r={slot.r - 4} fill="none" stroke={color} strokeWidth={2.5} strokeDasharray="6 6" />
          </g>
        )
      })}
    </g>
  )
}

// One pill per active branch (positioned at its first commit, or its ghost
// fork when empty) + the main pill. On the cloud side, only branches with at
// least one pushed commit get a pill, and it sits at their first pushed commit.
function BranchPills({ state, slot, cloud }: { state: ModelState; slot: Slot; cloud?: boolean }) {
  const commits = cloud ? state.commits.filter((c) => state.pushedIds.includes(c.id)) : state.commits
  if (!commits.some((c) => c.branch === 'main')) return null

  const pillAt = (x: number, laneIdx: number, label: string, active: boolean) => {
    const color = laneColor(laneIdx)
    const y = slot.laneY(laneIdx) - (slot.r + (laneIdx === 0 ? 22 : 34))
    return (
      <g key={label} className="scene-node" style={{ transform: `translate(${x}px, ${y}px)` }}>
        <rect x={-8} y={-13} width={label.length * 9 + 24} height={26} rx={13} fill="#18181b" stroke={color} strokeWidth={active ? 2.5 : 1} />
        <text x={label.length * 4.5 + 4} y={5} fontSize={14} fontWeight={700} fill={color} textAnchor="middle">
          {label}
        </text>
      </g>
    )
  }

  const branchPill = (b: Branch) => {
    const own = commits.filter((c) => c.branch === b.name)
    if (own.length) return pillAt(slot.px(own[0].x) - 10, b.laneIdx, b.name, state.currentBranch === b.name)
    if (cloud) return null // nothing pushed for this branch yet
    const fork = state.commits.find((c) => c.id === b.forkId)
    if (!fork) return null
    return pillAt(slot.px(fork.x) + 46, b.laneIdx, b.name, state.currentBranch === b.name)
  }

  return (
    <g>
      {pillAt(slot.px(0) - (cloud ? 4 : 22), 0, 'main', state.currentBranch === 'main')}
      {state.branches.map((b) => branchPill(b))}
    </g>
  )
}

function GitHubSide({ state, labeled }: { state: ModelState; labeled: boolean }) {
  const pushed = state.commits.filter((c) => state.pushedIds.includes(c.id))
  const slot = timelineSlots(pushed, 852, 1206, 12, cloudLaneY)
  return (
    <g>
      <text x={824} y={72} fontSize={22} fontWeight={800} fill="#e4e4e7">
        ☁️ GitHub
      </text>
      <text x={824} y={98} fontSize={14} fill="#71717a">
        buluttaki yedeğin — herkesle paylaşılabilir
      </text>
      {pushed.length === 0 && !state.pr ? (
        <g opacity={0.5}>
          <rect x={880} y={280} width={300} height={140} rx={20} fill="none" stroke="#3f3f46" strokeWidth={2} strokeDasharray="8 8" />
          <text x={1030} y={340} fontSize={16} fill="#71717a" textAnchor="middle">
            burada henüz bir şey yok
          </text>
          <text x={1030} y={368} fontSize={15} fill="#71717a" textAnchor="middle">
            push’layınca dolacak
          </text>
        </g>
      ) : (
        <g>
          <g className="scene-node">
            <rect x={824} y={120} width={416} height={54} rx={12} fill="#18181b" stroke="#3f3f46" />
            <text x={846} y={153} fontSize={16} fill="#d4d4d8">
              📦 sen / <tspan fontWeight={800}>uygulamam</tspan>
            </text>
            <text x={1218} y={153} fontSize={14} fill="#71717a" textAnchor="end">
              {pushed.length} commit
            </text>
          </g>
          <Timeline state={state} commits={pushed} slot={slot} pushedOnly showHead={false} fontSize={11} />
          <BranchPills state={state} slot={slot} cloud />
        </g>
      )}
      {state.pr && (
        <g className="scene-node">
          <rect x={824} y={196} width={416} height={124} rx={14} fill="#18181b" stroke="#8b5cf6" strokeWidth={2} />
          <text x={846} y={230} fontSize={17} fontWeight={800} fill="#e4e4e7">
            ⇄ Pull Request #1
          </text>
          <text x={846} y={258} fontSize={14} fill="#a1a1aa">
            {state.pr.from} → main · “bakar mısın?”
          </text>
          <circle cx={860} cy={290} r={13} fill="#3f3f46" />
          <text x={860} y={295} fontSize={13} textAnchor="middle">
            {state.pr.status === 'open' ? '👀' : '✓'}
          </text>
          <rect x={886} y={276} width={state.pr.status === 'open' ? 116 : state.pr.status === 'approved' ? 122 : 130} height={28} rx={14} fill={state.pr.status === 'open' ? '#78350f' : state.pr.status === 'approved' ? '#14532d' : '#4c1d95'} />
          <text x={900} y={295} fontSize={14} fontWeight={700} fill="#fff">
            {state.pr.status === 'open' ? 'incelemede' : state.pr.status === 'approved' ? 'onaylandı ✓' : 'merge edildi 🎉'}
          </text>
        </g>
      )}
      {labeled && pushed.length > 0 && (
        <text x={1030} y={660} fontSize={15} fill="#fbbf24" textAnchor="middle">
          push = buraya yedeklemek
        </text>
      )}
    </g>
  )
}

export function Scene({ state, labeled = false }: { state: ModelState; labeled?: boolean }) {
  const slot = timelineSlots(state.commits, 116, 700, 18, laneY)
  return (
    <svg viewBox="0 0 1280 720" className="h-full w-full" role="img" aria-label="GitHub görselleştirmesi">
      {/* computer panel */}
      <rect x={24} y={24} width={744} height={672} rx={20} fill="#0f1420" stroke="#27272a" />
      {/* github panel */}
      <rect x={800} y={24} width={456} height={672} rx={20} fill="#0d1117" stroke="#27272a" />
      <text x={48} y={72} fontSize={22} fontWeight={800} fill="#e4e4e7">
        💻 Senin bilgisayarın
      </text>
      {state.hasRepo && (
        <g>
          <rect x={48} y={92} width={696} height={580} rx={16} fill="none" stroke="#3f3f46" strokeWidth={1.5} strokeDasharray="10 8" />
          <rect x={64} y={78} width={150} height={28} rx={14} fill="#0f1420" />
          <text x={76} y={98} fontSize={15} fontWeight={700} fill="#a1a1aa">
            📦 repo: uygulamam
          </text>
        </g>
      )}
      <AppCard state={state} />
      <Timeline state={state} commits={state.commits} slot={slot} pushedOnly={false} showHead fontSize={13} />
      <GhostForks state={state} slot={slot} />
      <BranchPills state={state} slot={slot} />
      <GitHubSide state={state} labeled={labeled} />
      {labeled && state.commits.length > 0 && (
        <g fontSize={15} fill="#fbbf24">
          <text x={396} y={664} textAnchor="middle">
            her nokta bir commit = kayıt noktası
          </text>
          {state.commits.some((c) => c.laneIdx > 0) && (
            <text x={396} y={laneY(1) - 56} textAnchor="middle">
              branch = main’i bozmayan deneme hattı
            </text>
          )}
        </g>
      )}
      {state.laptopDead && (
        <g>
          <rect x={24} y={24} width={744} height={672} rx={20} fill="#000" opacity={0.86} />
          <text x={396} y={330} fontSize={72} textAnchor="middle">
            💀
          </text>
          <text x={396} y={396} fontSize={26} fontWeight={800} fill="#f87171" textAnchor="middle">
            bilgisayar çöktü
          </text>
          <text x={396} y={430} fontSize={17} fill="#a1a1aa" textAnchor="middle">
            buradaki her şey gitti…
          </text>
        </g>
      )}
    </svg>
  )
}
