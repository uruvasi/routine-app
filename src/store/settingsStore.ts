import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Lang } from '../i18n/translations'

export type Theme = 'light' | 'dark'

interface SettingsStore {
  lang: Lang
  setLang: (lang: Lang) => void
  theme: Theme
  setTheme: (theme: Theme) => void
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      lang: 'ja',
      setLang: (lang) => set({ lang }),
      theme: 'light',
      setTheme: (theme) => set({ theme }),
    }),
    { name: 'settings-store' }
  )
)
