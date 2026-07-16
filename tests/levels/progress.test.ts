import { describe, it, expect } from 'vitest';
import { clampProgress, withCompleted } from '../../src/levels/progress';

describe('clampProgress', () => {
  it('defaults a missing/invalid value to a safe start', () => {
    expect(clampProgress(null, 10)).toEqual({ currentIndex: 0, completed: [] });
    expect(clampProgress({ currentIndex: 99, completed: 'x' }, 10)).toEqual({ currentIndex: 9, completed: [] });
  });
  it('keeps a valid value and clamps the index into range', () => {
    expect(clampProgress({ currentIndex: 3, completed: ['a', 'b'] }, 10)).toEqual({ currentIndex: 3, completed: ['a', 'b'] });
    expect(clampProgress({ currentIndex: -2, completed: [] }, 10)).toEqual({ currentIndex: 0, completed: [] });
  });
});

describe('withCompleted', () => {
  it('adds an id once (idempotent)', () => {
    const p = { currentIndex: 0, completed: [] as string[] };
    const a = withCompleted(p, 'first');
    expect(a.completed).toEqual(['first']);
    expect(withCompleted(a, 'first').completed).toEqual(['first']);
  });
});
