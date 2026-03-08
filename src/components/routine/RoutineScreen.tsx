import { useState } from 'react'
import { RoutineTimer } from '../timer/RoutineTimer'
import { RoutineList } from './RoutineList'

export function RoutineScreen() {
  const [editing, setEditing] = useState(false)

  if (editing) {
    return <RoutineList onNavigateToTimer={() => setEditing(false)} />
  }

  return <RoutineTimer onEdit={() => setEditing(true)} />
}
