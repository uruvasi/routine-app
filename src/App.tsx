import { useState } from 'react'
import { BottomNav } from './components/shared/BottomNav'
import { TimerScreen } from './components/timer/TimerScreen'
import { RoutineList } from './components/routine/RoutineList'
import { SettingsScreen } from './components/shared/SettingsScreen'
import type { NavTab } from './types'

export default function App() {
  const [tab, setTab] = useState<NavTab>('timer')

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900">
      <main className="flex-1 overflow-hidden">
        {tab === 'timer' && <TimerScreen />}
        {tab === 'routine' && <RoutineList />}
        {tab === 'settings' && <SettingsScreen />}
      </main>
      <BottomNav active={tab} onChange={setTab} />
    </div>
  )
}
