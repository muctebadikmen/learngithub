import { describe, it, expect } from 'vitest';
import { hashObject } from '../../src/engine/hash';

describe('hashObject', () => {
  it('is deterministic', () => {
    expect(hashObject({ kind: 'blob', content: 'hello' }))
      .toBe(hashObject({ kind: 'blob', content: 'hello' }));
  });

  it('changes when one character changes', () => {
    expect(hashObject({ kind: 'blob', content: 'hello' }))
      .not.toBe(hashObject({ kind: 'blob', content: 'hellO' }));
  });

  it('ignores tree key insertion order', () => {
    expect(hashObject({ kind: 'tree', entries: { a: '1'.repeat(16), b: '2'.repeat(16) } }))
      .toBe(hashObject({ kind: 'tree', entries: { b: '2'.repeat(16), a: '1'.repeat(16) } }));
  });

  it('separates object kinds and commit fields', () => {
    const t = hashObject({ kind: 'tree', entries: {} });
    const c1 = hashObject({ kind: 'commit', tree: t, parents: [], message: 'm' });
    const c2 = hashObject({ kind: 'commit', tree: t, parents: [c1], message: 'm' });
    expect(c1).not.toBe(c2); // same content, different parents => different hash
    expect(hashObject({ kind: 'blob', content: '' })).not.toBe(t);
  });

  it('returns 16 hex chars', () => {
    expect(hashObject({ kind: 'blob', content: 'x' })).toMatch(/^[0-9a-f]{16}$/);
  });
});
