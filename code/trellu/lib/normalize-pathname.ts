/**
 * Évite les chemins du type `//invitations` (double slash) qui font interpréter
 * `router.replace(pathname)` comme une URL vers l'hôte `invitations` → SecurityError.
 */
export function normalizePathname(pathname: string): string {
  if (!pathname) return "/";
  return pathname.replace(/\/{2,}/g, "/");
}
