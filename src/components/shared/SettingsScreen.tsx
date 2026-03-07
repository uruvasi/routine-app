import { useRef, useState } from 'react'
import { useRoutineStore } from '../../store/routineStore'
import { exportToMarkdown, importFromMarkdown } from '../../utils/routineMarkdown'

export function SettingsScreen() {
  const { routines, importRoutines } = useRoutineStore()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [importResult, setImportResult] = useState<string | null>(null)

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

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string
      const imported = importFromMarkdown(text)
      if (imported.length === 0) {
        setImportResult('読み込めるルーティンがありませんでした')
        return
      }
      importRoutines(imported)
      setImportResult(`${imported.length}件のルーティンを追加しました`)
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  return (
    <div className="flex flex-col h-full px-4 py-6 gap-4">
      <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">設定</h2>

      <div className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700">
        <div className="px-4 py-3 flex justify-between items-center">
          <span className="text-sm text-gray-700 dark:text-gray-300">バージョン</span>
          <span className="text-sm text-gray-400">1.0.0</span>
        </div>
        <div className="px-4 py-3 flex justify-between items-center">
          <span className="text-sm text-gray-700 dark:text-gray-300">データ保存先</span>
          <span className="text-sm text-gray-400">ローカル</span>
        </div>
      </div>

      <div className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700">
        <button
          className="w-full px-4 py-3 text-sm text-gray-700 dark:text-gray-300 text-left flex justify-between items-center"
          onClick={handleExport}
          disabled={routines.length === 0}
        >
          <span>ルーティンをエクスポート</span>
          <span className="text-xs text-gray-400">.md</span>
        </button>
        <button
          className="w-full px-4 py-3 text-sm text-gray-700 dark:text-gray-300 text-left flex justify-between items-center"
          onClick={() => { setImportResult(null); fileInputRef.current?.click() }}
        >
          <span>ルーティンをインポート</span>
          <span className="text-xs text-gray-400">.md</span>
        </button>
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
            if (confirm('全データを削除しますか？')) {
              localStorage.clear()
              location.reload()
            }
          }}
        >
          データをリセット
        </button>
      </div>
    </div>
  )
}
