import { test, expect } from '@playwright/test'

const BASE_URL = 'http://localhost:5173'
const API_URL = 'http://localhost:3000'

const USER_A = { email: 'e2e.chulsu@startup.com', password: 'SecurePass123!' }
const USER_B = { email: 'e2e.soyoung@shoppingmall.com', password: 'SoyoungPass123!' }

async function register(page, email, password) {
  await page.goto(`${BASE_URL}/register`)
  await page.locator('[placeholder="user@example.com"]').fill(email)
  await page.locator('[placeholder="영문, 숫자, 특수문자 포함 8자 이상"]').fill(password)
  await page.locator('[placeholder="비밀번호를 다시 입력하세요"]').fill(password)
  await page.locator('button:has-text("회원가입")').click()
  await page.waitForURL(`${BASE_URL}/login`)
}

async function login(page, email, password) {
  await page.goto(`${BASE_URL}/login`)
  await page.locator('[placeholder="user@example.com"]').fill(email)
  await page.locator('[placeholder="비밀번호를 입력하세요"]').fill(password)
  await page.locator('button:has-text("로그인")').click()
  await page.waitForURL(`${BASE_URL}/`)
}

async function addCategory(page, name) {
  await page.locator('[placeholder="새 카테고리..."]').fill(name)
  await page.evaluate(() => document.querySelector('[aria-label="카테고리 추가"]').click())
  await page.waitForTimeout(500)
}

async function openNewTodoDialog(page) {
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === '+ 새로운 할일 추가')
    btn?.click()
  })
  await page.waitForTimeout(500)
}

// SC-01: 회원가입 정상 흐름
test('SC-01: 회원가입 정상 흐름', async ({ page }) => {
  await page.goto(`${BASE_URL}/register`)
  await page.locator('[placeholder="user@example.com"]').fill(USER_A.email)
  await page.locator('[placeholder="영문, 숫자, 특수문자 포함 8자 이상"]').fill(USER_A.password)
  await page.locator('[placeholder="비밀번호를 다시 입력하세요"]').fill(USER_A.password)
  await page.locator('button:has-text("회원가입")').click()
  await expect(page).toHaveURL(`${BASE_URL}/login`)
})

// SC-02: 회원가입 중복 이메일
test('SC-02: 회원가입 중복 이메일 실패', async ({ page }) => {
  // SC-01이 선행되어야 함 (같은 이메일로 등록된 상태)
  await page.goto(`${BASE_URL}/register`)
  await page.locator('[placeholder="user@example.com"]').fill(USER_A.email)
  await page.locator('[placeholder="영문, 숫자, 특수문자 포함 8자 이상"]').fill('NewPass456!')
  await page.locator('[placeholder="비밀번호를 다시 입력하세요"]').fill('NewPass456!')
  await page.locator('button:has-text("회원가입")').click()
  await page.waitForTimeout(500)
  await expect(page).toHaveURL(`${BASE_URL}/register`)
  // 에러 메시지 표시 확인 (현재 영어로 표시됨 - i18n 이슈)
  await expect(page.locator('text=already')).toBeVisible()
})

// SC-03: 비밀번호 복잡도 부족
test('SC-03: 회원가입 약한 비밀번호 실패', async ({ page }) => {
  await page.goto(`${BASE_URL}/register`)
  await page.locator('[placeholder="user@example.com"]').fill('test@test.com')
  await page.locator('[placeholder="영문, 숫자, 특수문자 포함 8자 이상"]').fill('password123')
  await page.locator('[placeholder="비밀번호를 다시 입력하세요"]').fill('password123')
  await page.locator('button:has-text("회원가입")').click()
  await expect(page).toHaveURL(`${BASE_URL}/register`)
  await expect(page.locator('text=특수문자')).toBeVisible()
})

// SC-04: 로그인 정상 흐름
test('SC-04: 로그인 정상 흐름', async ({ page }) => {
  await login(page, USER_A.email, USER_A.password)
  await expect(page).toHaveURL(`${BASE_URL}/`)
  await expect(page.locator(`text=${USER_A.email}`)).toBeVisible()
  const token = await page.evaluate(() =>
    Object.keys(localStorage).map(k => localStorage.getItem(k)).find(v => v?.startsWith('ey'))
  )
  expect(token).toBeTruthy()
})

// SC-05: 로그인 잘못된 비밀번호
test('SC-05: 로그인 잘못된 비밀번호 실패', async ({ page }) => {
  await page.goto(`${BASE_URL}/login`)
  await page.locator('[placeholder="user@example.com"]').fill(USER_B.email)
  await page.locator('[placeholder="비밀번호를 입력하세요"]').fill('WrongPassword123!')
  await page.locator('button:has-text("로그인")').click()
  await page.waitForTimeout(1000)
  await expect(page).toHaveURL(`${BASE_URL}/login`)
  const token = await page.evaluate(() =>
    Object.keys(localStorage).map(k => localStorage.getItem(k)).find(v => v?.startsWith('ey'))
  )
  expect(token).toBeFalsy()
})

