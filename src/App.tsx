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
      <header className="flex items-center justify-between px-4 py-2 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Routine-App</span>
        <span className="text-xs text-gray-400 dark:text-gray-500">Ver. {__APP_VERSION__}</span>
      </header>
      <main className="flex-1 overflow-hidden">
        {tab === 'countdown' && <CountdownTimer />}
        {tab === 'routine' && <RoutineScreen />}
        {tab === 'settings' && <SettingsScreen />}
      </main>
      <BottomNav active={tab} onChange={setTab} />
    </div>
  )
}
