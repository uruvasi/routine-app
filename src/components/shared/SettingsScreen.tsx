export function SettingsScreen() {
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
