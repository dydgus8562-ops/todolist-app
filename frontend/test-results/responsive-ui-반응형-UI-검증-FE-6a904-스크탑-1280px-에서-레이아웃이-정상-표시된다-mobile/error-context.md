# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: responsive-ui.spec.js >> 반응형 UI 검증 (FE-12) >> 할일 목록 페이지 - 데스크탑(1280px)에서 레이아웃이 정상 표시된다
- Location: e2e\responsive-ui.spec.js:54:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('aside')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('aside')
    4 × waiting for" http://localhost:5173/login" navigation to finish...
      - navigated to "http://localhost:5173/login"
    - waiting for navigation to finish...
    - navigated to "http://localhost:5173/login"

```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test'
  2   | 
  3   | // 인증된 사용자로 설정하는辅助 함수
  4   | async function setAuthenticatedSession(page) {
  5   |   await page.addInitScript(() => {
  6   |     localStorage.setItem('token', 'test-jwt-token')
  7   |     localStorage.setItem('user', JSON.stringify({ id: 1, email: 'test@test.com' }))
  8   |   })
  9   | }
  10  | 
  11  | test.describe('반응형 UI 검증 (FE-12)', () => {
  12  |   test('로그인 페이지 - 모바일(375px)에서 폼이 정상 표시된다', async ({ page }) => {
  13  |     await page.setViewportSize({ width: 375, height: 667 })
  14  |     await page.goto('/login')
  15  |     
  16  |     const form = page.locator('form')
  17  |     await expect(form).toBeVisible()
  18  |     
  19  |     const emailInput = page.locator('input[type="email"]')
  20  |     const passwordInput = page.locator('input[type="password"]')
  21  |     
  22  |     const emailBox = await emailInput.boundingBox()
  23  |     const passwordBox = await passwordInput.boundingBox()
  24  |     
  25  |     expect(emailBox.y + emailBox.height).toBeLessThanOrEqual(passwordBox.y)
  26  |   })
  27  | 
  28  |   test('로그인 페이지 - 데스크탑(1280px)에서 폼이 정상 표시된다', async ({ page }) => {
  29  |     await page.setViewportSize({ width: 1280, height: 800 })
  30  |     await page.goto('/login')
  31  |     
  32  |     const form = page.locator('form')
  33  |     await expect(form).toBeVisible()
  34  |   })
  35  | 
  36  |   test('할일 목록 페이지 - 모바일(375px)에서 레이아웃이 깨지지 않는다', async ({ page }) => {
  37  |     await page.setViewportSize({ width: 375, height: 667 })
  38  |     await setAuthenticatedSession(page)
  39  |     await page.goto('/')
  40  |     
  41  |     // 모바일에서는 사이드바가 숨겨져 있는지 확인
  42  |     // (lg: 이상에서는 static, 미만에서는 fixed + translate-x-full)
  43  |     const sidebar = page.locator('aside')
  44  |     const sidebarClass = await sidebar.getAttribute('class')
  45  |     
  46  |     // 모바일 (lg:hidden)에서는 사이드바가 숨겨진 상태
  47  |     expect(sidebarClass).toContain('lg:hidden')
  48  |     
  49  |     // 메인 영역이 전체 너비 사용 (flex-1)
  50  |     const mainArea = page.locator('[class*="flex-1"]').first()
  51  |     await expect(mainArea).toBeVisible()
  52  |   })
  53  | 
  54  |   test('할일 목록 페이지 - 데스크탑(1280px)에서 레이아웃이 정상 표시된다', async ({ page }) => {
  55  |     await page.setViewportSize({ width: 1280, height: 800 })
  56  |     await setAuthenticatedSession(page)
  57  |     await page.goto('/')
  58  |     
  59  |     // 데스크탑에서 사이드바가 표시되는지 확인
  60  |     const sidebar = page.locator('aside')
> 61  |     await expect(sidebar).toBeVisible()
      |                           ^ Error: expect(locator).toBeVisible() failed
  62  |     
  63  |     // 메인 콘텐츠 영역도 표시
  64  |     const mainArea = page.locator('[class*="flex-1"]').first()
  65  |     await expect(mainArea).toBeVisible()
  66  |   })
  67  | 
  68  |   test('할일 목록 페이지 - 태블릿(768px)에서 레이아웃이 깨지지 않는다', async ({ page }) => {
  69  |     await page.setViewportSize({ width: 768, height: 1024 })
  70  |     await setAuthenticatedSession(page)
  71  |     await page.goto('/')
  72  |     
  73  |     const sidebar = page.locator('aside')
  74  |     await expect(sidebar).toBeVisible()
  75  |     
  76  |     const mainArea = page.locator('[class*="flex-1"]').first()
  77  |     await expect(mainArea).toBeVisible()
  78  |   })
  79  | 
  80  |   test('모바일(375px)에서 할일 추가 버튼이 터치하기 쉬운 위치에 있다', async ({ page }) => {
  81  |     await page.setViewportSize({ width: 375, height: 667 })
  82  |     await setAuthenticatedSession(page)
  83  |     await page.goto('/')
  84  |     
  85  |     // 할일 추가 버튼 찾기
  86  |     const addButton = page.getByRole('button', { name: /새로운 할일/i })
  87  |     
  88  |     // 버튼이 화면에Visible할 때까지 대기
  89  |     await expect(addButton).toBeVisible({ timeout: 10000 })
  90  |     
  91  |     const buttonBox = await addButton.boundingBox()
  92  |     expect(buttonBox.height).toBeGreaterThanOrEqual(44)
  93  |   })
  94  | 
  95  |   test('320px 뷰포트에서 수평 스크롤이 발생하지 않는다', async ({ page }) => {
  96  |     await page.setViewportSize({ width: 320, height: 568 })
  97  |     await setAuthenticatedSession(page)
  98  |     await page.goto('/')
  99  |     
  100 |     // 페이지 로드 후 수평 스크롤 없음
  101 |     const scrollX = await page.evaluate(() => window.scrollX)
  102 |     expect(scrollX).toBe(0)
  103 |     
  104 |     // body의overflow 확인
  105 |     const overflow = await page.evaluate(() => {
  106 |       return getComputedStyle(document.body).overflowX
  107 |     })
  108 |     expect(overflow).not.toBe('scroll')
  109 |   })
  110 | 
  111 |   test('모바일에서 햄버거 메뉴가 동작한다', async ({ page }) => {
  112 |     await page.setViewportSize({ width: 375, height: 667 })
  113 |     await setAuthenticatedSession(page)
  114 |     await page.goto('/')
  115 |     
  116 |     // Hamburger 메뉴 버튼 찾기 (Header에서 찾기)
  117 |     const menuButton = page.getByRole('button', { name: /메뉴 열기/i })
  118 |     
  119 |     if (await menuButton.isVisible()) {
  120 |       await menuButton.click()
  121 |       
  122 |       // 사이드바가 나타나는지 확인 (aside가 visible해짐)
  123 |       const sidebar = page.locator('aside')
  124 |       await expect(sidebar).toBeVisible()
  125 |     }
  126 |   })
  127 | 
  128 |   test('모바일에서 모달이 화면 너비에 맞게 표시된다', async ({ page }) => {
  129 |     await page.setViewportSize({ width: 375, height: 667 })
  130 |     await setAuthenticatedSession(page)
  131 |     await page.goto('/')
  132 |     
  133 |     // 할일 추가 버튼 클릭
  134 |     const addButton = page.getByRole('button', { name: /새로운 할일/i })
  135 |     await expect(addButton).toBeVisible({ timeout: 10000 })
  136 |     await addButton.click()
  137 |     
  138 |     // 모달이 표시됨
  139 |     const modal = page.locator('[role="dialog"]')
  140 |     await expect(modal).toBeVisible()
  141 |     
  142 |     // 모바일에서 모달이 화면을 벗어나지 않음
  143 |     const modalBox = await modal.boundingBox()
  144 |     expect(modalBox.width).toBeLessThanOrEqual(375)
  145 |   })
  146 | 
  147 |   test('상태 필터 버튼이 터치하기 쉬운 크기이다', async ({ page }) => {
  148 |     await page.setViewportSize({ width: 375, height: 667 })
  149 |     await setAuthenticatedSession(page)
  150 |     await page.goto('/')
  151 |     
  152 |     // Hamburger 메뉴 버튼으로 사이드바 열기
  153 |     const menuButton = page.getByRole('button', { name: /메뉴 열기/i })
  154 |     if (await menuButton.isVisible()) {
  155 |       await menuButton.click()
  156 |       
  157 |       // 상태 필터 버튼 확인 (대기중)
  158 |       const filterButton = page.getByRole('button', { name: '대기중' })
  159 |       await expect(filterButton).toBeVisible()
  160 |       
  161 |       const buttonBox = await filterButton.boundingBox()
```