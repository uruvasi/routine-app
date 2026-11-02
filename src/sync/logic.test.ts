import { describe, it, expect } from 'vitest'
import { decideOnFetch, type LocalState } from './logic'
import type { Routine, Snapshot } from '../types'

const seed: Routine[] = [
  {
    id: 's',
    name: '朝ルーティン',
    createdAt: 1,
    tasks: [
      { id: '1', name: '起床・水を飲む', duration: 60 },
      { id: '2', name: 'ストレッチ', duration: 300 },
      { id: '3', name: '朝食', duration: 600 },
    ],
  },
]
const mine: Routine[] = [{ id: 'm', name: '自分の', createdAt: 2, tasks: [] }]
const cloud = (n: number, revision = 3): Snapshot => ({
  revision,
  routines: Array.from({ length: n }, (_, i) => ({ id: `c${i}`, name: `c${i}`, createdAt: i, tasks: [] })),
  updatedAt: 1,
  clearedAt: null,
})
const local = (p: Partial<LocalState>): LocalState => ({
  routines: mine,
  localEdited: true,
  dirty: false,
  baseRevision: 3,
  ...p,
})

describe('decideOnFetch — first sync on this device', () => {
  it('seed-only local + cloud data → adopt with backup', () => {
    expect(decideOnFetch(local({ routines: seed, localEdited: false, baseRevision: null }), cloud(3))).toEqual({
      kind: 'adopt',
      backup: true,
    })
  })
  it('seed-shaped local even if flag says edited → adopt', () => {
    expect(decideOnFetch(local({ routines: seed, localEdited: true, baseRevision: null }), cloud(1)).kind).toBe('adopt')
  })
  it('empty local → adopt without backup', () => {
    expect(decideOnFetch(local({ routines: [], baseRevision: null }), cloud(2))).toEqual({ kind: 'adopt', backup: false })
  })
  it('edited local + cloud data → ask-initial', () => {
    expect(decideOnFetch(local({ baseRevision: null }), cloud(1))).toEqual({ kind: 'ask-initial' })
  })
  it('empty cloud → upload', () => {
    expect(decideOnFetch(local({ baseRevision: null }), cloud(0, 0))).toEqual({ kind: 'upload' })
  })
})

describe('decideOnFetch — already linked', () => {
  it('dirty → push', () => {
    expect(decideOnFetch(local({ dirty: true, baseRevision: 3 }), cloud(1, 5))).toEqual({ kind: 'push' })
  })
  it('remote newer and clean → adopt with backup', () => {
    expect(decideOnFetch(local({ baseRevision: 3 }), cloud(1, 4))).toEqual({ kind: 'adopt', backup: true })
  })
  it('same revision → noop', () => {
    expect(decideOnFetch(local({ baseRevision: 3 }), cloud(1, 3))).toEqual({ kind: 'noop' })
  })
  it('cloud cleared elsewhere (empty, newer revision) and clean → adopt with backup', () => {
    const cleared: Snapshot = { revision: 4, routines: [], updatedAt: 2, clearedAt: 2 }
    expect(decideOnFetch(local({ baseRevision: 3 }), cleared)).toEqual({ kind: 'adopt', backup: true })
  })
})