// SC-06: 카테고리 생성 정상
test('SC-06: 카테고리 생성 정상 흐름', async ({ page }) => {
  await login(page, USER_A.email, USER_A.password)
  await addCategory(page, '업무')
  await expect(page.locator('button:has-text("업무")')).toBeVisible()
  await addCategory(page, '개인')
  await expect(page.locator('button:has-text("개인")')).toBeVisible()
})

// SC-07: 카테고리 중복 생성
test('SC-07: 카테고리 중복 이름 실패', async ({ page }) => {
  await login(page, USER_A.email, USER_A.password)
  await addCategory(page, '업무') // 이미 존재하는 카테고리
  await expect(page.locator('text=already')).toBeVisible()
})

// SC-08: 할일 생성 정상
test('SC-08: 할일 생성 정상 흐름', async ({ page }) => {
  await login(page, USER_A.email, USER_A.password)
  await openNewTodoDialog(page)
  await page.locator('[placeholder="할일 제목을 입력하세요"]').fill('주간 장보기')
  await page.locator('[placeholder="상세 설명을 입력하세요 (선택)"]').fill('우유, 계란, 채소 구입')
  await page.evaluate(() => {
    const sel = document.querySelector('select')
    const opt = Array.from(sel.options).find(o => o.text === '업무')
    if (opt) { sel.value = opt.value; sel.dispatchEvent(new Event('change', { bubbles: true })) }
  })
  await page.locator('input[type="datetime-local"]').fill('2026-05-02T18:00')
  await page.locator('button:has-text("생성하기")').click()
  await page.waitForTimeout(500)
  await expect(page.locator('h3:has-text("주간 장보기")')).toBeVisible()
  await expect(page.locator('text=대기중').first()).toBeVisible()
})

// SC-09: 할일 생성 종료일 없음
test('SC-09: 종료일 없는 할일 생성', async ({ page }) => {
  await login(page, USER_A.email, USER_A.password)
  await openNewTodoDialog(page)
  await page.locator('[placeholder="할일 제목을 입력하세요"]').fill('종료일 없는 할일')
  await page.locator('button:has-text("생성하기")').click()
  await page.waitForTimeout(500)
  const item = page.locator('h3:has-text("종료일 없는 할일")').locator('..')
  await expect(item.locator('text=대기중')).toBeVisible()
  // 날짜 배지 없음 확인
  await expect(item.locator('text=📅')).not.toBeVisible()
})

// SC-10: 할일 목록 기한 초과 필터링
test('SC-10: 기한 초과 할일 필터링', async ({ page }) => {
  await login(page, USER_A.email, USER_A.password)
  // 과거 날짜 할일 추가
  await openNewTodoDialog(page)
  await page.locator('[placeholder="할일 제목을 입력하세요"]').fill('과거 기한 할일')
  await page.locator('input[type="datetime-local"]').fill('2020-01-01T00:00')
  await page.locator('button:has-text("생성하기")').click()
  await page.waitForTimeout(500)
  // 기한 초과 필터 클릭
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === '기한 초과')
    btn?.click()
  })
  await page.waitForTimeout(500)
  await expect(page.locator('h3:has-text("과거 기한 할일")')).toBeVisible()
  // 미래 날짜 할일은 필터에서 제외 확인
  await expect(page.locator('h3:has-text("주간 장보기")')).not.toBeVisible()
})

// SC-11: 할일 완료 처리 및 취소
test('SC-11: 할일 완료 처리 및 완료 취소', async ({ page }) => {
  await login(page, USER_A.email, USER_A.password)
  // 완료 처리
  await page.evaluate(() => {
    const h3s = document.querySelectorAll('h3')
    const idx = Array.from(h3s).findIndex(h => h.textContent.includes('주간 장보기'))
    if (idx >= 0) document.querySelectorAll('input[type="checkbox"]')[idx].click()
  })
  await page.waitForTimeout(500)
  const item = page.locator('h3:has-text("주간 장보기")').locator('..')
  await expect(item.locator('text=완료')).toBeVisible()
  // 완료 취소
  await page.evaluate(() => {
    const h3s = document.querySelectorAll('h3')
    const idx = Array.from(h3s).findIndex(h => h.textContent.includes('주간 장보기'))
    if (idx >= 0) document.querySelectorAll('input[type="checkbox"]')[idx].click()
  })
  await page.waitForTimeout(500)
  await expect(item.locator('text=대기중')).toBeVisible()
})

// SC-12: 할일 수정
test('SC-12: 할일 수정', async ({ page }) => {
  await login(page, USER_A.email, USER_A.password)
  await page.evaluate(() => {
    const h3 = Array.from(document.querySelectorAll('h3')).find(h => h.textContent.includes('주간 장보기'))
    if (!h3) return
    let el = h3
    for (let i = 0; i < 8; i++) {
      el = el.parentElement
      const btn = Array.from(el.querySelectorAll('button')).find(b => b.textContent.trim() === '수정')
      if (btn) { btn.click(); return }
    }
  })
  await page.waitForTimeout(500)
  await expect(page.locator('dialog h2:has-text("할일 수정")')).toBeVisible()
  await page.locator('[placeholder="상세 설명을 입력하세요 (선택)"]').fill('우유, 계란, 채소, 과일 구입')
  await page.locator('input[type="datetime-local"]').fill('2026-05-03T18:00')
  await page.locator('button:has-text("수정하기")').click()
  await page.waitForTimeout(500)
  await expect(page.locator('text=우유, 계란, 채소, 과일 구입')).toBeVisible()
})

