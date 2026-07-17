import { useEffect, useMemo, useRef, useState } from 'react'
import { CHAPTERS, CHEAT_SHEET, STEPS, stepIndexById, type StepButton } from './chapters'
import type { ModelState } from './model'
import {
  aiBreak,
  aiImprove,
  approvePR,
  branchCommits,
  commit,
  createBranch,
  createRepo,
  DEFAULT_BRANCH_NAMES,
  deleteBranch,
  goBack,
  initialModel,
  laptopDie,
  mergeBranch,
  openPR,
  push,
  restoreFromCloud,
  switchBranch,
} from './model'
import { Scene } from './Scene'
import { useZoom } from './useZoom'

type Mode = 'guided' | 'sandbox'
type Theme = 'dark' | 'light'

const THEME_KEY = 'rehber-theme'

const BTN_BASE = 'btn-interactive rounded-2xl px-6 py-3.5 text-lg font-bold active:scale-95 disabled:cursor-not-allowed disabled:opacity-30'
const BTN: Record<NonNullable<StepButton['kind']>, string> = {
  primary: `${BTN_BASE} bg-[var(--accent)] text-[var(--accent-ink)] hover:bg-[var(--accent-hover)]`,
  danger: `${BTN_BASE} bg-[var(--danger)]/90 text-[var(--danger-ink)] hover:bg-[var(--danger-hover)]`,
  ghost: `${BTN_BASE} border border-[var(--ink-dim)] text-[var(--ink)] hover:border-[var(--ink-muted)]`,
}
const ZOOM_BTN =
  'btn-interactive flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--ink-dim)] text-base font-bold text-[var(--ink)] hover:border-[var(--ink-muted)]'
const NAV_BTN = 'btn-interactive rounded-xl border border-[var(--chip-stroke)] px-3 py-1.5 text-sm font-semibold text-[var(--ink-soft)] hover:border-[var(--ink-faint)]'

function EventLine({ event }: { event: string | null }) {
  return (
    <p key={event ?? 'none'} className={`event-line min-h-6 text-base ${event ? 'text-[var(--warn)]' : 'text-transparent'}`} aria-live="polite">
      {event ?? '·'}
    </p>
  )
}

