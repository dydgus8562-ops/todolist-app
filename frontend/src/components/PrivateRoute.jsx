import { Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore.js'
import { ROUTES } from '@/constants/routes.js'

export function PrivateRoute({ children }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.LOGIN} replace />
  }

  return children
}
