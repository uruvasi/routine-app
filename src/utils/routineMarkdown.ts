import type { Routine } from '../types'

const genId = () => Math.random().toString(36).slice(2, 10)

function formatMmSs(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function parseDuration(str: string): number {
  // hh:mm:ss format: "1:05:30"
  const hhmmss = str.match(/^(\d+):(\d{2}):(\d{2})$/)
  if (hhmmss) {
    return parseInt(hhmmss[1]) * 3600 + parseInt(hhmmss[2]) * 60 + parseInt(hhmmss[3])
  }
  // mm:ss format: "05:30"
  const mmss = str.match(/^(\d+):(\d{2})$/)
  if (mmss) {
    return parseInt(mmss[1]) * 60 + parseInt(mmss[2])
  }
  // Legacy 分秒 format (backward compat)
  const minMatch = str.match(/(\d+)分/)
  const secMatch = str.match(/(\d+)秒/)
  return (minMatch ? parseInt(minMatch[1]) : 0) * 60 + (secMatch ? parseInt(secMatch[1]) : 0)
}

export function exportToMarkdown(routines: Routine[]): string {
  return routines
    .map((r) => {
      const tasks = r.tasks
        .map((t) => `- ${t.name}: ${formatMmSs(t.duration)}`)
        .join('\n')
      return `# ${r.name}\n${tasks}`
    })
    .join('\n\n')
}

export function importFromMarkdown(text: string): Routine[] {
  const routines: Routine[] = []
  let current: Routine | null = null

  for (const raw of text.split('\n')) {
    const line = raw.trim()
    if (!line) continue

    if (line.startsWith('# ')) {
      current = { id: genId(), name: line.slice(2).trim(), tasks: [], createdAt: Date.now() }
      routines.push(current)
      continue
    }

    if (line.startsWith('- ') && current) {
      const content = line.slice(2)
      const lastColon = content.lastIndexOf(': ')
      if (lastColon === -1) continue
      const name = content.slice(0, lastColon).trim()
      const duration = parseDuration(content.slice(lastColon + 2).trim())
      if (name && duration > 0) {
        current.tasks.push({ id: genId(), name, duration })
      }
    }
  }

  return routines.filter((r) => r.tasks.length > 0)
}
