import api from './index.js'

export const registerUser = async (email, password) => {
  const response = await api.post('/auth/register', { email, password })
  return response.data
}

export const loginUser = async (email, password) => {
  const response = await api.post('/auth/login', { email, password })
  return response.data
}

export const logoutUser = async () => {
  const response = await api.post('/auth/logout')
  return response.data
}

export const getMe = async () => {
  const response = await api.get('/auth/me')
  return response.data
}
