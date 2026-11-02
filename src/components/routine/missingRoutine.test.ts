import { describe, it, expect } from 'vitest'
import { resolveSelectedRoutine } from './resolveSelectedRoutine'
import type { Routine } from '../../types'

const rs: Routine[] = [{ id: 'a', name: 'A', createdAt: 1, tasks: [] }]

describe('resolveSelectedRoutine', () => {
  it('returns null when the routine disappeared (e.g. deleted on another device)', () => {
    expect(resolveSelectedRoutine([], 'x')).toBeNull()
    expect(resolveSelectedRoutine(rs, 'x')).toBeNull()
  })
  it('returns null for a null id', () => {
    expect(resolveSelectedRoutine(rs, null)).toBeNull()
  })
  it('returns the routine when present', () => {
    expect(resolveSelectedRoutine(rs, 'a')).toBe(rs[0])
  })
})
