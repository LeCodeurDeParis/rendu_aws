/** Évite les redirections ouvertes : uniquement chemins relatifs internes. */
export function isSafeInternalPath(path: string): boolean {
  return path.startsWith("/") && !path.startsWith("//");
}
