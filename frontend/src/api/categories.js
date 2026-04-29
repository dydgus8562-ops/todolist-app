import api from './index.js'

export const getCategories = async () => {
  const response = await api.get('/categories')
  return response.data
}

export const createCategory = async (name) => {
  const response = await api.post('/categories', { name })
  return response.data
}

export const updateCategory = async (id, name) => {
  const response = await api.patch(`/categories/${id}`, { name })
  return response.data
}

export const deleteCategory = async (id) => {
  const response = await api.delete(`/categories/${id}`)
  return response.data
}
