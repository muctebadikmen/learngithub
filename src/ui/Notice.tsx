import type { EngineEvent } from '../engine/types';
import { describeEvent } from './messages';

export interface NoticeData { kind: 'error' | 'info'; text: string }

/** Turn the last dispatch's events into a single user-facing notice, or null. */
export function noticeFromEvents(events: EngineEvent[]): NoticeData | null {
  for (const e of events) {
    if (e.kind === 'error') return { kind: 'error', text: describeEvent(e.reasonKey, e.params) };
    if (e.kind === 'no-op') return { kind: 'info', text: describeEvent(e.reasonKey) };
  }
  return null;
}

export function Notice({ data, onDismiss }: { data: NoticeData | null; onDismiss: () => void }) {
  if (!data) return null;
  const tone = data.kind === 'error' ? 'border-rose-800 bg-rose-950/60 text-rose-200' : 'border-sky-800 bg-sky-950/60 text-sky-200';
  return (
    <div role="status" className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm ${tone}`}>
      <span>{data.text}</span>
      <button className="text-xs opacity-70 hover:opacity-100" onClick={onDismiss} aria-label="dismiss">✕</button>
    </div>
  );
}
