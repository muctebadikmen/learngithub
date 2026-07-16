export type Locale = 'en' | 'tr';
export const LOCALES: Locale[] = ['en', 'tr'];

export const en = {
  // chrome
  'app.title': 'git, visually',
  'app.subtitle': 'learn git by doing — watch the graph',
  'mode.levels': 'levels',
  'mode.sandbox': 'sandbox',
  'action.restartLevel': 'restart level',
  'action.resetRepo': 'reset repo',
  'lang.en': 'EN',
  'lang.tr': 'TR',

  // graph
  'graph.noCommits': 'no commits yet',
  'graph.aria': 'commit graph',
  'graph.commitAria': 'commit {message}',

  // working directory
  'panel.workingDir': 'Working directory',
  'workingDir.empty': 'empty',
  'status.untracked': 'untracked',
  'status.modified': 'modified',
  'status.staged': 'staged',
  'status.clean': 'clean',
  'status.deleted': 'deleted',
  'action.stage': 'stage →',
  'action.stage.title': 'stage (git add)',
  'action.addFile': '+ file',
  'placeholder.newFile': 'new-file.txt',
  'action.save': 'save',
  'action.cancel': 'cancel',
  'action.edit': 'edit',

  // staging
  'panel.staging': 'Staging area',
  'staging.empty': 'nothing staged',
  'staged.added': 'added',
  'staged.modified': 'modified',
  'action.unstage': '← unstage',
  'action.unstage.title': 'unstage (git restore --staged)',

  // commit bar
  'panel.commit': 'Commit',
  'placeholder.commitMessage': 'commit message',
  'action.commit': 'commit',
  'action.amend': 'amend',
  'action.amend.title': 'replace the last commit (git commit --amend)',

  // branches
  'panel.branches': 'Branches',
  'refbar.on': 'on',
  'refbar.detachedHead': 'detached HEAD',
  'placeholder.newBranch': 'new-branch',
  'action.branch': 'branch',
  'action.branch.title': 'create a branch here (git branch)',
  'action.branchSwitch': 'branch + switch',
  'action.branchSwitch.title': 'create and switch (git switch -c)',
  'action.switchTo.title': 'switch to {name}',

  // history tools
  'panel.historyTools': 'History tools',
  'ht.moveBranch': 'move branch {name} to',
  'ht.moveHead': 'move HEAD to',
  'ht.soft': 'soft',
  'ht.soft.title': 'keep index + working tree',
  'ht.mixed': 'mixed',
  'ht.mixed.title': 'reset index, keep working tree',
  'ht.hard': 'hard',
  'ht.hard.title': 'discard index + working tree',
  'ht.detachHint': 'visit a commit with no branch',
  'ht.checkoutDetached': 'checkout {oid} (detached)',
  'ht.checkoutDetached.title': 'git checkout <commit> — detached HEAD',
  'ht.discard': 'discard uncommitted changes ({n})',
  'action.restore': 'restore',
  'action.restore.title': 'git restore <files>',

  // commit inspector
  'inspector.select': 'select a commit in the graph',
  'inspector.root': 'root',
  'inspector.parent': '{n} parent',
  'inspector.parents': '{n} parents',

  // notices (engine reasonKeys)
  'reason.already-a-repo': 'This is already a repository.',
  'reason.amend-identical': 'Nothing changed — the amended commit would be identical.',
  'reason.branch-exists': 'A branch named "{name}" already exists.',
  'reason.detach-requires-flag': '"{ref}" is a commit, not a branch.',
  'reason.no-commits-yet': 'Make your first commit before doing that.',
  'reason.not-a-repo': 'This folder is not a repository yet.',
  'reason.nothing-to-commit': 'Nothing is staged to commit.',
  'reason.path-is-ignored': '"{path}" is ignored.',
  'reason.pathspec-no-match': 'There is no tracked file "{path}".',
  'reason.switch-dirty': 'You have uncommitted changes — commit or discard them first.',
  'reason.unknown-ref': 'There is no branch or commit named "{ref}".',
  'notice.dismiss': 'dismiss',

  // live region (spoken)
  'spoken.commit': 'Created commit {oid}.',
  'spoken.onBranch': 'Now on branch {name}.',
  'spoken.detached': 'HEAD detached at {oid}.',
  'spoken.refMoved': 'Branch {ref} moved.',
  'spoken.snapshotLost': 'Warning: a staged snapshot was replaced.',
  'spoken.staged': 'Staging area updated.',
  'spoken.worktree': 'Working files updated.',
  'spoken.fileSaved': 'File saved.',

  // level panel
  'level.progress': 'Level {n} / {total}',
  'level.restart': 'restart',
  'level.restart.title': 'restart this level',
  'level.complete': 'Level complete! 🎉',
  'level.next': 'next level ▸',
  'level.finishedAll': 'You finished every level.',
  'level.locked': 'locked',
  'level.levelsAria': 'levels',

  // the 10 levels: title, goal, and check labels
  'level.first-commit.title': 'Your first commit',
  'level.first-commit.goal': 'Create a file, stage it (git add), then make your first commit.',
  'level.first-commit.check.0': 'at least one commit exists',

  'level.commit-again.title': 'Commit again',
  'level.commit-again.goal': 'Edit a file, stage the change, and make a second commit.',
  'level.commit-again.check.0': 'two commits in history',

  'level.stage-selectively.title': 'Stage selectively',
  'level.stage-selectively.goal': 'Two new files exist: a.txt and b.txt. Stage ONLY a.txt (leave b.txt unstaged).',
  'level.stage-selectively.check.0': 'a.txt is staged',
  'level.stage-selectively.check.1': 'b.txt is NOT staged',

  'level.branch.title': 'Make a branch',
  'level.branch.goal': "Create a branch named 'feature' and make a commit on it.",
  'level.branch.check.0': "branch 'feature' exists",
  'level.branch.check.1': "'feature' has a commit main doesn't",

  'level.switch.title': 'Switch branches',
  'level.switch.goal': "You're on 'feature'. Switch back to the main branch.",
  'level.switch.check.0': 'HEAD is on main',

  'level.diverge.title': 'Diverge two branches',
  'level.diverge.goal': "main and 'feature' point at the same commit. Commit once on each so they diverge.",
  'level.diverge.check.0': 'main has its own commit',
  'level.diverge.check.1': "'feature' has its own commit",

  'level.undo-soft.title': 'Undo a commit, keep the work',
  'level.undo-soft.goal': 'Undo your most recent commit but keep its changes staged. Select the earlier commit, then reset (soft).',
  'level.undo-soft.check.0': 'history is back to one commit',
  'level.undo-soft.check.1': 'the undone change is still staged',

  'level.amend.title': 'Fix the last commit message',
  'level.amend.goal': "Your last commit says 'tpyo'. Amend it to say 'add readme'.",
  'level.amend.check.0': "the last commit says 'add readme'",
  'level.amend.check.1': 'still exactly one commit',

  'level.detach.title': 'Detach HEAD',
  'level.detach.goal': 'Check out an earlier commit directly (detached HEAD): select it, then "checkout (detached)".',
  'level.detach.check.0': 'HEAD is detached',

  'level.rescue-ghost.title': 'Rescue a lost commit',
  'level.rescue-ghost.goal': "You reset too far — 'important work' is now a ghost (faded, unreachable). Point main back at it: select the ghost, then reset (hard).",
  'level.rescue-ghost.check.0': "'important work' is back on main",
} as const;

