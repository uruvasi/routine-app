import type { NavTab } from '../../types'

interface Props {
  active: NavTab
  onChange: (tab: NavTab) => void
}

const tabs: { id: NavTab; label: string; icon: string }[] = [
  { id: 'countdown', label: 'タイマー', icon: '⏱' },
  { id: 'routine', label: 'ルーティン', icon: '📋' },
  { id: 'settings', label: '設定', icon: '⚙️' },
]

export function BottomNav({ active, onChange }: Props) {
  return (
    <nav className="flex border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 safe-b">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`flex-1 flex flex-col items-center gap-0.5 py-2 text-xs transition-colors ${
            active === tab.id
              ? 'text-indigo-500'
              : 'text-gray-400 dark:text-gray-500'
          }`}
        >
          <span className="text-xl leading-none">{tab.icon}</span>
          <span>{tab.label}</span>
        </button>
      ))}
    </nav>
  )
}
