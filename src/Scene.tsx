import type { Commit, ModelState } from './model'
import { abandonedIds, currentBranchCommits, headCommit } from './model'

// One persistent scene: computer (left) + GitHub (right), drawn from ModelState.
// Node positions/opacity animate via CSS transitions in index.css (.scene-node).

const THEMES = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#06b6d4']
const BLOCK_WIDTHS = [204, 156, 224, 132, 180]

const LANE_Y = { main: 572, branch: 464 } as const
const MAIN_COLOR = '#34d399'
const BRANCH_COLOR = '#c4b5fd'

function AppCard({ state }: { state: ModelState }) {
  const look = state.workLook
  const theme = THEMES[look.theme % THEMES.length]
  const w = 300
  const h = 248
  const x = 246
  const y = 108
  return (
    <g className={look.broken ? 'app-card app-broken' : 'app-card'}>
      <rect x={x} y={y} width={w} height={h} rx={16} fill="#111827" stroke={look.broken ? '#ef4444' : '#374151'} strokeWidth={look.broken ? 3 : 1.5} />
      <rect x={x} y={y} width={w} height={40} rx={16} fill={look.broken ? '#7f1d1d' : theme} />
      <rect x={x} y={y + 24} width={w} height={16} fill={look.broken ? '#7f1d1d' : theme} />
      <text x={x + 16} y={y + 26} fontSize={16} fontWeight={700} fill="#fff">
        Uygulamam
      </text>
      {Array.from({ length: look.blocks }).map((_, i) => (
        <rect
          key={i}
          x={x + 20 + (look.broken && i % 2 ? 26 : 0)}
          y={y + 56 + i * 38}
          width={BLOCK_WIDTHS[i % BLOCK_WIDTHS.length]}
          height={26}
          rx={7}
          fill={look.broken ? '#ef4444' : theme}
          opacity={look.broken ? 0.55 : 0.35 + 0.12 * ((i + 1) % 3)}
          transform={look.broken && i % 2 ? `rotate(-3 ${x + 130} ${y + 70 + i * 38})` : undefined}
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

type Slot = { px: (x: number) => number; r: number; laneY: (lane: 'main' | 'branch') => number }

function timelineSlots(commits: Commit[], startX: number, endX: number, r: number, yOffset = 0): Slot {
  const maxX = commits.length ? Math.max(...commits.map((c) => c.x)) : 0
  const gap = maxX > 0 ? Math.min(92, (endX - startX) / maxX) : 0
  return {
    px: (x: number) => startX + x * gap,
    r,
    laneY: (lane) => LANE_Y[lane] + yOffset,
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

  // Branch just opened, no commits on it yet: show the fork as a ghost lane.
  const fork = !pushedOnly && state.branchFromId ? byId.get(state.branchFromId) : undefined
  const ghostFork = fork && currentBranchCommits(state).length === 0 ? fork : undefined

  return (
    <g>
      {ghostFork && (
        <g className="scene-node">
          <line
            x1={slot.px(ghostFork.x)}
            y1={slot.laneY('main')}
            x2={slot.px(ghostFork.x) + 56}
            y2={slot.laneY('branch')}
            stroke={BRANCH_COLOR}
            strokeWidth={3}
            strokeDasharray="7 7"
            opacity={0.7}
          />
          <circle cx={slot.px(ghostFork.x) + 56} cy={slot.laneY('branch')} r={slot.r - 4} fill="none" stroke={BRANCH_COLOR} strokeWidth={2.5} strokeDasharray="6 6" />
        </g>
      )}
      {edges.map(({ from, to }) => (
        <line
          key={`${suffix}-${from.id}-${to.id}`}
          x1={slot.px(from.x)}
          y1={slot.laneY(from.lane)}
          x2={slot.px(to.x)}
          y2={slot.laneY(to.lane)}
          stroke={to.lane === 'branch' || from.lane === 'branch' ? BRANCH_COLOR : '#3f3f46'}
          strokeWidth={3}
          opacity={abandoned.has(to.id) && !pushedOnly ? 0.25 : 0.8}
        />
      ))}
      {commits.map((c) => {
        const cx = slot.px(c.x)
        const cy = slot.laneY(c.lane)
        const dim = !pushedOnly && abandoned.has(c.id)
        const fill = c.look.broken ? '#ef4444' : c.lane === 'main' ? MAIN_COLOR : BRANCH_COLOR
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
        <g className="scene-node" style={{ transform: `translate(${slot.px(head.x)}px, ${slot.laneY(head.lane)}px)` }}>
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

function LanePills({ state, slot, cloud }: { state: ModelState; slot: Slot; cloud?: boolean }) {
  const commits = cloud ? state.commits.filter((c) => state.pushedIds.includes(c.id)) : state.commits
  if (!commits.some((c) => c.lane === 'main')) return null
  const shown = new Set(commits.map((c) => c.id))
  const branchFirst = currentBranchCommits(state).find((c) => shown.has(c.id))
  const fork = state.branchFromId && !cloud ? commits.find((c) => c.id === state.branchFromId) : undefined
  const branchPillX = branchFirst ? slot.px(branchFirst.x) - 10 : fork ? slot.px(fork.x) + 46 : null
  const pill = (x: number, y: number, label: string, color: string, active: boolean) => (
    <g className="scene-node" style={{ transform: `translate(${x}px, ${y}px)` }}>
      <rect x={-8} y={-13} width={label.length * 9 + 24} height={26} rx={13} fill="#18181b" stroke={color} strokeWidth={active ? 2.5 : 1} />
      <text x={label.length * 4.5 + 4} y={5} fontSize={14} fontWeight={700} fill={color} textAnchor="middle">
        {label}
      </text>
    </g>
  )
  return (
    <g>
      {pill(slot.px(0) - (cloud ? 4 : 22), slot.laneY('main') - (slot.r + 22), 'main', MAIN_COLOR, !cloud && state.currentLane === 'main')}
      {state.branchName &&
        branchPillX !== null &&
        pill(branchPillX, slot.laneY('branch') - (slot.r + 34), state.branchName, BRANCH_COLOR, !cloud && state.currentLane === 'branch')}
    </g>
  )
}

function GitHubSide({ state, labeled }: { state: ModelState; labeled: boolean }) {
  const pushed = state.commits.filter((c) => state.pushedIds.includes(c.id))
  const slot = timelineSlots(pushed, 852, 1206, 12, 20)
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
          <LanePills state={state} slot={slot} cloud />
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
  const slot = timelineSlots(state.commits, 116, 700, 18)
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
      <LanePills state={state} slot={slot} />
      <GitHubSide state={state} labeled={labeled} />
      {labeled && state.commits.length > 0 && (
        <g fontSize={15} fill="#fbbf24">
          <text x={396} y={664} textAnchor="middle">
            her nokta bir commit = kayıt noktası
          </text>
          {state.commits.some((c) => c.lane === 'branch') && (
            <text x={396} y={LANE_Y.branch - 56} textAnchor="middle">
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