// SC-13: 할일 삭제
test('SC-13: 할일 삭제', async ({ page }) => {
  await login(page, USER_A.email, USER_A.password)
  await page.evaluate(() => {
    const h3 = Array.from(document.querySelectorAll('h3')).find(h => h.textContent.includes('종료일 없는 할일'))
    if (!h3) return
    let el = h3
    for (let i = 0; i < 8; i++) {
      el = el.parentElement
      const btn = Array.from(el.querySelectorAll('button')).find(b => b.textContent.trim() === '삭제')
      if (btn) { btn.click(); return }
    }
  })
  await page.waitForTimeout(500)
  // 삭제 확인 모달
  await expect(page.locator('dialog h2:has-text("할일 삭제")')).toBeVisible()
  await page.evaluate(() => {
    const modal = document.querySelector('[role="dialog"], dialog')
    const btn = Array.from(modal.querySelectorAll('button')).find(b => b.textContent.trim() === '삭제')
    btn?.click()
  })
  await page.waitForTimeout(500)
  await expect(page.locator('h3:has-text("종료일 없는 할일")')).not.toBeVisible()
})

// SC-14: 카테고리 삭제 및 하위 할일 처리
test('SC-14: 카테고리 삭제 시 하위 할일 미분류 처리', async ({ page }) => {
  await login(page, USER_A.email, USER_A.password)
  // 테스트용 카테고리 생성
  await addCategory(page, 'SC14테스트')
  await openNewTodoDialog(page)
  await page.locator('[placeholder="할일 제목을 입력하세요"]').fill('SC14 할일')
  await page.evaluate(() => {
    const sel = document.querySelector('select')
    const opt = Array.from(sel.options).find(o => o.text === 'SC14테스트')
    if (opt) { sel.value = opt.value; sel.dispatchEvent(new Event('change', { bubbles: true })) }
  })
  await page.locator('button:has-text("생성하기")').click()
  await page.waitForTimeout(500)
  // 카테고리 삭제
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'SC14테스트')
    if (!btn) return
    const li = btn.closest('li')
    const deleteBtn = Array.from(li.querySelectorAll('button')).find(b => b.getAttribute('aria-label')?.includes('삭제'))
    if (deleteBtn) { deleteBtn.style.display = 'block'; deleteBtn.click() }
  })
  await page.waitForTimeout(500)
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('li button')).find(b => b.textContent.trim() === '삭제')
    btn?.click()
  })
  await page.waitForTimeout(500)
  // 카테고리 목록에서 제거 확인
  await expect(page.locator('button:has-text("SC14테스트")')).not.toBeVisible()
  // 하위 할일이 미분류로 변경 확인
  await expect(page.locator('text=SC14 할일')).toBeVisible()
  await expect(page.locator('text=미분류')).toBeVisible()
})

// SC-15: 타인 데이터 접근 차단 (API 레벨)
test('SC-15: 타인 할일 접근 시 접근 거부', async ({ page }) => {
  // 사용자 A 로그인 후 할일 ID 획득
  await login(page, USER_A.email, USER_A.password)
  const userATaskId = await page.evaluate(async () => {
    const token = Object.keys(localStorage).map(k => localStorage.getItem(k)).find(v => v?.startsWith('ey'))
    const res = await fetch('http://localhost:3000/api/tasks', { headers: { Authorization: 'Bearer ' + token } })
    const data = await res.json()
    return data?.data?.[0]?.id
  })
  expect(userATaskId).toBeTruthy()

  // 사용자 B 토큰으로 사용자 A의 할일 접근 시도
  const result = await page.evaluate(async (taskId) => {
    const loginRes = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'e2e.soyoung@shoppingmall.com', password: 'SoyoungPass123!' })
    })
    const loginData = await loginRes.json()
    const tokenB = loginData?.data?.token
    if (!tokenB) return { error: '로그인 실패' }
    const accessRes = await fetch(`http://localhost:3000/api/tasks/${taskId}`, {
      headers: { Authorization: 'Bearer ' + tokenB }
    })
    return { status: accessRes.status }
  }, userATaskId)

  // 403 또는 404로 접근 차단 확인
  expect([403, 404]).toContain(result.status)
})

// SC-16: 로그아웃
test('SC-16: 로그아웃', async ({ page }) => {
  await login(page, USER_A.email, USER_A.password)
  await page.locator('button:has-text("로그아웃")').click()
  await expect(page).toHaveURL(`${BASE_URL}/login`)
  const token = await page.evaluate(() =>
    Object.keys(localStorage).map(k => localStorage.getItem(k)).find(v => v?.startsWith('ey'))
  )
  expect(token).toBeFalsy()
})
