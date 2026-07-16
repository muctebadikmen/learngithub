import { useEffect, useMemo, useRef, useState } from 'react'
import { CHAPTERS, CHEAT_SHEET, STEPS, stepIndexById, type StepButton } from './chapters'
import type { ModelState } from './model'
import {
  aiBreak,
  aiImprove,
  approvePR,
  commit,
  createBranch,
  createRepo,
  currentBranchCommits,
  deleteBranch,
  goBack,
  initialModel,
  laptopDie,
  mergeBranch,
  openPR,
  push,
  restoreFromCloud,
  switchLane,
} from './model'
import { Scene } from './Scene'

type Mode = 'guided' | 'sandbox'

const BTN_BASE = 'rounded-2xl px-6 py-3.5 text-lg font-bold transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-30'
const BTN: Record<NonNullable<StepButton['kind']>, string> = {
  primary: `${BTN_BASE} bg-emerald-500 text-emerald-950 hover:bg-emerald-400`,
  danger: `${BTN_BASE} bg-red-500/90 text-red-50 hover:bg-red-400`,
  ghost: `${BTN_BASE} border border-zinc-600 text-zinc-200 hover:border-zinc-400`,
}

function EventLine({ event }: { event: string | null }) {
  return (
    <p key={event ?? 'none'} className={`event-line min-h-6 text-base ${event ? 'text-amber-300' : 'text-transparent'}`} aria-live="polite">
      {event ?? '·'}
    </p>
  )
}

