// Names of the top-level settings fields whose value differs before/after an
// update — recorded in the audit log so it shows *what* changed without
// storing the values themselves.
export function changedTopLevelKeys(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
  keys: string[],
): string[] {
  return keys.filter(
    (key) => JSON.stringify(before[key]) !== JSON.stringify(after[key]),
  );
}
