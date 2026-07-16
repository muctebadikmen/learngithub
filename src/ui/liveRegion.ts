import type { EngineEvent } from '../engine/types';
import type { MessageKey } from '../i18n/dict';
import type { TFn } from '../i18n/I18nProvider';

/** A short spoken sentence for the ARIA live region, from the last dispatch's events. */
export function announce(events: EngineEvent[], t: TFn): string {
  const parts: string[] = [];
  const has = (k: EngineEvent['kind']) => events.some((e) => e.kind === k);
  const structural = has('commit-created') || has('head-moved') || has('ref-moved');
  for (const e of events) {
    switch (e.kind) {
      case 'commit-created': parts.push(t('spoken.commit', { oid: e.oid.slice(0, 8) })); break;
      case 'head-moved':
        parts.push(e.head.kind === 'branch' ? t('spoken.onBranch', { name: e.head.name }) : t('spoken.detached', { oid: e.head.oid.slice(0, 8) }));
        break;
      case 'ref-moved': parts.push(t('spoken.refMoved', { ref: e.ref })); break;
      case 'staged-snapshot-lost': parts.push(t('spoken.snapshotLost')); break;
      case 'error': parts.push(t(`reason.${e.reasonKey}` as MessageKey, e.params)); break;
      case 'no-op': parts.push(t(`reason.${e.reasonKey}` as MessageKey)); break;
      default: break;
    }
  }
  if (!structural) {
    if (has('index-updated')) parts.push(t('spoken.staged'));
    else if (has('worktree-updated')) parts.push(t('spoken.worktree'));
    else if (has('file-written')) parts.push(t('spoken.fileSaved'));
  }
  return parts.join(' ');
}
