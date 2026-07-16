import type { GitObject, Oid } from './types';

function fnv1a(str: string, seed: number): number {
  let h = seed >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

function canonicalise(obj: GitObject): string {
  switch (obj.kind) {
    case 'blob':
      return `blob\0${obj.content}`;
    case 'tree':
      return 'tree\0' + Object.keys(obj.entries).sort()
        .map((p) => `${p}=${obj.entries[p]}`).join('\n');
    case 'commit':
      return `commit\0tree=${obj.tree}\nparents=${obj.parents.join(',')}\nmsg=${obj.message}`;
  }
}

/** Content-only, deterministic. No timestamp, no author — spec §10.1. */
export function hashObject(obj: GitObject): Oid {
  const s = canonicalise(obj);
  const a = fnv1a(s, 0x811c9dc5).toString(16).padStart(8, '0');
  const b = fnv1a(s, 0xdeadbeef).toString(16).padStart(8, '0');
  return a + b;
}
