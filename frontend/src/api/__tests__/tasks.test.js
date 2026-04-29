import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import MockAdapter from 'axios-mock-adapter'
import api from '../index.js'
import { getTasks, createTask, updateTask, deleteTask, completeTask, uncompleteTask } from '../tasks.js'

describe('Tasks API', () => {
  let mock

  beforeEach(() => {
    mock = new MockAdapter(api)
  })

  afterEach(() => {
    mock.restore()
  })

  it('getTasks - GET /tasks 호출', async () => {
    const mockResponse = { success: true, data: [] }
    mock.onGet('/tasks').reply(200, mockResponse)

    const result = await getTasks()
    expect(result).toEqual(mockResponse)
  })

  it('getTasks - 필터 파라미터를 query string으로 전달한다', async () => {
    mock.onGet('/tasks').reply(200, { success: true, data: [] })

    await getTasks({ status: 'PENDING', categoryId: 1 })
    expect(mock.history.get[0].params).toEqual({ status: 'PENDING', categoryId: 1 })
  })

  it('createTask - POST /tasks에 데이터 전송', async () => {
    const taskData = { title: '테스트 할일', description: '설명' }
    const mockResponse = { success: true, data: { id: 1, ...taskData } }
    mock.onPost('/tasks').reply(201, mockResponse)

    const result = await createTask(taskData)
    expect(result).toEqual(mockResponse)
    expect(JSON.parse(mock.history.post[0].data).title).toBe('테스트 할일')
  })

  it('updateTask - PATCH /tasks/:id에 데이터 전송', async () => {
    const mockResponse = { success: true, data: { id: 1, title: '수정됨' } }
    mock.onPatch('/tasks/1').reply(200, mockResponse)

    const result = await updateTask(1, { title: '수정됨' })
    expect(result).toEqual(mockResponse)
  })

  it('deleteTask - DELETE /tasks/:id 호출', async () => {
    mock.onDelete('/tasks/1').reply(200, { success: true, data: null })

    await deleteTask(1)
    expect(mock.history.delete[0].url).toBe('/tasks/1')
  })

  it('completeTask - PATCH /tasks/:id/complete 호출', async () => {
    const mockResponse = { success: true, data: { id: 1, status: 'COMPLETED' } }
    mock.onPatch('/tasks/1/complete').reply(200, mockResponse)

    const result = await completeTask(1)
    expect(result).toEqual(mockResponse)
    expect(mock.history.patch[0].url).toBe('/tasks/1/complete')
  })

  it('uncompleteTask - PATCH /tasks/:id/reopen 호출', async () => {
    const mockResponse = { success: true, data: { id: 1, status: 'PENDING' } }
    mock.onPatch('/tasks/1/reopen').reply(200, mockResponse)

    const result = await uncompleteTask(1)
    expect(result).toEqual(mockResponse)
    expect(mock.history.patch[0].url).toBe('/tasks/1/reopen')
  })
})
