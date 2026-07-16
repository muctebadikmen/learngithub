import type { ModelState } from './model'
import {
  aiBreak,
  aiImprove,
  aiRedesign,
  approvePR,
  commit,
  createBranch,
  createRepo,
  deleteBranch,
  goBack,
  laptopDie,
  mergeBranch,
  openPR,
  push,
  restoreFromCloud,
} from './model'

export type StepButton = {
  label: string
  kind?: 'primary' | 'danger' | 'ghost'
  apply?: (s: ModelState) => ModelState
  next?: string // step id; default: the following step
}

export type Step = {
  id: string
  chapter: number // index into CHAPTERS
  text: string
  enter?: (s: ModelState) => ModelState // applied when the step is shown
  buttons: StepButton[]
  cheatSheet?: boolean
}

export const CHAPTERS = [
  'Repo nedir?',
  'Commit (kayıt noktası)',
  'Geri dönmek',
  'Push (buluta yedek)',
  'Branch (deneme hattı)',
  'Pull Request',
  'Özet',
] as const

const pipe =
  (...fns: ((s: ModelState) => ModelState)[]) =>
  (s: ModelState) =>
    fns.reduce((acc, f) => f(acc), s)

export const STEPS: Step[] = [
  // 1 — Repo
  {
    id: 'repo-intro',
    chapter: 0,
    text: 'Bu, AI ile yaptığın uygulama. Şu an hiçbir güvencesi yok: geçmişi yok, yedeği yok. Önce ona bir repo lazım.',
    buttons: [{ label: 'Repo oluştur', apply: createRepo }],
  },
  {
    id: 'repo-done',
    chapter: 0,
    text: 'Artık bir repo’n var: projen + tüm geçmişi, tek kutuda. İlk kayıt noktası da hazır.',
    buttons: [{ label: 'Devam →' }],
  },

  // 2 — Commit
  {
    id: 'commit-1',
    chapter: 1,
    text: 'AI’ya yeni bir özellik yaptırdın. Bu hâli kaybetmemek için bir kayıt noktası bırak.',
    enter: aiImprove,
    buttons: [{ label: 'Commit at (kaydet)', apply: (s) => commit(s, 'Özellik 1') }],
  },
  {
    id: 'commit-2',
    chapter: 1,
    text: 'Bir özellik daha geldi. Yine kaydet. Alışkanlık hâline getir: her çalışan hâl, bir commit.',
    enter: aiImprove,
    buttons: [{ label: 'Commit at (kaydet)', apply: (s) => commit(s, 'Özellik 2') }],
  },
  {
    id: 'commit-done',
    chapter: 1,
    text: 'Her commit bir save point. Oyunlardaki gibi: istediğin an herhangi birine geri dönebilirsin.',
    buttons: [{ label: 'Devam →' }],
  },

  // 3 — Geri dönmek
  {
    id: 'undo-break',
    chapter: 2,
    text: 'AI’ya “şu butonu güzelleştir” dedin. Ve… uygulamayı bozdu.',
    buttons: [{ label: 'Eyvah 😱', apply: aiBreak }],
  },
  {
    id: 'undo-discard',
    chapter: 2,
    text: 'Panik yok: bozuk hâli henüz kaydetmedin. Son kayıt noktan tertemiz duruyor. Geri dön, yeter.',
    buttons: [{ label: 'Geri dön', apply: goBack }],
  },
  {
    id: 'undo-committed',
    chapter: 2,
    text: 'Bir de sinsisi var: bozuk bir değişikliği fark etmeden kaydettin.',
    buttons: [{ label: 'Olamaz…', apply: pipe(aiBreak, (s) => commit(s, 'Bozuk değişiklik')) }],
  },
  {
    id: 'undo-goback',
    chapter: 2,
    text: 'Yine panik yok. Commit’ler zaman makinesi: bir önceki kayıt noktasına dön.',
    buttons: [{ label: 'Önceki commit’e dön', apply: goBack }],
  },
  {
    id: 'undo-done',
    chapter: 2,
    text: 'Gördün mü? Commit attığın sürece hiçbir hata kalıcı değil.',
    buttons: [{ label: 'Devam →' }],
  },

  // 4 — Push
  {
    id: 'push-intro',
    chapter: 3,
    text: 'Her şey şu an sadece senin bilgisayarında. Bilgisayara bir şey olursa, hepsi gider.',
    buttons: [{ label: 'Push’la (GitHub’a yedekle)', apply: push }],
  },
  {
    id: 'push-die',
    chapter: 3,
    text: 'Commit’lerin artık GitHub’da da var. Şimdi en kötü senaryoyu deneyelim:',
    buttons: [{ label: 'Bilgisayar çöktü 💀', kind: 'danger', apply: laptopDie }],
  },
  {
    id: 'push-restore',
    chapter: 3,
    text: 'Yerel kopya gitti. Ama proje ölmedi: GitHub’daki kopyası duruyor.',
    buttons: [{ label: 'GitHub’dan geri indir (clone)', apply: restoreFromCloud }],
  },
  {
    id: 'push-done',
    chapter: 3,
    text: 'Push’ladığın sürece projen ölümsüz.',
    buttons: [{ label: 'Devam →' }],
  },

  // 5 — Branch
  {
    id: 'branch-create',
    chapter: 4,
    text: 'Riskli bir fikir var: tasarımı komple değiştirmek. Çalışan uygulamayı bozmadan denemek için bir branch aç.',
    buttons: [{ label: 'Branch aç (deneme hattı)', apply: (s) => createBranch(s) }],
  },
  {
    id: 'branch-work',
    chapter: 4,
    text: 'AI artık “deneme” hattında çalışıyor. Main’e hiç dokunmuyor.',
    enter: aiRedesign,
    buttons: [{ label: 'Commit at (kaydet)', apply: (s) => commit(s, 'Yeni tasarım') }],
  },
  {
    id: 'branch-choice',
    chapter: 4,
    text: 'Karar anı. Yeni tasarım…',
    buttons: [
      { label: 'Beğendim → merge et', apply: mergeBranch, next: 'branch-merged' },
      { label: 'Olmadı → branch’i sil', kind: 'danger', apply: deleteBranch, next: 'branch-deleted' },
    ],
  },
  {
    id: 'branch-merged',
    chapter: 4,
    text: 'Merge tamam: deneme, main’in parçası oldu. Ve main bu iş boyunca hiç risk görmedi.',
    buttons: [{ label: 'Devam →', next: 'pr-prepare' }],
  },
  {
    id: 'branch-deleted',
    chapter: 4,
    text: 'Branch gitti, main’e hiçbir şey olmadı. Denemenin bedeli: sıfır.',
    buttons: [{ label: 'Devam →', next: 'pr-prepare' }],
  },

  // 6 — Pull Request
  {
    id: 'pr-prepare',
    chapter: 5,
    text: 'Gerçek dünyada bir branch main’e katılmadan önce Pull Request açılır: “Şunları değiştirdim, bakar mısın?”',
    buttons: [
      {
        label: 'Yeni branch’te bir özellik hazırla',
        apply: pipe((s) => createBranch(s, 'ozellik'), aiImprove, (s) => commit(s, 'Yeni özellik'), push),
      },
    ],
  },
  {
    id: 'pr-open',
    chapter: 5,
    text: 'Branch GitHub’da. Şimdi Pull Request’i aç.',
    buttons: [{ label: 'Pull Request aç', apply: openPR }],
  },
  {
    id: 'pr-approve',
    chapter: 5,
    text: 'Ekip arkadaşın (ya da sen) değişikliklere bakar ve onaylar.',
    buttons: [{ label: 'Onayla ✓', apply: approvePR }],
  },
  {
    id: 'pr-merge',
    chapter: 5,
    text: 'Onay geldi. Merge et — özellik main’e katılsın.',
    buttons: [{ label: 'Merge et', apply: pipe(mergeBranch, push) }],
  },
  {
    id: 'pr-done',
    chapter: 5,
    text: 'Dünyadaki neredeyse tüm yazılım böyle yapılır: branch → pull request → inceleme → merge.',
    buttons: [{ label: 'Devam →' }],
  },

  // 7 — Özet
  {
    id: 'summary',
    chapter: 6,
    text: 'Hepsi bu. Artık AI aracına ne diyeceğini biliyorsun:',
    cheatSheet: true,
    buttons: [{ label: 'Sandbox’ta oyna 🎮' }],
  },
]

export const CHEAT_SHEET = [
  ['“Değişiklikleri commit’le”', 'çalışan hâli kaydet'],
  ['“GitHub’a push’la”', 'buluta yedekle'],
  ['“Son çalışan commit’e geri dön”', 'hatayı geri al'],
  ['“Yeni bir branch aç”', 'güvenli deneme alanı'],
  ['“Branch’i main’e merge’le”', 'denemeyi kalıcı yap'],
  ['“Pull request aç”', 'değişikliği incelemeye sun'],
] as const

export function stepIndexById(id: string): number {
  const i = STEPS.findIndex((s) => s.id === id)
  return i === -1 ? 0 : i
}
