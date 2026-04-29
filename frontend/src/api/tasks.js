import api from './index.js'

export const getTasks = async (filters = {}) => {
  const response = await api.get('/tasks', { params: filters })
  return response.data
}

export const createTask = async (taskData) => {
  const response = await api.post('/tasks', taskData)
  return response.data
}

export const updateTask = async (id, taskData) => {
  const response = await api.patch(`/tasks/${id}`, taskData)
  return response.data
}

export const deleteTask = async (id) => {
  const response = await api.delete(`/tasks/${id}`)
  return response.data
}

export const completeTask = async (id) => {
  const response = await api.patch(`/tasks/${id}/complete`)
  return response.data
}

export const uncompleteTask = async (id) => {
  const response = await api.patch(`/tasks/${id}/reopen`)
  return response.data
}
