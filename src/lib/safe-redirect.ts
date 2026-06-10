const BASE = "https://next-path.invalid";

export function sanitizeNextPath(raw: string | null | undefined): string {
  // Backslashes are treated as slashes in URL authority parsing, so
  // "/\evil.com" resolves off-origin even though it starts with "/".
  if (!raw || !raw.startsWith("/") || raw.includes("\\")) {
    return "/";
  }

  try {
    const resolved = new URL(raw, BASE);

    if (resolved.origin !== BASE) {
      return "/";
    }

    return `${resolved.pathname}${resolved.search}`;
  } catch {
    return "/";
  }
}
