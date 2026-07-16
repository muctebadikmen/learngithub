export interface Progress {
  currentIndex: number;
  completed: string[];
}

const STORAGE_KEY = 'git-game-progress-v1';

/** Coerce arbitrary parsed JSON into a valid Progress for a `count`-level game. */
export function clampProgress(raw: unknown, count: number): Progress {
  const max = Math.max(0, count - 1);
  const r = (raw ?? {}) as Partial<Progress>;
  const idx = typeof r.currentIndex === 'number' && Number.isFinite(r.currentIndex)
    ? Math.min(max, Math.max(0, Math.floor(r.currentIndex)))
    : 0;
  const completed = Array.isArray(r.completed) ? r.completed.filter((x): x is string => typeof x === 'string') : [];
  return { currentIndex: idx, completed };
}

/** Add a completed level id (idempotent). */
export function withCompleted(p: Progress, id: string): Progress {
  return p.completed.includes(id) ? p : { ...p, completed: [...p.completed, id] };
}

export function loadProgress(count: number): Progress {
  try {
    return clampProgress(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null'), count);
  } catch {
    return { currentIndex: 0, completed: [] };
  }
}

export function saveProgress(p: Progress): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
  } catch {
    /* storage unavailable — progress just won't persist */
  }
}
