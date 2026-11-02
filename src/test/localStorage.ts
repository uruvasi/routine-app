// Minimal Map-backed localStorage for node test environment.
export function installLocalStorage(): Map<string, string> {
  const map = new Map<string, string>()
  const ls = {
    getItem: (k: string) => (map.has(k) ? map.get(k)! : null),
    setItem: (k: string, v: string) => void map.set(k, String(v)),
    removeItem: (k: string) => void map.delete(k),
    clear: () => map.clear(),
    key: (i: number) => Array.from(map.keys())[i] ?? null,
    get length() {
      return map.size
    },
  }
  const g = globalThis as unknown as { localStorage: Storage; window?: unknown }
  g.localStorage = ls as Storage
  // zustand persist's default storage reads window.localStorage
  if (!g.window) g.window = globalThis
  return map
}
