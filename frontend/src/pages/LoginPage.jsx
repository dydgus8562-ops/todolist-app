import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useLogin } from '@/hooks/useAuth.js'
import { useAuthStore } from '@/store/authStore.js'
import { useTranslation } from '@/i18n/index.js'
import { Button } from '@/components/common/Button.jsx'
import { Input } from '@/components/common/Input.jsx'
import { ROUTES } from '@/constants/routes.js'
import { isValidEmail } from '@/utils/validators.js'

export function LoginPage() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const { t } = useTranslation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState({})
  const { mutate: login, isPending, error: serverError } = useLogin()

  if (isAuthenticated) {
    return <Navigate to={ROUTES.TASKS} replace />
  }

  function validate() {
    const next = {}
    if (!email) next.email = '이메일을 입력해주세요...........!!!!!?????@@@@@!!!!!'
    else if (!isValidEmail(email)) next.email = '올바른 이메일 형식을 입력해주세요.'
    if (!password) next.password = '비밀번호를 입력해주세요.'
    else if (password.length < 8) next.password = '비밀번호는 최소 8자 이상이어야 합니다.'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!validate()) return
    login({ email, password })
  }

  const serverMessage = serverError?.response?.data?.error?.message || serverError?.message

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-8 shadow-sm">
        <h1 className="mb-6 text-center text-2xl font-bold text-slate-900">{t('auth.login')}</h1>
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
          <Input
            label={t('auth.email')}
            type="email"
            placeholder="user@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={errors.email}
            required
          />
          <Input
            label={t('auth.password')}
            type="password"
            placeholder="비밀번호를 입력하세요"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={errors.password}
            required
          />
          {serverMessage && (
            <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-600">{serverMessage}</p>
          )}
          <Button type="submit" isLoading={isPending} disabled={isPending} className="mt-2 w-full">
            {t('auth.loginButton')}
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-slate-500">
          {t('auth.noAccount')}{' '}
          <Link to={ROUTES.REGISTER} className="text-blue-600 hover:underline">
            {t('auth.registerLink')}
          </Link>
        </p>
      </div>
    </div>
  )
}