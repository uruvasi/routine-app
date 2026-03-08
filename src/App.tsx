import { useState } from 'react'
import { BottomNav } from './components/shared/BottomNav'
import { CountdownTimer } from './components/timer/CountdownTimer'
import { RoutineScreen } from './components/routine/RoutineScreen'
import { SettingsScreen } from './components/shared/SettingsScreen'
import { useTimer } from './hooks/useTimer'
import { useWakeLock } from './hooks/useWakeLock'
import { useTimerStore } from './store/timerStore'
import type { NavTab } from './types'

export default function App() {
  const [tab, setTab] = useState<NavTab>('countdown')
  const status = useTimerStore((s) => s.status)
  useTimer()
  useWakeLock(status === 'running')

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900">
      <main className="flex-1 overflow-hidden">
        {tab === 'countdown' && <CountdownTimer />}
        {tab === 'routine' && <RoutineScreen />}
        {tab === 'settings' && <SettingsScreen />}
      </main>
      <BottomNav active={tab} onChange={setTab} />
    </div>
  )
}
