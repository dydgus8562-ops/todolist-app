import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { loginUser, registerUser, getMe } from '@/api/auth.js'
import { useAuthStore } from '@/store/authStore.js'
import { ROUTES } from '@/constants/routes.js'

export function useLogin() {
  const navigate = useNavigate()
  const login = useAuthStore((state) => state.login)

  return useMutation({
    mutationFn: ({ email, password }) => loginUser(email, password),
    onSuccess: (data) => {
      const { token, user } = data.data
      login(token, user)
      navigate(ROUTES.TASKS)
    },
  })
}

export function useRegister() {
  const navigate = useNavigate()

  return useMutation({
    mutationFn: ({ email, password }) => registerUser(email, password),
    onSuccess: () => {
      navigate(ROUTES.LOGIN)
    },
  })
}

export function useMe() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const setUser = useAuthStore((state) => state.setUser)

  return useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const data = await getMe()
      setUser(data.data)
      return data.data
    },
    enabled: isAuthenticated,
  })
}

export function useLogout() {
  const navigate = useNavigate()
  const logout = useAuthStore((state) => state.logout)
  const queryClient = useQueryClient()

  return () => {
    logout()
    queryClient.clear()
    navigate(ROUTES.LOGIN)
  }
}
