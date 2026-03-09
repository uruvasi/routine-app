import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Lang } from '../i18n/translations'

interface SettingsStore {
  lang: Lang
  setLang: (lang: Lang) => void
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      lang: 'ja',
      setLang: (lang) => set({ lang }),
    }),
    { name: 'settings-store' }
  )
)
