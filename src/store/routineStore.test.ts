import { describe, it, expect, beforeEach } from 'vitest'
import { installLocalStorage } from '../test/localStorage'
installLocalStorage()
const { useRoutineStore, isSeedRoutines } = await import('./routineStore')
import type { Routine } from '../types'

const seed = (): Routine[] => [
  {
    id: 'a',
    name: '朝ルーティン',
    createdAt: 1,
    tasks: [
      { id: 'b', name: '起床・水を飲む', duration: 60 },
      { id: 'c', name: 'ストレッチ', duration: 300 },
      { id: 'd', name: '朝食', duration: 600 },
    ],
  },
]

describe('isSeedRoutines', () => {
  it('true for default seed ignoring ids and createdAt', () => {
    expect(isSeedRoutines(seed())).toBe(true)
  })
  it('true for empty list', () => {
    expect(isSeedRoutines([])).toBe(true)
  })
  it('false when a task duration differs', () => {
    const s = seed()
    s[0].tasks[1].duration = 301
    expect(isSeedRoutines(s)).toBe(false)
  })
  it('false when routine name differs', () => {
    const s = seed()
    s[0].name = '夜'
    expect(isSeedRoutines(s)).toBe(false)
  })
})

describe('routineStore localEdited', () => {
  beforeEach(() => {
    useRoutineStore.setState({ routines: seed(), localEdited: false })
  })
  const st = () => useRoutineStore.getState()
  const cases: [string, () => void][] = [
    ['addRoutine', () => st().addRoutine('x')],
    ['updateRoutine', () => st().updateRoutine('a', 'y')],
    ['deleteRoutine', () => st().deleteRoutine('a')],
    ['addTask', () => st().addTask('a', 't', 10)],
    ['updateTask', () => st().updateTask('a', 'b', 't', 10)],
    ['deleteTask', () => st().deleteTask('a', 'b')],
    ['reorderTasks', () => st().reorderTasks('a', [...st().routines[0].tasks].reverse())],
    ['reorderRoutines', () => st().reorderRoutines([...st().routines])],
    ['importRoutines', () => st().importRoutines([], false)],
  ]
  for (const [name, fn] of cases) {
    it(`${name} sets localEdited`, () => {
      fn()
      expect(st().localEdited).toBe(true)
    })
  }

  it('replaceFromSync replaces routines without touching localEdited', () => {
    const next = seed()
    st().replaceFromSync(next)
    expect(st().routines).toBe(next)
    expect(st().localEdited).toBe(false)
  })

  it('replaceFromSync with markEdited sets localEdited', () => {
    st().replaceFromSync([], { markEdited: true })
    expect(st().localEdited).toBe(true)
  })

  it('clearLocal empties routines and resets localEdited', () => {
    useRoutineStore.setState({ localEdited: true })
    st().clearLocal()
    expect(st().routines).toEqual([])
    expect(st().localEdited).toBe(false)
  })

  it('addRoutine creates UUID ids', () => {
    st().addRoutine('x')
    const r = st().routines.at(-1)!
    expect(r.id).toMatch(/^[0-9a-f-]{36}$/)
  })
})

describe('routineStore persist migration v0 → v1', () => {
  it('marks existing non-seed data as edited', async () => {
    const custom: Routine[] = [{ id: 'z', name: '夜', createdAt: 1, tasks: [] }]
    localStorage.setItem('routine-store', JSON.stringify({ state: { routines: custom }, version: 0 }))
    await useRoutineStore.persist.rehydrate()
    expect(useRoutineStore.getState().routines).toEqual(custom)
    expect(useRoutineStore.getState().localEdited).toBe(true)
  })
  it('keeps untouched seed as not edited', async () => {
    localStorage.setItem('routine-store', JSON.stringify({ state: { routines: seed() }, version: 0 }))
    await useRoutineStore.persist.rehydrate()
    expect(useRoutineStore.getState().localEdited).toBe(false)
  })
})