export type MessageKey = keyof typeof en;

export const tr: Record<MessageKey, string> = {
  // chrome
  'app.title': 'git, görsel olarak',
  'app.subtitle': 'git\'i yaparak öğren — grafiği izle',
  'mode.levels': 'seviyeler',
  'mode.sandbox': 'serbest mod',
  'action.restartLevel': 'seviyeyi yeniden başlat',
  'action.resetRepo': 'repoyu sıfırla',
  'lang.en': 'EN',
  'lang.tr': 'TR',

  // graph
  'graph.noCommits': 'henüz commit yok',
  'graph.aria': 'commit grafiği',
  'graph.commitAria': 'commit {message}',

  // working directory
  'panel.workingDir': 'Çalışma dizini',
  'workingDir.empty': 'boş',
  'status.untracked': 'untracked',
  'status.modified': 'değişti',
  'status.staged': 'staged',
  'status.clean': 'temiz',
  'status.deleted': 'silindi',
  'action.stage': 'stage →',
  'action.stage.title': 'stage\'le (git add)',
  'action.addFile': '+ dosya',
  'placeholder.newFile': 'yeni-dosya.txt',
  'action.save': 'kaydet',
  'action.cancel': 'iptal',
  'action.edit': 'düzenle',

  // staging
  'panel.staging': 'Staging alanı',
  'staging.empty': 'stage\'de bir şey yok',
  'staged.added': 'eklendi',
  'staged.modified': 'değişti',
  'action.unstage': '← unstage',
  'action.unstage.title': 'unstage\'le (git restore --staged)',

  // commit bar
  'panel.commit': 'Commit',
  'placeholder.commitMessage': 'commit mesajı',
  'action.commit': 'commit',
  'action.amend': 'amend',
  'action.amend.title': 'son commit\'i değiştir (git commit --amend)',

  // branches
  'panel.branches': 'Branch\'ler',
  'refbar.on': 'şu an:',
  'refbar.detachedHead': 'detached HEAD',
  'placeholder.newBranch': 'yeni-branch',
  'action.branch': 'branch',
  'action.branch.title': 'burada branch oluştur (git branch)',
  'action.branchSwitch': 'branch + switch',
  'action.branchSwitch.title': 'oluştur ve geç (git switch -c)',
  'action.switchTo.title': '{name} branch\'ine geç',

  // history tools
  'panel.historyTools': 'Geçmiş araçları',
  'ht.moveBranch': '{name} branch\'ini şuraya taşı:',
  'ht.moveHead': 'HEAD\'i şuraya taşı:',
  'ht.soft': 'soft',
  'ht.soft.title': 'index + working tree korunur',
  'ht.mixed': 'mixed',
  'ht.mixed.title': 'index sıfırlanır, working tree korunur',
  'ht.hard': 'hard',
  'ht.hard.title': 'index + working tree atılır',
  'ht.detachHint': 'branch olmadan bir commit\'e git',
  'ht.checkoutDetached': 'checkout {oid} (detached)',
  'ht.checkoutDetached.title': 'git checkout <commit> — detached HEAD',
  'ht.discard': 'commit\'lenmemiş değişiklikleri at ({n})',
  'action.restore': 'restore',
  'action.restore.title': 'git restore <dosyalar>',

  // commit inspector
  'inspector.select': 'grafikten bir commit seç',
  'inspector.root': 'kök',
  'inspector.parent': '{n} üst commit',
  'inspector.parents': '{n} üst commit',

  // notices (engine reasonKeys)
  'reason.already-a-repo': 'Burası zaten bir repo.',
  'reason.amend-identical': 'Hiçbir şey değişmedi — amend edilen commit aynısı olurdu.',
  'reason.branch-exists': '"{name}" adlı bir branch zaten var.',
  'reason.detach-requires-flag': '"{ref}" bir commit, branch değil.',
  'reason.no-commits-yet': 'Bunu yapmadan önce ilk commit\'ini yap.',
  'reason.not-a-repo': 'Bu klasör henüz bir repo değil.',
  'reason.nothing-to-commit': 'Stage\'de commit\'lenecek bir şey yok.',
  'reason.path-is-ignored': '"{path}" yok sayılıyor.',
  'reason.pathspec-no-match': '"{path}" adlı takip edilen bir dosya yok.',
  'reason.switch-dirty': 'Commit\'lenmemiş değişikliklerin var — önce commit\'le ya da at.',
  'reason.unknown-ref': '"{ref}" adlı bir branch ya da commit yok.',
  'notice.dismiss': 'kapat',

  // live region (spoken)
  'spoken.commit': '{oid} commit\'i oluşturuldu.',
  'spoken.onBranch': 'Artık {name} branch\'indesin.',
  'spoken.detached': 'HEAD {oid} üzerinde detached oldu.',
  'spoken.refMoved': '{ref} branch\'i taşındı.',
  'spoken.snapshotLost': 'Uyarı: stage\'lenmiş bir anlık görüntü değiştirildi.',
  'spoken.staged': 'Staging alanı güncellendi.',
  'spoken.worktree': 'Çalışma dosyaları güncellendi.',
  'spoken.fileSaved': 'Dosya kaydedildi.',

  // level panel
  'level.progress': 'Seviye {n} / {total}',
  'level.restart': 'yeniden başlat',
  'level.restart.title': 'bu seviyeyi yeniden başlat',
  'level.complete': 'Seviye tamam! 🎉',
  'level.next': 'sonraki seviye ▸',
  'level.finishedAll': 'Tüm seviyeleri bitirdin.',
  'level.locked': 'kilitli',
  'level.levelsAria': 'seviyeler',

  // the 10 levels: title, goal, and check labels
  'level.first-commit.title': 'İlk commit\'in',
  'level.first-commit.goal': 'Bir dosya oluştur, stage\'le (git add), sonra ilk commit\'ini yap.',
  'level.first-commit.check.0': 'en az bir commit var',

  'level.commit-again.title': 'Tekrar commit\'le',
  'level.commit-again.goal': 'Bir dosyayı düzenle, değişikliği stage\'le, ikinci commit\'i yap.',
  'level.commit-again.check.0': 'geçmişte iki commit var',

  'level.stage-selectively.title': 'Seçerek stage\'le',
  'level.stage-selectively.goal': 'İki yeni dosya var: a.txt ve b.txt. SADECE a.txt\'yi stage\'le (b.txt\'yi stage\'leme).',
  'level.stage-selectively.check.0': 'a.txt stage\'lendi',
  'level.stage-selectively.check.1': 'b.txt stage\'lenmedi',

  'level.branch.title': 'Bir branch oluştur',
  'level.branch.goal': '\'feature\' adlı bir branch oluştur ve üzerinde bir commit yap.',
  'level.branch.check.0': '\'feature\' branch\'i var',
  'level.branch.check.1': '\'feature\'da main\'de olmayan bir commit var',

  'level.switch.title': 'Branch değiştir',
  'level.switch.goal': '\'feature\'dasın. main branch\'ine geri dön.',
  'level.switch.check.0': 'HEAD main üzerinde',

  'level.diverge.title': 'İki branch\'i ayrıştır',
  'level.diverge.goal': 'main ve \'feature\' aynı commit\'i gösteriyor. Ayrışmaları için her birinde birer commit yap.',
  'level.diverge.check.0': 'main\'de kendine ait bir commit var',
  'level.diverge.check.1': '\'feature\'da kendine ait bir commit var',

  'level.undo-soft.title': 'Commit\'i geri al, işi koru',
  'level.undo-soft.goal': 'En son commit\'ini geri al ama değişiklikleri staged kalsın. Önceki commit\'i seç, sonra reset (soft) yap.',
  'level.undo-soft.check.0': 'geçmiş tekrar tek commit\'e döndü',
  'level.undo-soft.check.1': 'geri alınan değişiklik hâlâ staged',

  'level.amend.title': 'Son commit mesajını düzelt',
  'level.amend.goal': 'Son commit\'in \'tpyo\' diyor. Amend ederek \'add readme\' yap.',
  'level.amend.check.0': 'son commit \'add readme\' diyor',
  'level.amend.check.1': 'hâlâ tam olarak bir commit var',

  'level.detach.title': 'HEAD\'i detach et',
  'level.detach.goal': 'Önceki bir commit\'i doğrudan checkout et (detached HEAD): onu seç, sonra "checkout (detached)".',
  'level.detach.check.0': 'HEAD detached durumda',

  'level.rescue-ghost.title': 'Kayıp bir commit\'i kurtar',
  'level.rescue-ghost.goal': 'Çok geriye reset attın — \'important work\' artık bir hayalet (soluk, erişilemez). main\'i tekrar ona yönelt: hayaleti seç, sonra reset (hard) yap.',
  'level.rescue-ghost.check.0': '\'important work\' tekrar main\'de',
};

export const dict: Record<Locale, Record<MessageKey, string>> = { en, tr };
