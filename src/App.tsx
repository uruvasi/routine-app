import { useState, useEffect } from 'react'
import { BottomNav } from './components/shared/BottomNav'
import { NowPlayingBar } from './components/shared/NowPlayingBar'
import { CountdownTimer } from './components/timer/CountdownTimer'
import { RoutineScreen } from './components/routine/RoutineScreen'
import { SettingsScreen } from './components/shared/SettingsScreen'
import { useTimer } from './hooks/useTimer'
import { useWakeLock } from './hooks/useWakeLock'
import { useTimerStore } from './store/timerStore'
import { useSettingsStore } from './store/settingsStore'
import type { NavTab } from './types'

export default function App() {
  const [tab, setTab] = useState<NavTab>('countdown')
  const theme = useSettingsStore((s) => s.theme)

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [theme])
  const status = useTimerStore((s) => s.status)
  const remaining = useTimerStore((s) => s.remaining)
  const total = useTimerStore((s) => s.total)
  useTimer()
  useWakeLock(status === 'running')

  const progress = total > 0 ? ((total - remaining) / total) * 100 : 0

  return (
    <div className="flex flex-col h-full bg-surface text-on-surface">
      <header className="flex-shrink-0 bg-surface/80 backdrop-blur-xl">
        {/* Progress bar */}
        <div className="h-1 bg-surface-container-highest w-full">
          <div
            className="h-full bg-primary-container transition-all duration-500"
            style={{
              width: `${progress}%`,
              boxShadow: progress > 0 ? '0 0 12px rgba(94,92,230,0.4)' : 'none',
            }}
          />
        </div>
        <div className="flex items-center justify-between px-6 h-12">
          <span className="font-headline font-extrabold tracking-tighter text-lg text-primary">
            Routine
          </span>
          <span className="text-xs text-outline">v{__APP_VERSION__}</span>
        </div>
      </header>

      <main className="flex-1 overflow-hidden">
        {tab === 'countdown' && <CountdownTimer />}
        {tab === 'routine' && <RoutineScreen />}
        {tab === 'settings' && <SettingsScreen />}
      </main>

      <NowPlayingBar onNavigate={setTab} />
      <BottomNav active={tab} onChange={setTab} />
    </div>
  )
}
