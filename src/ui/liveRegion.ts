import type { EngineEvent } from '../engine/types';
import { describeEvent } from './messages';

/** A short spoken sentence for the ARIA live region, from the last dispatch's events. */
export function announce(events: EngineEvent[]): string {
  const parts: string[] = [];
  for (const e of events) {
    switch (e.kind) {
      case 'commit-created': parts.push(`Created commit ${e.oid.slice(0, 8)}.`); break;
      case 'head-moved':
        parts.push(e.head.kind === 'branch' ? `Now on branch ${e.head.name}.` : `HEAD detached at ${e.head.oid.slice(0, 8)}.`);
        break;
      case 'ref-moved': parts.push(`Branch ${e.ref} moved.`); break;
      case 'staged-snapshot-lost': parts.push('Warning: a staged snapshot was replaced.'); break;
      case 'error': parts.push(describeEvent(e.reasonKey, e.params)); break;
      case 'no-op': parts.push(describeEvent(e.reasonKey)); break;
      default: break;
    }
  }
  return parts.join(' ');
}