export default function App() {
  const [mode, setMode] = useState<Mode>('guided')
  const [stepIdx, setStepIdx] = useState(0)
  const [model, setModel] = useState<ModelState>(initialModel)
  const [showCmds, setShowCmds] = useState(false)
  const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem(THEME_KEY) === 'light' ? 'light' : 'dark'))
  const primaryRef = useRef<HTMLButtonElement>(null)
  const zoom = useZoom()

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem(THEME_KEY, theme)
  }, [theme])

  const step = STEPS[stepIdx]
  const isLastStep = stepIdx === STEPS.length - 1

  function pressStepButton(btn: StepButton) {
    let next = btn.apply ? btn.apply(model) : model
    if (isLastStep) {
      setModel(next)
      setMode('sandbox')
      return
    }
    const nextIdx = btn.next ? stepIndexById(btn.next) : stepIdx + 1
    const enter = STEPS[nextIdx].enter
    if (enter) next = enter(next)
    setModel(next)
    setStepIdx(nextIdx)
  }

  function restart() {
    setModel(initialModel())
    setStepIdx(0)
    setMode('guided')
  }

  function enterSandbox() {
    setMode('sandbox')
    if (!model.hasRepo) setModel(createRepo(model))
  }

  useEffect(() => {
    if (mode !== 'guided') return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'ArrowRight') {
        e.preventDefault()
        primaryRef.current?.click()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [mode])

  const sandboxButtons = useMemo(() => sandboxActions(model), [model])

  return (
    <div className="flex h-dvh flex-col bg-[var(--bg)] text-[var(--ink)]">
      <header className="flex items-center justify-between gap-4 border-b border-[var(--panel-stroke)] px-6 py-3">
        <h1 className="text-[var(--ink-strong)] text-xl font-black tracking-tight">
          GitHub <span className="text-[var(--accent-hover)]">Rehberi</span>
        </h1>
        {mode === 'guided' ? (
          <div className="flex items-center gap-3">
            <div className="flex gap-1.5" aria-label="bölümler">
              {CHAPTERS.map((title, i) => (
                <span
                  key={title}
                  className={`h-2.5 w-2.5 rounded-full ${
                    i < step.chapter ? 'bg-[var(--accent)]' : i === step.chapter ? 'bg-[var(--accent-hover)] ring-4 ring-[var(--accent-hover)]/25' : 'bg-[var(--chip-stroke)]'
                  }`}
                />
              ))}
            </div>
            <span className="text-sm font-semibold text-[var(--ink-muted)]">
              Bölüm {step.chapter + 1} · {CHAPTERS[step.chapter]}
            </span>
          </div>
        ) : (
          <span className="text-sm font-semibold text-[var(--sandbox-ink)]">🎮 Sandbox — serbest oyun</span>
        )}
        <div className="flex gap-2">
          <button
            className={`btn-interactive rounded-xl border px-3 py-1.5 text-sm font-semibold ${
              showCmds ? 'border-[var(--accent)] text-[var(--accent-soft)]' : 'border-[var(--chip-stroke)] text-[var(--ink-soft)] hover:border-[var(--ink-faint)]'
            }`}
            onClick={() => setShowCmds((v) => !v)}
            aria-pressed={showCmds}
          >
            {'</> Komutlar'}
          </button>
          <button
            className={NAV_BTN}
            onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
            aria-label="Temayı değiştir"
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
          {mode === 'guided' ? (
            <button className={NAV_BTN} onClick={enterSandbox}>
              Sandbox’a atla 🎮
            </button>
          ) : (
            <button className={NAV_BTN} onClick={restart}>
              Rehbere dön 📖
            </button>
          )}
          <button className={NAV_BTN} onClick={restart}>
            Baştan başla ↺
          </button>
        </div>
      </header>

      <main className="relative min-h-0 flex-1 px-4">
        <div
          ref={zoom.containerRef}
          className="panel-card relative h-full w-full touch-none select-none overflow-hidden rounded-3xl"
          style={{ cursor: zoom.dragging ? 'grabbing' : 'grab' }}
          {...zoom.handlers}
        >
          <div
            className={`zoom-wrapper h-full w-full ${zoom.animate ? '' : 'zoom-instant'}`}
            style={{ transform: `translate(${zoom.transform.tx}px, ${zoom.transform.ty}px) scale(${zoom.transform.scale})`, transformOrigin: '0 0' }}
          >
            <Scene state={model} labeled={mode === 'guided' && !!step.cheatSheet} />
          </div>

          <div
            className="pointer-events-auto absolute bottom-3 right-3 flex flex-col items-end gap-1.5"
            onPointerDown={(e) => e.stopPropagation()}
            onDoubleClick={(e) => e.stopPropagation()}
          >
            <div className="flex gap-1.5">
              <button className={ZOOM_BTN} onClick={zoom.zoomOut} aria-label="Uzaklaştır">
                −
              </button>
              <button className={ZOOM_BTN} onClick={zoom.zoomIn} aria-label="Yakınlaştır">
                +
              </button>
              <button className={ZOOM_BTN} onClick={zoom.reset} aria-label="Görünümü sıfırla">
                ⤢
              </button>
            </div>
            <span className="text-[11px] text-[var(--ink-faint)]">Ctrl/⌘ + scroll</span>
          </div>
        </div>
      </main>

      <footer className="px-6 pb-5 pt-2">
        {mode === 'guided' ? (
          <div className="mx-auto flex max-w-5xl flex-col items-center gap-3 text-center">
            <EventLine event={model.lastEvent} />
            <p key={step.id} className="step-text max-w-3xl text-balance text-xl font-medium leading-relaxed text-[var(--ink-strong)]">
              {step.text}
            </p>
            {step.cheatSheet && (
              <div className="panel-card grid w-full max-w-4xl grid-cols-1 gap-x-8 gap-y-1.5 rounded-2xl border border-[var(--chip-stroke)] bg-[var(--pill-bg)]/60 px-6 py-4 text-left sm:grid-cols-2">
                {CHEAT_SHEET.map(([phrase, meaning]) => (
                  <p key={phrase} className="text-base">
                    <span className="font-bold text-[var(--accent-soft)]">{phrase}</span>
                    <span className="text-[var(--ink-muted)]"> → {meaning}</span>
                  </p>
                ))}
              </div>
            )}
            <div className="flex flex-wrap justify-center gap-3">
              {step.buttons.map((btn, i) => (
                <button
                  key={btn.label}
                  ref={i === 0 ? primaryRef : undefined}
                  className={BTN[btn.kind ?? 'primary']}
                  data-cmd={btn.cmd}
                  onClick={() => pressStepButton(btn)}
                >
                  {btn.label}
                  {showCmds && btn.cmd && <span className="mt-1 block font-mono text-xs font-normal opacity-60">{btn.cmd}</span>}
                </button>
              ))}
            </div>
            <p className="text-xs text-[var(--ink-faint)]">boşluk / → tuşu da ilerletir</p>
          </div>
        ) : (
          <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 text-center">
            <EventLine event={model.lastEvent} />
            <p className="text-base text-[var(--ink-muted)]">Serbestsin: boz, kaydet, geri dön. Burada hiçbir şey kalıcı olarak bozulmaz.</p>
            <div className="flex flex-wrap justify-center gap-2.5">
              {sandboxButtons.map((b) => (
                <button
                  key={b.label}
                  className={`${BTN[b.kind ?? 'ghost']} !px-4 !py-2.5 !text-base`}
                  data-cmd={b.cmd}
                  disabled={b.disabled}
                  onClick={() => setModel(b.apply(model))}
                >
                  {b.label}
                  {showCmds && b.cmd && <span className="mt-1 block font-mono text-xs font-normal opacity-60">{b.cmd}</span>}
                </button>
              ))}
            </div>
          </div>
        )}
      </footer>
    </div>
  )
}

