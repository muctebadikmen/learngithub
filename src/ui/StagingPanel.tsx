import type { GitAction, RepoState } from '../engine/types';
import type { MessageKey } from '../i18n/dict';
import { useT } from '../i18n/I18nProvider';
import { stagedFiles } from './fileStatus';

export function StagingPanel({ state, dispatch }: { state: RepoState; dispatch: (a: GitAction) => unknown }) {
  const { t } = useT();
  const staged = stagedFiles(state);
  return (
    <section className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 mb-2">{t('panel.staging')}</h2>
      <ul className="space-y-1">
        {staged.length === 0 && <li className="text-sm text-zinc-600 italic">{t('staging.empty')}</li>}
        {staged.map((f) => (
          <li key={f.path} className="flex items-center justify-between gap-2 text-sm font-mono text-emerald-400">
            <span className="truncate">{f.path}</span>
            <span className="flex items-center gap-2">
              <span className="text-[10px] uppercase text-zinc-600">{t(`staged.${f.kind}` as MessageKey)}</span>
              <button className="text-zinc-400 hover:text-zinc-200 text-xs" onClick={() => dispatch({ cmd: 'restore', paths: [f.path], staged: true })} title={t('action.unstage.title')}>
                {t('action.unstage')}
              </button>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
