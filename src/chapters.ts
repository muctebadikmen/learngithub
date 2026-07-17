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
  pull,
  push,
  resolveConflict,
  restoreFromCloud,
  switchBranch,
  teammatePush,
} from './model'

export type StepButton = {
  label: string
  kind?: 'primary' | 'danger' | 'ghost'
  apply?: (s: ModelState) => ModelState
  next?: string // step id; default: the following step
  cmd?: string // real git command this action represents; omit when there isn't one
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
  'Branch’tan branch',
  'Takım & pull',
  'Çakışma & çözüm',
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
    buttons: [{ label: 'Repo oluştur', apply: createRepo, cmd: 'git init' }],
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
    buttons: [{ label: 'Commit at (kaydet)', apply: (s) => commit(s, 'Özellik 1'), cmd: 'git add . && git commit -m "mesaj"' }],
  },
  {
    id: 'commit-2',
    chapter: 1,
    text: 'Bir özellik daha geldi. Yine kaydet. Alışkanlık hâline getir: her çalışan hâl, bir commit.',
    enter: aiImprove,
    buttons: [{ label: 'Commit at (kaydet)', apply: (s) => commit(s, 'Özellik 2'), cmd: 'git add . && git commit -m "mesaj"' }],
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
    buttons: [{ label: 'Geri dön', apply: goBack, cmd: 'git restore .' }],
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
    buttons: [{ label: 'Önceki commit’e dön', apply: goBack, cmd: 'git reset --hard HEAD~1' }],
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
    buttons: [{ label: 'Push’la (GitHub’a yedekle)', apply: push, cmd: 'git push -u origin main' }],
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
    buttons: [{ label: 'GitHub’dan geri indir (clone)', apply: restoreFromCloud, cmd: 'git clone {repo-adresi}' }],
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
    buttons: [{ label: 'Branch aç (deneme hattı)', apply: (s) => createBranch(s), cmd: 'git switch -c deneme' }],
  },
  {
    id: 'branch-work',
    chapter: 4,
    text: 'AI artık “deneme” hattında çalışıyor. Main’e hiç dokunmuyor.',
    enter: aiRedesign,
    buttons: [{ label: 'Commit at (kaydet)', apply: (s) => commit(s, 'Yeni tasarım'), cmd: 'git add . && git commit -m "mesaj"' }],
  },
  {
    id: 'branch-choice',
    chapter: 4,
    text: 'Karar anı. Yeni tasarım…',
    buttons: [
      { label: 'Beğendim → merge et', apply: mergeBranch, next: 'branch-merged', cmd: 'git switch main && git merge deneme' },
      { label: 'Olmadı → branch’i sil', kind: 'danger', apply: deleteBranch, next: 'branch-deleted', cmd: 'git switch main && git branch -D deneme' },
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
        cmd: 'git switch -c ozellik',
      },
    ],
  },
  {
    id: 'pr-open',
    chapter: 5,
    text: 'Branch GitHub’da. Şimdi Pull Request’i aç.',
    buttons: [{ label: 'Pull Request aç', apply: openPR, cmd: 'gh pr create' }],
  },
  {
    id: 'pr-approve',
    chapter: 5,
    text: 'Ekip arkadaşın (ya da sen) değişikliklere bakar ve onaylar.',
    buttons: [{ label: 'Onayla ✓', apply: approvePR, cmd: 'GitHub arayüzünde: Review → Approve' }],
  },
  {
    id: 'pr-merge',
    chapter: 5,
    text: 'Onay geldi. Merge et — özellik main’e katılsın.',
    buttons: [{ label: 'Merge et', apply: pipe(mergeBranch, push), cmd: 'git switch main && git merge ozellik && git push' }],
  },
  {
    id: 'pr-done',
    chapter: 5,
    text: 'Dünyadaki neredeyse tüm yazılım böyle yapılır: branch → pull request → inceleme → merge.',
    buttons: [{ label: 'Devam →' }],
  },

  // 7 — Branch’tan branch
  {
    id: 'nested-branch-1',
    chapter: 6,
    text: 'Branch’ler iç içe olabilir: bir branch açıp, onun içinde daha küçük bir branch daha açabilirsin.',
    buttons: [{ label: 'Branch aç (altyapi)', apply: (s) => createBranch(s, 'altyapi'), cmd: 'git switch -c altyapi' }],
  },
  {
    id: 'nested-branch-2',
    chapter: 6,
    text: 'Şimdi “altyapi”nın içindesin. Buradan bir alt-branch daha aç.',
    buttons: [{ label: 'Alt-branch aç (deney)', apply: (s) => createBranch(s, 'deney'), cmd: 'git switch -c deney' }],
  },
  {
    id: 'nested-branch-work',
    chapter: 6,
    text: '“deney” hattında çalış ve kaydet.',
    enter: aiImprove,
    buttons: [{ label: 'Commit at (kaydet)', apply: (s) => commit(s, 'Deney işi'), cmd: 'git add . && git commit -m "mesaj"' }],
  },
  {
    id: 'nested-branch-merge-child',
    chapter: 6,
    text: '“deney” bitti. Onu main’e değil, ait olduğu yere — “altyapi”ya — birleştirirsin.',
    buttons: [{ label: 'Merge et (deney → altyapi)', apply: mergeBranch, cmd: 'git switch altyapi && git merge deney' }],
  },
  {
    id: 'nested-branch-merge-parent',
    chapter: 6,
    text: 'Sonra “altyapi”yı da main’e birleştirirsin. Branch’ler böyle katman katman büyür.',
    buttons: [{ label: 'Merge et (altyapi → main)', apply: mergeBranch, cmd: 'git switch main && git merge altyapi' }],
  },

  // 8 — Takım & pull
  {
    id: 'team-push',
    chapter: 7,
    text: 'Bir projede genelde yalnız değilsin. Başka biri de aynı main’e push’layabilir.',
    enter: push,
    buttons: [{ label: '👥 Takım arkadaşı push’lasın', apply: teammatePush, cmd: 'git fetch' }],
  },
  {
    id: 'team-behind',
    chapter: 7,
    text: 'Artık GitHub’daki main senden ileride — senin kopyan geride kaldı.',
    buttons: [{ label: 'Pull’la (çek)', apply: pull, cmd: 'git pull' }],
  },
  {
    id: 'team-synced',
    chapter: 7,
    text: 'Pull ile arkadaşının işini kendine çektin; yine aynı noktadasınız. Ekip böyle çalışır.',
    buttons: [{ label: 'Devam →' }],
  },

  // 9 — Çakışma & çözüm
  {
    id: 'conflict-branch',
    chapter: 8,
    text: 'Bazen ikiniz de aynı yeri değiştirirsiniz. Kuralım: sen bir branch’te tasarımı değiştir.',
    buttons: [
      {
        label: 'Branch aç ve tasarımı değiştir',
        apply: pipe((s) => createBranch(s, 'tasarim'), aiRedesign, (s) => commit(s, 'Senin tasarımın')),
        cmd: 'git switch -c tasarim',
      },
    ],
  },
  {
    id: 'conflict-main-change',
    chapter: 8,
    text: 'Aynı sırada main’de de tasarım değişti — ama farklı şekilde.',
    buttons: [
      {
        label: 'Main’de de tasarım değişsin',
        apply: pipe((s) => switchBranch(s, 'main'), aiRedesign, aiRedesign, (s) => commit(s, 'Main tasarımı'), (s) => switchBranch(s, 'tasarim')),
      },
    ],
  },
  {
    id: 'conflict-attempt',
    chapter: 8,
    text: 'Şimdi “tasarim”ı main’e birleştirmeyi dene.',
    buttons: [{ label: 'Merge et (tasarim → main)', apply: mergeBranch, cmd: 'git switch main && git merge tasarim' }],
  },
  {
    id: 'conflict-choice',
    chapter: 8,
    text: 'Çakışma! İkiniz de tasarımı değiştirdiğiniz için Git hangisini tutacağını bilemiyor. Karar senin.',
    buttons: [
      { label: '🅐 "tasarim" hâlini tut', apply: (s) => resolveConflict(s, 'theirs'), cmd: 'git checkout --theirs . && git add .' },
      { label: '🅑 "main" hâlini tut', apply: (s) => resolveConflict(s, 'ours'), cmd: 'git checkout --ours . && git add .' },
      { label: '🔀 İkisini birleştir', apply: (s) => resolveConflict(s, 'both'), cmd: '# elle düzenle, sonra git add .' },
    ],
  },
  {
    id: 'conflict-done',
    chapter: 8,
    text: 'Çakışma korkutucu değil — sadece hangi hâli tutacağına karar verirsin, gerisini Git halleder.',
    buttons: [{ label: 'Devam →' }],
  },

  // 10 — Özet
  {
    id: 'summary',
    chapter: 9,
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
  ['“Branch’ten branch aç”', 'denemenin içinde deneme'],
  ['“Pull’la / çek”', 'ekibin son işini kendine al'],
  ['“Çakışmayı çöz”', 'hangi hâli tutacağına karar ver'],
] as const

export function stepIndexById(id: string): number {
  const i = STEPS.findIndex((s) => s.id === id)
  return i === -1 ? 0 : i
}
