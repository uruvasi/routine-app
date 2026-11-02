import { describe, it, expect, beforeEach } from 'vitest'
import { installLocalStorage } from '../test/localStorage'
import { saveBackup, listBackups, BACKUP_PREFIX } from './backup'
import type { Routine } from '../types'

const r = (n: number): Routine[] => Array.from({ length: n }, (_, i) => ({ id: `${i}`, name: 'x', createdAt: 0, tasks: [] }))

describe('backups', () => {
  beforeEach(() => installLocalStorage())

  it('saves under routine-store-backup-<epochMs> and lists it', () => {
    const key = saveBackup(r(2), 1000)
    expect(key).toBe(`${BACKUP_PREFIX}1000`)
    expect(JSON.parse(localStorage.getItem(key)!)).toEqual(r(2))
    expect(listBackups()).toEqual([{ key, at: 1000, count: 2, kind: 'sync' }])
  })

  it('keeps only the newest 5', () => {
    for (let i = 1; i <= 7; i++) saveBackup(r(i), i * 1000)
    const list = listBackups()
    expect(list.map((b) => b.at)).toEqual([7000, 6000, 5000, 4000, 3000])
    expect(localStorage.getItem(`${BACKUP_PREFIX}1000`)).toBeNull()
  })

  it('ignores unrelated keys', () => {
    localStorage.setItem('routine-store', '{}')
    saveBackup(r(1), 5)
    expect(listBackups()).toHaveLength(1)
    expect(localStorage.getItem('routine-store')).toBe('{}')
  })
})

describe('important backups (conflict / clear)', () => {
  beforeEach(() => installLocalStorage())

  it('are kept separately and not evicted by routine sync backups', async () => {
    const { saveBackup, listBackups } = await import('./backup')
    saveBackup(r(9), 1, 'keep')
    for (let i = 2; i <= 10; i++) saveBackup(r(1), i)
    const list = listBackups()
    expect(list.filter((b) => b.kind === 'keep').map((b) => b.at)).toEqual([1])
    expect(list.filter((b) => b.kind === 'sync')).toHaveLength(5)
  })

  it('keep backups retain the newest 10', async () => {
    const { saveBackup, listBackups } = await import('./backup')
    for (let i = 1; i <= 12; i++) saveBackup(r(1), i, 'keep')
    expect(listBackups().map((b) => b.at)).toEqual([12, 11, 10, 9, 8, 7, 6, 5, 4, 3])
  })

  it('readBackup returns the stored routines', async () => {
    const { saveBackup, readBackup } = await import('./backup')
    const key = saveBackup(r(2), 5, 'keep')
    expect(readBackup(key)).toEqual(r(2))
    expect(readBackup('nope')).toBeNull()
  })
})

describe('restoreBackup', () => {
  beforeEach(() => installLocalStorage())
  it('returns the backup and first stashes the current routines as a keep backup', async () => {
    const { saveBackup, restoreBackup, listBackups } = await import('./backup')
    const key = saveBackup(r(3), 1, 'keep')
    expect(restoreBackup(key, r(1), 2)).toEqual(r(3))
    expect(listBackups().find((b) => b.at === 2)).toMatchObject({ kind: 'keep', count: 1 })
  })
  it('returns null and stashes nothing for a missing key', async () => {
    const { restoreBackup, listBackups } = await import('./backup')
    expect(restoreBackup('routine-store-backup-404', r(1), 2)).toBeNull()
    expect(listBackups()).toHaveLength(0)
  })
})
