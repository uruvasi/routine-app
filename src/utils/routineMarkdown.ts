import type { Routine } from '../types'

const genId = () => Math.random().toString(36).slice(2, 10)

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  if (m > 0 && s > 0) return `${m}分${s}秒`
  if (m > 0) return `${m}分`
  return `${s}秒`
}

function parseDuration(str: string): number {
  const minMatch = str.match(/(\d+)分/)
  const secMatch = str.match(/(\d+)秒/)
  const min = minMatch ? parseInt(minMatch[1]) : 0
  const sec = secMatch ? parseInt(secMatch[1]) : 0
  return min * 60 + sec
}

export function exportToMarkdown(routines: Routine[]): string {
  return routines
    .map((r) => {
      const tasks = r.tasks
        .map((t) => `- ${t.name}: ${formatDuration(t.duration)}`)
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