export default function App() {
  const [mode, setMode] = useState<Mode>('guided')
  const [stepIdx, setStepIdx] = useState(0)
  const [model, setModel] = useState<ModelState>(initialModel)
  const primaryRef = useRef<HTMLButtonElement>(null)

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
    <div className="flex h-dvh flex-col bg-[#0b0f1a] text-zinc-100">
      <header className="flex items-center justify-between gap-4 px-6 py-3">
        <h1 className="text-xl font-black tracking-tight">
          GitHub <span className="text-emerald-400">Rehberi</span>
        </h1>
        {mode === 'guided' ? (
          <div className="flex items-center gap-3">
            <div className="flex gap-1.5" aria-label="bölümler">
              {CHAPTERS.map((title, i) => (
                <span
                  key={title}
                  className={`h-2.5 w-2.5 rounded-full ${i < step.chapter ? 'bg-emerald-500' : i === step.chapter ? 'bg-emerald-400 ring-4 ring-emerald-400/25' : 'bg-zinc-700'}`}
                />
              ))}
            </div>
            <span className="text-sm font-semibold text-zinc-400">
              Bölüm {step.chapter + 1} · {CHAPTERS[step.chapter]}
            </span>
          </div>
        ) : (
          <span className="text-sm font-semibold text-violet-300">🎮 Sandbox — serbest oyun</span>
        )}
        <div className="flex gap-2">
          {mode === 'guided' ? (
            <button className="rounded-xl border border-zinc-700 px-3 py-1.5 text-sm font-semibold text-zinc-300 hover:border-zinc-500" onClick={enterSandbox}>
              Sandbox’a atla 🎮
            </button>
          ) : (
            <button className="rounded-xl border border-zinc-700 px-3 py-1.5 text-sm font-semibold text-zinc-300 hover:border-zinc-500" onClick={restart}>
              Rehbere dön 📖
            </button>
          )}
          <button className="rounded-xl border border-zinc-700 px-3 py-1.5 text-sm font-semibold text-zinc-300 hover:border-zinc-500" onClick={restart}>
            Baştan başla ↺
          </button>
        </div>
      </header>

      <main className="min-h-0 flex-1 px-4">
        <Scene state={model} labeled={mode === 'guided' && !!step.cheatSheet} />
      </main>

      <footer className="px-6 pb-5 pt-2">
        {mode === 'guided' ? (
          <div className="mx-auto flex max-w-5xl flex-col items-center gap-3 text-center">
            <EventLine event={model.lastEvent} />
            <p key={step.id} className="step-text max-w-3xl text-balance text-xl font-medium leading-relaxed text-zinc-100">
              {step.text}
            </p>
            {step.cheatSheet && (
              <div className="grid w-full max-w-4xl grid-cols-1 gap-x-8 gap-y-1.5 rounded-2xl border border-zinc-700 bg-zinc-900/60 px-6 py-4 text-left sm:grid-cols-2">
                {CHEAT_SHEET.map(([phrase, meaning]) => (
                  <p key={phrase} className="text-base">
                    <span className="font-bold text-emerald-300">{phrase}</span>
                    <span className="text-zinc-400"> → {meaning}</span>
                  </p>
                ))}
              </div>
            )}
            <div className="flex flex-wrap justify-center gap-3">
              {step.buttons.map((btn, i) => (
                <button key={btn.label} ref={i === 0 ? primaryRef : undefined} className={BTN[btn.kind ?? 'primary']} onClick={() => pressStepButton(btn)}>
                  {btn.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-zinc-500">boşluk / → tuşu da ilerletir</p>
          </div>
        ) : (
          <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 text-center">
            <EventLine event={model.lastEvent} />
            <p className="text-base text-zinc-400">Serbestsin: boz, kaydet, geri dön. Burada hiçbir şey kalıcı olarak bozulmaz.</p>
            <div className="flex flex-wrap justify-center gap-2.5">
              {sandboxButtons.map((b) => (
                <button
                  key={b.label}
                  className={`${BTN[b.kind ?? 'ghost']} !px-4 !py-2.5 !text-base`}
                  disabled={b.disabled}
                  onClick={() => setModel(b.apply(model))}
                >
                  {b.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </footer>
    </div>
  )
}

type SandboxButton = { label: string; apply: (s: ModelState) => ModelState; disabled?: boolean; kind?: StepButton['kind'] }

function sandboxActions(s: ModelState): SandboxButton[] {
  if (s.laptopDead) {
    return [{ label: '☁️ GitHub’dan geri indir (clone)', apply: restoreFromCloud, kind: 'primary' }]
  }
  const branchTipExists = currentBranchCommits(s).length > 0
  const buttons: SandboxButton[] = [
    { label: '🤖 AI’ya geliştirt', apply: aiImprove, kind: 'primary' },
    { label: '💥 AI bozdu!', apply: aiBreak, kind: 'danger', disabled: s.workLook.broken },
    { label: '💾 Commit at', apply: (m) => commit(m, `Değişiklik ${m.counter}`), kind: 'primary', disabled: !s.dirty },
    { label: '⏪ Geri dön', apply: goBack, disabled: goBack(s) === s },
    { label: '☁️ Push’la', apply: push, disabled: s.commits.every((c) => s.pushedIds.includes(c.id)) },
  ]
  if (!s.branchName) {
    buttons.push({ label: '🌿 Branch aç', apply: (m) => createBranch(m), disabled: s.currentLane !== 'main' })
  } else {
    buttons.push({ label: `🔀 ${s.currentLane === 'main' ? `${s.branchName}’e geç` : 'main’e geç'}`, apply: switchLane })
    if (!s.pr) buttons.push({ label: '⇄ PR aç', apply: openPR, disabled: !branchTipExists })
    if (s.pr?.status === 'open') buttons.push({ label: '👀 PR’ı onayla', apply: approvePR, kind: 'primary' })
    buttons.push({ label: '✅ Merge et', apply: mergeBranch, disabled: !branchTipExists || s.pr?.status === 'open' })
    buttons.push({ label: '🗑️ Branch’i sil', apply: deleteBranch, kind: 'danger' })
  }
  buttons.push({ label: '💀 Bilgisayarı çökert', apply: laptopDie, kind: 'danger' })
  buttons.push({ label: '↺ Sıfırla', apply: () => createRepo(initialModel()) })
  return buttons
}
