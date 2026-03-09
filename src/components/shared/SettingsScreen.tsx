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
    <div className="flex flex-col h-full px-4 py-6 gap-4">
      <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">{t.settingsTitle}</h2>

      <div className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700">
        <div className="px-4 py-3 flex justify-between items-center">
          <span className="text-sm text-gray-700 dark:text-gray-300">{t.language}</span>
          <div className="flex gap-1">
            <button
              onClick={() => setLang('ja')}
              className={`px-3 py-1 rounded-lg text-sm ${lang === 'ja' ? 'bg-indigo-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}
            >
              日本語
            </button>
            <button
              onClick={() => setLang('en')}
              className={`px-3 py-1 rounded-lg text-sm ${lang === 'en' ? 'bg-indigo-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}
            >
              English
            </button>
          </div>
        </div>
        <div className="px-4 py-3 flex justify-between items-center">
          <span className="text-sm text-gray-700 dark:text-gray-300">{t.versionLabel}</span>
          <span className="text-sm text-gray-400">{__APP_VERSION__}</span>
        </div>
        <div className="px-4 py-3 flex justify-between items-center">
          <span className="text-sm text-gray-700 dark:text-gray-300">{t.dataStorageLabel}</span>
          <span className="text-sm text-gray-400">{t.dataStorageValue}</span>
        </div>
      </div>

      <div className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700">
        <button
          className="w-full px-4 py-3 text-sm text-gray-700 dark:text-gray-300 text-left flex justify-between items-center"
          onClick={handleExport}
          disabled={routines.length === 0}
        >
          <span>{t.exportRoutines}</span>
          <span className="text-xs text-gray-400">.md</span>
        </button>
        <button
          className="w-full px-4 py-3 text-sm text-gray-700 dark:text-gray-300 text-left flex justify-between items-center"
          onClick={() => { setShowImportOptions((v) => !v); setImportResult(null) }}
        >
          <span>{t.importRoutines}</span>
          <span className="text-xs text-gray-400">.md</span>
        </button>
        {showImportOptions && (
          <div className="px-4 pb-3 flex gap-2">
            <button
              className="flex-1 py-1.5 rounded-lg text-xs border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300"
              onClick={() => openFilePicker(false)}
            >
              {t.importAdd}
            </button>
            <button
              className="flex-1 py-1.5 rounded-lg text-xs border border-red-200 dark:border-red-800 text-red-500 dark:text-red-400"
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
        <p className="text-sm text-center text-indigo-500 dark:text-indigo-400">{importResult}</p>
      )}

      <div className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
        <button
          className="w-full px-4 py-3 text-sm text-red-500 text-left"
          onClick={() => {
            if (confirm(t.resetConfirm)) {
              localStorage.clear()
              location.reload()
            }
          }}
        >
          {t.resetData}
        </button>
      </div>
    </div>
  )
}
