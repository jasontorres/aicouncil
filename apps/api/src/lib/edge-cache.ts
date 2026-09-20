/** Public GETs that may be stored in the Worker / edge cache. */
export function cacheablePath(pathname: string): boolean {
  if (pathname.startsWith("/v1/") || pathname === "/mcp") return false;
  if (pathname.startsWith("/issues/") || pathname.startsWith("/thread/")) return false;
  if (pathname === "/predictions") return false;
  if (
    pathname === "/" ||
    pathname === "/participate" ||
    pathname === "/charter" ||
    pathname === "/charter/fil" ||
    pathname === "/tracker" ||
    pathname === "/agents"
  ) {
    return true;
  }
  return pathname.endsWith(".md") || pathname.endsWith(".txt") || pathname.endsWith(".xml");
}

export function cacheableResponse(response: Response): boolean {
  if (!response.ok) return false;
  const cc = response.headers.get("Cache-Control") ?? "";
  if (/no-store|private|no-cache/i.test(cc)) return false;
  return /(?:s-maxage|max-age)=[1-9]/.test(cc);
}
