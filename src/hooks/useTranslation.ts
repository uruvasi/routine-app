import { useSettingsStore } from '../store/settingsStore'
import { translations } from '../i18n/translations'

export function useTranslation() {
  const lang = useSettingsStore((s) => s.lang)
  return { t: translations[lang], lang }
}