type SandboxButton = { label: string; apply: (s: ModelState) => ModelState; disabled?: boolean; kind?: StepButton['kind']; cmd?: string }

function sandboxActions(s: ModelState): SandboxButton[] {
  if (s.laptopDead) {
    return [{ label: '☁️ GitHub’dan geri indir (clone)', apply: restoreFromCloud, kind: 'primary', cmd: 'git clone {repo-adresi}' }]
  }
  const buttons: SandboxButton[] = [
    { label: '🤖 AI’ya geliştirt', apply: aiImprove, kind: 'primary' },
    { label: '💥 AI bozdu!', apply: aiBreak, kind: 'danger', disabled: s.workLook.broken },
    {
      label: '💾 Commit at',
      apply: (m) => commit(m, `Değişiklik ${m.counter}`),
      kind: 'primary',
      disabled: !s.dirty,
      cmd: 'git add . && git commit -m "mesaj"',
    },
    { label: '⏪ Geri dön', apply: goBack, disabled: goBack(s) === s, cmd: s.dirty ? 'git restore .' : 'git reset --hard HEAD~1' },
    { label: `☁️ Push'la (${s.currentBranch})`, apply: push, disabled: push(s) === s, cmd: `git push -u origin ${s.currentBranch}` },
  ]

  const activeNames = new Set(s.branches.map((b) => b.name))
  const nextBranchName = DEFAULT_BRANCH_NAMES.find((n) => !activeNames.has(n))
  buttons.push({
    label: '🌿 Branch aç',
    apply: (m) => createBranch(m),
    disabled: s.currentBranch !== 'main' || s.branches.length >= 3,
    cmd: nextBranchName ? `git switch -c ${nextBranchName}` : undefined,
  })

  const others = ['main', ...s.branches.map((b) => b.name)].filter((n) => n !== s.currentBranch)
  for (const name of others) {
    buttons.push({ label: `🔀 geç: ${name}`, apply: (m) => switchBranch(m, name), cmd: `git switch ${name}` })
  }

  if (s.currentBranch !== 'main') {
    const name = s.currentBranch
    const own = branchCommits(s, name)
    const prOpenForThis = s.pr?.status === 'open' && s.pr.from === name
    const allPushed = own.length > 0 && own.every((c) => s.pushedIds.includes(c.id))
    buttons.push({
      label: `✅ Merge et (${name} → main)`,
      apply: mergeBranch,
      disabled: !own.length || prOpenForThis,
      kind: 'primary',
      cmd: `git switch main && git merge ${name}`,
    })
    buttons.push({ label: `🗑️ Sil: ${name}`, apply: deleteBranch, kind: 'danger', cmd: `git switch main && git branch -D ${name}` })
    if (!s.pr || s.pr.status === 'merged') {
      buttons.push({ label: '⇄ PR aç', apply: openPR, disabled: !allPushed, cmd: 'gh pr create' })
    }
    if (s.pr?.status === 'open') {
      buttons.push({ label: `👀 PR'ı onayla (${s.pr.from})`, apply: approvePR, kind: 'primary', cmd: 'GitHub arayüzünde: Review → Approve' })
    }
  }

  buttons.push({ label: '💀 Bilgisayarı çökert', apply: laptopDie, kind: 'danger' })
  buttons.push({ label: '↺ Sıfırla', apply: () => createRepo(initialModel()) })
  return buttons
}
