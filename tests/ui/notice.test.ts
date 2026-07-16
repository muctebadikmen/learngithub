import { describe, it, expect } from 'vitest';
import type { EngineEvent } from '../../src/engine/types';
import { noticeFromEvents } from '../../src/ui/Notice';

describe('noticeFromEvents', () => {
  it('surfaces an error event as an error notice', () => {
    const ev: EngineEvent[] = [{ kind: 'error', reasonKey: 'switch-dirty' }];
    expect(noticeFromEvents(ev)).toEqual({ kind: 'error', text: 'You have uncommitted changes — commit or discard them first.' });
  });
  it('interpolates params', () => {
    const ev: EngineEvent[] = [{ kind: 'error', reasonKey: 'branch-exists', params: { name: 'feature' } }];
    expect(noticeFromEvents(ev)?.text).toBe('A branch named "feature" already exists.');
  });
  it('surfaces a no-op as an info notice', () => {
    const ev: EngineEvent[] = [{ kind: 'no-op', reasonKey: 'amend-identical' }];
    expect(noticeFromEvents(ev)).toEqual({ kind: 'info', text: 'Nothing changed — the amended commit would be identical.' });
  });
  it('returns null when nothing noteworthy happened', () => {
    const ev: EngineEvent[] = [{ kind: 'commit-created', oid: 'abc' }];
    expect(noticeFromEvents(ev)).toBeNull();
  });
});
