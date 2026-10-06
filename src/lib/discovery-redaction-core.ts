const SENSITIVE_NAME = /(?:^|[^a-z0-9])(?:authorization|auth|cookie|credential|csrf|email|phone|address|password|passwd|secret|session|token|jwt|bearer|api[_-]?key|access[_-]?key|user[_-]?id|account[_-]?id|social[_-]?security|ssn)(?:$|[^a-z0-9])/i;

export function redactDiscoveryPath(path: string | null | undefined): string | null {
  if (!path) return null;
  const segments = path.split("/").filter(Boolean).slice(0, 32);
  const safe = segments.map((segment) => {
    let decoded = segment;
    try { decoded = decodeURIComponent(segment); } catch { return "[redacted]"; }
    if (SENSITIVE_NAME.test(decoded) || decoded.includes("@") || /^[0-9]{7,}$/.test(decoded) || /^[a-f0-9]{24,}$/i.test(decoded) || /^(?=.*[a-z])(?=.*[0-9])[A-Za-z0-9_-]{20,}$/i.test(decoded) || /^[A-Za-z0-9_-]{16,}\.[A-Za-z0-9_-]{8,}(?:\.[A-Za-z0-9_-]{8,})?$/.test(decoded)) return "[redacted]";
    return encodeURIComponent(decoded).slice(0, 80);
  });
  const result = `/${safe.join("/")}`.slice(0, 512);
  return result === "/" ? "/" : result;
}

export function redactDiscoveryKey(key: string | null | undefined): string | null {
  if (!key) return null;
  return SENSITIVE_NAME.test(key) ? "[redacted]" : key.trim().slice(0, 255);
}

export function sanitizeDiscoveryPageUrl(value: string): string {
  const parsed = new URL(value);
  if (!/^https?:$/.test(parsed.protocol) || parsed.username || parsed.password) throw new Error("Unsupported page URL");
  return `${parsed.origin}${redactDiscoveryPath(parsed.pathname) ?? "/"}`;
}
