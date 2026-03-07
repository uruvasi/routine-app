import { useEffect, useRef } from 'react'

export function useWakeLock(active: boolean) {
  const lockRef = useRef<WakeLockSentinel | null>(null)

  useEffect(() => {
    if (!('wakeLock' in navigator)) return

    if (active) {
      navigator.wakeLock.request('screen').then((lock) => {
        lockRef.current = lock
      }).catch(() => {
        // Wake Lock not available (e.g. page not visible)
      })
    } else {
      lockRef.current?.release().catch(() => {})
      lockRef.current = null
    }

    return () => {
      lockRef.current?.release().catch(() => {})
      lockRef.current = null
    }
  }, [active])
}
