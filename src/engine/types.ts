export type Oid = string; // 16 hex chars

export interface BlobObj { kind: 'blob'; content: string }
export interface TreeObj { kind: 'tree'; entries: Record<string, Oid> } // path -> blob oid
export interface CommitObj { kind: 'commit'; tree: Oid; parents: Oid[]; message: string }
export type GitObject = BlobObj | TreeObj | CommitObj;

export type Head =
  | { kind: 'branch'; name: string }
  | { kind: 'detached'; oid: Oid };

export interface ReflogEntry { from: Oid | null; to: Oid; action: string } // newest first

export interface RepoState {
  initialised: boolean;
  objects: Record<Oid, GitObject>;      // append-only; never GC'd
  branches: Record<string, Oid>;
  head: Head;
  index: Record<string, Oid>;           // the staged snapshot: path -> blob oid
  workingDir: Record<string, string>;   // path -> content
  reflog: ReflogEntry[];                // HEAD reflog, newest first (HEAD@{0} = current)
  insertionOrder: Oid[];                // commit oids, creation order (layout tie-break)
  ignored: string[];                    // parsed .gitignore (exact names, v1)
}

export type GitAction =
  | { cmd: 'init' }
  | { cmd: 'writeFile'; path: string; content: string }
  | { cmd: 'add'; paths: string[] }
  | { cmd: 'commit'; message: string; amend?: boolean; paths?: string[] }
  | { cmd: 'branch'; name: string }
  | { cmd: 'switch'; target: string; create?: boolean; detach?: boolean }
  | { cmd: 'reset'; mode: 'soft' | 'mixed' | 'hard'; target: string }
  | { cmd: 'restore'; paths: string[]; staged?: boolean };

export type EngineEvent =
  | { kind: 'repo-initialised' }
  | { kind: 'file-written'; path: string }
  | { kind: 'index-updated'; paths: string[] }
  | { kind: 'commit-created'; oid: Oid }
  | { kind: 'ref-moved'; ref: string; from: Oid | null; to: Oid }
  | { kind: 'head-moved'; head: Head }
  | { kind: 'worktree-updated'; paths: string[] }
  | { kind: 'staged-snapshot-lost'; oids: Oid[] }   // the Topic 4 trap (spec §8.4)
  | { kind: 'no-op'; reasonKey: string }
  | { kind: 'error'; reasonKey: string; params?: Record<string, string> };

export interface ReduceResult { state: RepoState; events: EngineEvent[] }
