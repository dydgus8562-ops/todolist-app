import { create } from 'zustand'
import { ko } from './locales/ko.js'
import { en } from './locales/en.js'
import { ja } from './locales/ja.js'

const LANGUAGE_KEY = 'language'

// 브라우저 기본 언어 감지
function getBrowserLanguage() {
  if (typeof window === 'undefined') return 'ko'
  const browserLang = navigator.language.slice(0, 2)
  const supported = ['ko', 'en', 'ja']
  return supported.includes(browserLang) ? browserLang : 'ko'
}

// localStorage에서 언어 설정 로드
function loadLanguage() {
  if (typeof window === 'undefined') return 'ko'
  return localStorage.getItem(LANGUAGE_KEY) || getBrowserLanguage()
}

// 모든 번역 파일을 하나의 객체로
const allTranslations = { ko, en, ja }

export const useI18nStore = create((set, get) => ({
  // 현재 언어
  language: loadLanguage(),
  
  // translation 객체를 직접 저장하지 않고 language에서 파생
  // 이러면 language가 변경되면 자동으로 새 translation 참조가 생성됨
  getTranslation: () => {
    const lang = get().language
    return allTranslations[lang]?.translation || allTranslations.ko.translation
  },

  setLanguage: (lang) => {
    if (!allTranslations[lang]) return
    localStorage.setItem(LANGUAGE_KEY, lang)
    set({ language: lang })
  },
}))

// Helper Hook: 모든 컴포넌트에서 사용
export function useTranslation() {
  const language = useI18nStore((state) => state.language)
  const setLanguage = useI18nStore((state) => state.setLanguage)
  
  // language가 변경될 때마다 새 translation 객체 획득
  const translation = useI18nStore((state) => state.getTranslation())
  
  const t = (key) => {
    const keys = key.split('.')
    let value = translation
    for (const k of keys) {
      value = value?.[k]
    }
    return value || key
  }
  
  return { language, setLanguage, t }
}

// 사용 가능한 언어 목록
export const LANGUAGES = [
  { code: 'ko', name: '한국어', nativeName: '한국어' },
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'ja', name: '日本語', nativeName: '日本語' },
]