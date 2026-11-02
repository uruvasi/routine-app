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
    expect(listBackups()).toEqual([{ key, at: 1000, count: 2 }])
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
