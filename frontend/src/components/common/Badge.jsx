import { TASK_STATUS } from '@/constants/taskStatus.js'

const STATUS_STYLES = {
  [TASK_STATUS.PENDING]: {
    bg: 'bg-slate-100',
    text: 'text-slate-600',
    label: '대기중',
  },
  [TASK_STATUS.COMPLETED]: {
    bg: 'bg-emerald-100',
    text: 'text-emerald-700',
    label: '완료',
  },
  [TASK_STATUS.OVERDUE]: {
    bg: 'bg-rose-100',
    text: 'text-rose-700',
    label: '기한 초과',
  },
}

export function Badge({ status }) {
  const style = STATUS_STYLES[status] || STATUS_STYLES[TASK_STATUS.PENDING]

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${style.bg} ${style.text}`}
    >
      {style.label}
    </span>
  )
}