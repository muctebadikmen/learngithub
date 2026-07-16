/**
 * reasonKey -> human sentence. TEMPORARY English shim; Phase 5 replaces this file
 * with real i18n (the engine already speaks in keys, so only this map changes).
 */
export const REASONS: Record<string, string> = {
  'already-a-repo': 'This is already a repository.',
  'amend-identical': 'Nothing changed — the amended commit would be identical.',
  'branch-exists': 'A branch named "{name}" already exists.',
  'detach-requires-flag': '"{ref}" is a commit, not a branch.',
  'no-commits-yet': 'Make your first commit before doing that.',
  'not-a-repo': 'This folder is not a repository yet.',
  'nothing-to-commit': 'Nothing is staged to commit.',
  'path-is-ignored': '"{path}" is ignored.',
  'pathspec-no-match': 'There is no tracked file "{path}".',
  'switch-dirty': 'You have uncommitted changes — commit or discard them first.',
  'unknown-ref': 'There is no branch or commit named "{ref}".',
};

export function describeEvent(reasonKey: string, params?: Record<string, string>): string {
  const base = REASONS[reasonKey] ?? reasonKey;
  if (!params) return base;
  return Object.entries(params).reduce((s, [k, v]) => s.replaceAll(`{${k}}`, v), base);
}
