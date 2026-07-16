import type { EngineEvent } from '../engine/types';
import type { MessageKey } from '../i18n/dict';
import type { TFn } from '../i18n/I18nProvider';
import { useT } from '../i18n/I18nProvider';

export interface NoticeData { kind: 'error' | 'info'; text: string }

/** Turn the last dispatch's events into a single user-facing notice, or null. */
export function noticeFromEvents(events: EngineEvent[], t: TFn): NoticeData | null {
  for (const e of events) {
    if (e.kind === 'error') return { kind: 'error', text: t(`reason.${e.reasonKey}` as MessageKey, e.params) };
    if (e.kind === 'no-op') return { kind: 'info', text: t(`reason.${e.reasonKey}` as MessageKey) };
  }
  return null;
}

export function Notice({ data, onDismiss }: { data: NoticeData | null; onDismiss: () => void }) {
  const { t } = useT();
  if (!data) return null;
  const tone = data.kind === 'error' ? 'border-rose-800 bg-rose-950/60 text-rose-200' : 'border-sky-800 bg-sky-950/60 text-sky-200';
  return (
    <div className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm ${tone}`}>
      <span>{data.text}</span>
      <button className="text-xs opacity-70 hover:opacity-100" onClick={onDismiss} aria-label={t('notice.dismiss')}>✕</button>
    </div>
  );
}
