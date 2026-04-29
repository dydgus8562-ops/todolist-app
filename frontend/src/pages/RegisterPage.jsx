import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useRegister } from '@/hooks/useAuth.js'
import { useAuthStore } from '@/store/authStore.js'
import { useTranslation } from '@/i18n/index.js'
import { Button } from '@/components/common/Button.jsx'
import { Input } from '@/components/common/Input.jsx'
import { ROUTES } from '@/constants/routes.js'
import { isValidEmail, isValidPassword } from '@/utils/validators.js'

export function RegisterPage() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const { t } = useTranslation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [errors, setErrors] = useState({})
  const { mutate: register, isPending, error: serverError } = useRegister()

  if (isAuthenticated) {
    return <Navigate to={ROUTES.TASKS} replace />
  }

  function validate() {
    const next = {}
    if (!email) next.email = '이메일을 입력해주세요.'
    else if (!isValidEmail(email)) next.email = '올바른 이메일 형식을 입력해주세요.'
    if (!password) next.password = '비밀번호를 입력해주세요.'
    else if (!isValidPassword(password))
      next.password = '비밀번호는 영문, 숫자, 특수문자를 포함한 8자 이상이어야 합니다.'
    if (!confirmPassword) next.confirmPassword = '비밀번호 확인을 입력해주세요.'
    else if (password !== confirmPassword) next.confirmPassword = '비밀번호가 일치하지 않습니다.'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!validate()) return
    register({ email, password })
  }

  const serverMessage = serverError?.response?.data?.error?.message || serverError?.message

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-8 shadow-sm">
        <h1 className="mb-6 text-center text-2xl font-bold text-slate-900">{t('auth.register')}</h1>
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
            placeholder="영문, 숫자, 특수문자 포함 8자 이상"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={errors.password}
            required
          />
          <Input
            label={t('auth.confirmPassword')}
            type="password"
            placeholder="비밀번호를 다시 입력하세요"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            error={errors.confirmPassword}
            required
          />
          {serverMessage && (
            <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-600">{serverMessage}</p>
          )}
          <Button type="submit" isLoading={isPending} disabled={isPending} className="mt-2 w-full">
            {t('auth.registerButton')}
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-slate-500">
          {t('auth.hasAccount')}{' '}
          <Link to={ROUTES.LOGIN} className="text-blue-600 hover:underline">
            {t('auth.loginLink')}
          </Link>
        </p>
      </div>
    </div>
  )
}