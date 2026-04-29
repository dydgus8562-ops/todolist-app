import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import MockAdapter from 'axios-mock-adapter'
import api from '../index.js'
import { getCategories, createCategory, updateCategory, deleteCategory } from '../categories.js'

describe('Categories API', () => {
  let mock

  beforeEach(() => {
    mock = new MockAdapter(api)
  })

  afterEach(() => {
    mock.restore()
  })

  it('getCategories - GET /categories 호출', async () => {
    const mockResponse = { success: true, data: [{ id: 1, name: '업무' }] }
    mock.onGet('/categories').reply(200, mockResponse)

    const result = await getCategories()
    expect(result).toEqual(mockResponse)
    expect(mock.history.get[0].url).toBe('/categories')
  })

  it('createCategory - POST /categories에 name 전송', async () => {
    const mockResponse = { success: true, data: { id: 2, name: '개인' } }
    mock.onPost('/categories').reply(201, mockResponse)

    const result = await createCategory('개인')
    expect(result).toEqual(mockResponse)
    expect(JSON.parse(mock.history.post[0].data).name).toBe('개인')
  })

  it('updateCategory - PATCH /categories/:id에 name 전송', async () => {
    const mockResponse = { success: true, data: { id: 1, name: '수정됨' } }
    mock.onPatch('/categories/1').reply(200, mockResponse)

    const result = await updateCategory(1, '수정됨')
    expect(result).toEqual(mockResponse)
    expect(JSON.parse(mock.history.patch[0].data).name).toBe('수정됨')
  })

  it('deleteCategory - DELETE /categories/:id 호출', async () => {
    mock.onDelete('/categories/1').reply(200, { success: true, data: null })

    await deleteCategory(1)
    expect(mock.history.delete[0].url).toBe('/categories/1')
  })
})
