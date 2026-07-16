import type { RepoState } from '../engine/types';
import { useT } from '../i18n/I18nProvider';
import { commitDetails } from './commitDetails';

export function CommitInspector({ state, oid }: { state: RepoState; oid: string | null }) {
  const { t } = useT();
  if (!oid || !state.objects[oid] || state.objects[oid].kind !== 'commit') {
    return (
      <section className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3">
        <h2 className="text-xs font-semibold tracking-wide text-zinc-500 mb-2">{t('panel.commit')}</h2>
        <p className="text-sm text-zinc-600 italic">{t('inspector.select')}</p>
      </section>
    );
  }
  const d = commitDetails(state, oid);
  const parentsLabel = d.parents.length === 0
    ? t('inspector.root')
    : d.parents.length === 1
      ? t('inspector.parent', { n: d.parents.length })
      : t('inspector.parents', { n: d.parents.length });
  return (
    <section className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3">
      <h2 className="text-xs font-semibold tracking-wide text-zinc-500 mb-2">{t('panel.commit')}</h2>
      <div className="text-sm font-mono text-zinc-100 mb-1">{d.message}</div>
      <div className="text-[11px] font-mono text-zinc-500 mb-2">
        {oid.slice(0, 8)} · {parentsLabel}
      </div>
      <ul className="space-y-0.5">
        {d.files.map((f) => (
          <li key={f.path} className="text-xs font-mono text-zinc-400 truncate">{f.path}</li>
        ))}
      </ul>
    </section>
  );
}
