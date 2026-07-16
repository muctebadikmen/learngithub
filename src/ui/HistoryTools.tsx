import { headCommitOid } from '../engine/refs';
import type { GitAction, RepoState } from '../engine/types';
import { useT } from '../i18n/I18nProvider';
import { workingFiles } from './fileStatus';
import { currentBranch } from './affordances';

export function HistoryTools({ state, dispatch, selectedOid }: {
  state: RepoState; dispatch: (a: GitAction) => unknown; selectedOid: string | null;
}) {
  const { t } = useT();
  const target = selectedOid ?? 'HEAD';
  const targetLabel = selectedOid ? selectedOid.slice(0, 8) : 'HEAD';
  const recoverable = workingFiles(state)
    .filter((f) => f.status === 'modified' || f.status === 'deleted')
    .map((f) => f.path);
  const unborn = headCommitOid(state) === null;
  const branch = currentBranch(state);
  const moveLabel = branch ? t('ht.moveBranch', { name: branch }) : t('ht.moveHead');
  const reset = (mode: 'soft' | 'mixed' | 'hard') => dispatch({ cmd: 'reset', mode, target });

  return (
    <section className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3 space-y-3">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{t('panel.historyTools')}</h2>

      <div>
        <div className="text-[11px] text-zinc-500 mb-1">
          {moveLabel} <span className="font-mono text-zinc-300">{targetLabel}</span>
        </div>
        <div className="flex gap-1">
          <button className="rounded border border-zinc-700 px-2 py-0.5 text-xs hover:bg-zinc-800 disabled:opacity-40" disabled={unborn} onClick={() => reset('soft')} title={t('ht.soft.title')}>{t('ht.soft')}</button>
          <button className="rounded border border-zinc-700 px-2 py-0.5 text-xs hover:bg-zinc-800 disabled:opacity-40" disabled={unborn} onClick={() => reset('mixed')} title={t('ht.mixed.title')}>{t('ht.mixed')}</button>
          <button className="rounded border border-rose-800 text-rose-300 px-2 py-0.5 text-xs hover:bg-rose-950 disabled:opacity-40" disabled={unborn} onClick={() => reset('hard')} title={t('ht.hard.title')}>{t('ht.hard')}</button>
        </div>
      </div>

      {selectedOid && (
        <div>
          <div className="text-[11px] text-zinc-500 mb-1">{t('ht.detachHint')}</div>
          <button
            className="rounded border border-zinc-700 px-2 py-0.5 text-xs hover:bg-zinc-800"
            onClick={() => dispatch({ cmd: 'switch', target: selectedOid, detach: true })}
            title={t('ht.checkoutDetached.title')}
          >
            {t('ht.checkoutDetached', { oid: targetLabel })}
          </button>
        </div>
      )}

      <div>
        <div className="text-[11px] text-zinc-500 mb-1">{t('ht.discard', { n: recoverable.length })}</div>
        <button
          className="rounded border border-zinc-700 px-2 py-0.5 text-xs hover:bg-zinc-800 disabled:opacity-40"
          disabled={recoverable.length === 0}
          onClick={() => dispatch({ cmd: 'restore', paths: recoverable })}
          title={t('action.restore.title')}
        >
          {t('action.restore')}
        </button>
      </div>
    </section>
  );
}
