import { useState, useRef, useEffect } from 'react'
import { useAuthStore } from '@/store/authStore.js'
import { useLogout } from '@/hooks/useAuth.js'
import { useTranslation, LANGUAGES } from '@/i18n/index.js'
import { useDarkModeStore } from '@/store/darkModeStore.js'

export function Header({ onMenuToggle }) {
  const user = useAuthStore((state) => state.user)
  const logout = useLogout()
  const { language, setLanguage, t } = useTranslation()
  const { isDarkMode, toggleDarkMode } = useDarkModeStore()
  const [isLangOpen, setIsLangOpen] = useState(false)
  const langRef = useRef(null)

  //Outside클릭 시 드롭박스 닫기
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (langRef.current && !langRef.current.contains(e.target)) {
        setIsLangOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const currentLang = LANGUAGES.find((l) => l.code === language)

  return (
    <header className="flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4 lg:px-6 dark:bg-slate-800 dark:border-slate-700">
      <div className="flex items-center gap-3">
        <button
          aria-label={t('nav.menu')}
          onClick={onMenuToggle}
          className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 lg:hidden dark:text-slate-300 dark:hover:bg-slate-700"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <span className="text-lg font-bold text-slate-900 dark:text-white">{t('app.name')}</span>
      </div>
      <div className="flex items-center gap-3">
        {user?.email && (
          <span className="hidden text-sm text-slate-500 dark:text-slate-400 sm:block">{user.email}</span>
        )}

        {/* 다크 모드 토글 버튼 */}
        <button
          onClick={toggleDarkMode}
          aria-label={isDarkMode ? '라이트 모드로 변경' : '다크 모드로 변경'}
          className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
        >
          {isDarkMode ? (
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          ) : (
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          )}
        </button>

        {/* 언어 선택 드롭박스 */}
        <div className="relative" ref={langRef}>
          <button
            onClick={() => setIsLangOpen(!isLangOpen)}
            className="flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1.5 text-sm text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
            aria-label="언어 선택"
            aria-expanded={isLangOpen}
          >
            <span>{currentLang?.nativeName}</span>
            <svg
              className={`h-4 w-4 transition-transform ${isLangOpen ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {isLangOpen && (
            <div className="absolute right-0 top-full z-50 mt-1 w-28 overflow-hidden rounded-md border border-slate-200 bg-white shadow-lg dark:border-slate-600 dark:bg-slate-800">
              {LANGUAGES.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => {
                    setLanguage(lang.code)
                    setIsLangOpen(false)
                  }}
                  className={`w-full px-3 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-700 ${
                    language === lang.code
                      ? 'bg-slate-100 font-medium text-blue-600 dark:bg-slate-700'
                      : 'text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {lang.nativeName}
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={logout}
          className="rounded-md border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
        >
          {t('auth.logout')}
        </button>
      </div>
    </header>
  )
}