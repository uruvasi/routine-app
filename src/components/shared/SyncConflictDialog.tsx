import { useState } from 'react'
import { useSyncStore } from '../../store/syncStore'
import { useRoutineStore } from '../../store/routineStore'
import { useTranslation } from '../../hooks/useTranslation'
import { resolveConflict } from '../../sync/engine'

/** Blocking choice when local and cloud data diverge; it has no cancel on purpose. */
export function SyncConflictDialog() {
  const conflict = useSyncStore((s) => s.conflict)
  const localCount = useRoutineStore((s) => s.routines.length)
  const { t } = useTranslation()
  const [busy, setBusy] = useState(false)
  if (!conflict) return null

  const choose = async (choice: 'use-local' | 'use-remote') => {
    setBusy(true)
    try {
      await resolveConflict(choice)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 px-4 pb-6">
      <div className="w-full max-w-sm flex flex-col gap-4 p-6 rounded-2xl bg-surface shadow-2xl">
        <h3 className="font-headline font-bold text-lg text-on-surface">
          {conflict.kind === 'initial' ? t.conflictTitleInitial : t.conflictTitleRevision}
        </h3>
        <p className="text-sm text-on-surface">{t.conflictCounts(localCount, conflict.remote.routines.length)}</p>
        <p className="text-xs text-outline">{t.conflictBody}</p>
        <div className="flex flex-col gap-2">
          <button
            disabled={busy}
            onClick={() => choose('use-remote')}
            className="py-3 rounded-full text-sm font-headline font-medium whitespace-nowrap bg-gradient-to-b from-primary-container to-primary text-on-primary disabled:opacity-50"
          >
            {t.useRemote}
          </button>
          <button
            disabled={busy}
            onClick={() => choose('use-local')}
            className="py-3 rounded-full text-sm font-headline font-medium whitespace-nowrap bg-surface-container-highest text-on-surface disabled:opacity-50"
          >
            {t.useLocal}
          </button>
        </div>
      </div>
    </div>
  )
}
