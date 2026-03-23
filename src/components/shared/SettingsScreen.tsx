import { useRef, useState } from 'react'
import { useRoutineStore } from '../../store/routineStore'
import { useSettingsStore } from '../../store/settingsStore'
import { useTranslation } from '../../hooks/useTranslation'
import { exportToMarkdown, importFromMarkdown } from '../../utils/routineMarkdown'

export function SettingsScreen() {
  const { routines, importRoutines } = useRoutineStore()
  const { lang, setLang } = useSettingsStore()
  const { t } = useTranslation()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [importResult, setImportResult] = useState<string | null>(null)
  const [showImportOptions, setShowImportOptions] = useState(false)
  const importReplaceRef = useRef(false)

  const handleExport = () => {
    const text = exportToMarkdown(routines)
    const blob = new Blob([text], { type: 'text/markdown; charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    const date = new Date().toISOString().slice(0, 10)
    a.href = url
    a.download = `routines-${date}.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  const openFilePicker = (replace: boolean) => {
    importReplaceRef.current = replace
    setShowImportOptions(false)
    setImportResult(null)
    fileInputRef.current?.click()
  }

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string
      const imported = importFromMarkdown(text)
      if (imported.length === 0) {
        setImportResult(t.importEmptyMsg)
        return
      }
      importRoutines(imported, importReplaceRef.current)
      setImportResult(
        importReplaceRef.current
          ? t.importReplacedMsg(imported.length)
          : t.importAddedMsg(imported.length)
      )
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto px-5 py-6 gap-5">
      <div>
        <p className="text-xs uppercase tracking-widest text-outline font-headline mb-1">Fine-tune your experience</p>
        <h2 className="font-headline font-bold text-2xl text-on-surface">{t.settingsTitle}</h2>
      </div>

      {/* General settings */}
      <div className="flex flex-col gap-3">
        {/* Language */}
        <div className="flex items-center justify-between px-4 py-4 rounded-2xl bg-surface-container-low">
          <span className="text-sm font-headline font-medium text-on-surface">{t.language}</span>
          <div className="flex gap-1 bg-surface-container-highest rounded-full p-0.5">
            <button
              onClick={() => setLang('ja')}
              className={`px-3 py-1.5 rounded-full text-sm font-headline font-medium transition-all ${
                lang === 'ja'
                  ? 'bg-primary-container text-on-primary'
                  : 'text-on-surface-variant'
              }`}
            >
              日本語
            </button>
            <button
              onClick={() => setLang('en')}
              className={`px-3 py-1.5 rounded-full text-sm font-headline font-medium transition-all ${
                lang === 'en'
                  ? 'bg-primary-container text-on-primary'
                  : 'text-on-surface-variant'
              }`}
            >
              English
            </button>
          </div>
        </div>

        {/* Version */}
        <div className="flex items-center justify-between px-4 py-4 rounded-2xl bg-surface-container-low">
          <span className="text-sm font-headline font-medium text-on-surface">{t.versionLabel}</span>
          <span className="text-sm text-primary font-headline font-semibold">{__APP_VERSION__}</span>
        </div>

        {/* Storage */}
        <div className="flex items-center justify-between px-4 py-4 rounded-2xl bg-surface-container-low">
          <span className="text-sm font-headline font-medium text-on-surface">{t.dataStorageLabel}</span>
          <span className="text-sm text-outline font-headline">{t.dataStorageValue}</span>
        </div>
      </div>

      {/* Data section */}
      <div className="flex flex-col gap-3">
        <p className="text-xs uppercase tracking-widest text-outline font-headline px-1">Data</p>

        <button
          className="flex items-center justify-between px-4 py-4 rounded-2xl bg-surface-container-low active:scale-[0.98] transition-all"
          onClick={handleExport}
          disabled={routines.length === 0}
        >
          <span className="text-sm font-headline font-medium text-on-surface">{t.exportRoutines}</span>
          <span className="text-xs text-outline font-headline">.md</span>
        </button>

        <button
          className="flex items-center justify-between px-4 py-4 rounded-2xl bg-surface-container-low active:scale-[0.98] transition-all"
          onClick={() => { setShowImportOptions((v) => !v); setImportResult(null) }}
        >
          <span className="text-sm font-headline font-medium text-on-surface">{t.importRoutines}</span>
          <span className="text-xs text-outline font-headline">.md</span>
        </button>

        {showImportOptions && (
          <div className="flex gap-2 px-1">
            <button
              className="flex-1 py-2.5 rounded-full text-sm font-headline font-medium bg-surface-container-highest text-on-surface-variant active:scale-[0.98] transition-all"
              onClick={() => openFilePicker(false)}
            >
              {t.importAdd}
            </button>
            <button
              className="flex-1 py-2.5 rounded-full text-sm font-headline font-medium bg-red-50 text-red-500 active:scale-[0.98] transition-all"
              onClick={() => openFilePicker(true)}
            >
              {t.importReplace}
            </button>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept=".md,text/markdown,text/plain"
          className="hidden"
          onChange={handleImport}
        />
      </div>

      {importResult && (
        <p className="text-sm text-center text-primary font-headline">{importResult}</p>
      )}

      {/* Danger zone */}
      <div>
        <p className="text-xs uppercase tracking-widest text-outline font-headline px-1 mb-3">Danger Zone</p>
        <button
          className="w-full flex items-center justify-between px-4 py-4 rounded-2xl bg-red-50 active:scale-[0.98] transition-all"
          onClick={() => {
            if (confirm(t.resetConfirm)) {
              localStorage.clear()
              location.reload()
            }
          }}
        >
          <span className="text-sm font-headline font-medium text-red-500">{t.resetData}</span>
          <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current text-red-400">
            <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
          </svg>
        </button>
      </div>
    </div>
  )
}
