import { create } from 'zustand'

const DARK_MODE_KEY = 'darkMode'

// localStorage에서 다크 모드 설정 로드
function loadDarkMode() {
  if (typeof window === 'undefined') return false
  const stored = localStorage.getItem(DARK_MODE_KEY)
  if (stored !== null) return stored === 'true'
  // 기본값: 시스템 설정 감지
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches || false
}

export const useDarkModeStore = create((set, get) => ({
  isDarkMode: loadDarkMode(),

  toggleDarkMode: () => {
    const newValue = !get().isDarkMode
    localStorage.setItem(DARK_MODE_KEY, String(newValue))
    set({ isDarkMode: newValue })
  },

  setDarkMode: (value) => {
    localStorage.setItem(DARK_MODE_KEY, String(value))
    set({ isDarkMode: value })
  },
}))