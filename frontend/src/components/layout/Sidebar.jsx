import { useTranslation } from '@/i18n/index.js'

const STATUS_FILTERS = [
  { labelKey: 'tasks.status.all', value: null },
  { labelKey: 'tasks.status.pending', value: 'PENDING' },
  { labelKey: 'tasks.status.completed', value: 'COMPLETED' },
  { labelKey: 'tasks.status.overdue', value: 'OVERDUE' },
]

export function Sidebar({ isOpen, onClose, activeStatus, onStatusChange, categorySlot }) {
  const { t } = useTranslation()
  
  return (
    <>
      {/* 모바일 오버레이 */}
      {isOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/30 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* 사이드바 본체 */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 flex w-60 flex-col bg-white shadow-lg transition-transform duration-200 lg:static lg:shadow-none lg:translate-x-0 dark:bg-slate-800 dark:shadow-slate-900 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* 모바일 닫기 버튼 */}
        <div className="flex h-14 items-center justify-between border-b border-slate-200 px-4 lg:hidden dark:border-slate-700">
          <span className="font-semibold text-slate-700 dark:text-slate-200">메뉴</span>
          <button
            onClick={onClose}
            aria-label="메뉴 닫기"
            className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-4">
          {/* 카테고리 슬롯 (FE-08에서 채워짐) */}
          {categorySlot && (
            <section className="mb-6">
              <h2 className="mb-2 px-2 text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                {t('categories.title')}
              </h2>
              {categorySlot}
            </section>
          )}

          {/* 상태 필터 */}
          <section>
            <h2 className="mb-2 px-2 text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              {t('tasks.status.all')}
            </h2>
            <ul className="flex flex-col gap-1">
              {STATUS_FILTERS.map(({ labelKey, value }) => (
                <li key={labelKey}>
                  <button
                    onClick={() => onStatusChange(value)}
                    className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                      activeStatus === value
                        ? 'bg-slate-100 font-medium text-slate-900 dark:bg-slate-700 dark:text-slate-100'
                        : 'text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-700'
                    }`}
                  >
                    {t(labelKey)}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </aside>
    </>
  )
}