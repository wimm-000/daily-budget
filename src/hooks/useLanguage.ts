import { useTranslation } from 'react-i18next'
import { supportedLanguages, languageNames, type Language } from '@/i18n'

export function useLanguage() {
  const { i18n } = useTranslation()

  const language = (i18n.language?.split('-')[0] || 'en') as Language
  const currentLanguage = supportedLanguages.includes(language) ? language : 'en'

  const setLanguage = (lang: Language) => {
    i18n.changeLanguage(lang)
  }

  return {
    language: currentLanguage,
    setLanguage,
    languages: supportedLanguages,
    languageNames,
  }
}
