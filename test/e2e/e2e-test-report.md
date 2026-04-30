# E2E 테스트 결과 보고서

**테스트 대상:** https://fe-cyh.vercel.app  
**백엔드:** https://be-cyh.vercel.app  
**테스트 일시:** 2026-04-30  
**참조 문서:** docs/3-user-scenario.md

---

## 테스트 결과 요약

| 시나리오 | 제목 | 결과 | 비고 |
|---------|------|------|------|
| SC-01 | 회원가입 정상 흐름 | ✅ PASS | 회원가입 후 /login 리다이렉트 확인 |
| SC-02 | 중복 이메일 회원가입 실패 | ✅ PASS | "Email already in use" 에러 표시, 폼 유지 |
| SC-03 | 약한 비밀번호 회원가입 실패 | ✅ PASS | "비밀번호는 영문, 숫자, 특수문자를 포함한 8자 이상이어야 합니다." 클라이언트 검증 |
| SC-04 | 로그인 정상 흐름 | ✅ PASS | 로그인 후 할일 목록 페이지 진입, 헤더에 이메일 표시 |
| SC-05 | 잘못된 비밀번호 로그인 실패 | ✅ PASS (재검증) | "Invalid email or password" 에러 표시, /login 유지 |
| SC-06 | 카테고리 생성 정상 흐름 | ✅ PASS | "업무" 카테고리 생성 후 사이드바 표시 |
| SC-07 | 중복 카테고리 이름 실패 | ✅ PASS | "Category name already exists" 에러 표시 |
| SC-08 | 할일 생성 정상 흐름 | ✅ PASS | 제목/설명/카테고리 포함 할일 생성, "대기중" 상태 |
| SC-09 | 마감일 없는 할일 생성 | ✅ PASS | dueDate 없이 생성, "대기중" 상태 고정 |
| SC-10 | 할일 목록 필터링 | ✅ PASS | "대기중" 필터 시 제목에 "(대기중)" 표시, 해당 항목만 조회 |
| SC-11 | 할일 완료 처리 및 완료 취소 | ✅ PASS | 체크박스로 완료 처리 후 완료 목록 이동, 재클릭 시 복원 |
| SC-12 | 할일 수정 | ✅ PASS | 수정 모달에 기존 값 preload, 저장 후 목록 반영 |
| SC-13 | 할일 삭제 | ✅ PASS | 삭제 확인 모달 후 목록에서 제거 |
| SC-14 | 카테고리 삭제 및 하위 할일 처리 | ✅ PASS | 카테고리 삭제 후 하위 할일 categoryId → "미분류" (BR-05) |
| SC-15 | 타인 데이터 접근 차단 | ✅ PASS | 타 사용자 토큰으로 접근 시 404 NOT_FOUND 반환 |
| SC-16 | 로그아웃 | ✅ PASS | 로그아웃 후 /login 리다이렉트, 토큰 제거 |

**총 16개 시나리오 중 16개 PASS (100%)**

---

## 발견된 버그 및 수정 이력

### BUG-01: Vercel SPA 라우팅 404
- **현상:** /register, /login 등 SPA 경로로 직접 접속 시 404 발생
- **원인:** `vercel.json` 누락으로 Vercel이 모든 경로를 index.html로 리라이트하지 않음
- **수정:** `frontend/vercel.json` 추가 (`{ "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }`)
- **상태:** ✅ 수정 완료 (커밋 5f372ba)

### BUG-02: 401 인터셉터 무한루프
- **현상:** 잘못된 비밀번호 로그인 시 401 응답 → axios 인터셉터가 `window.location.href = '/login'` 실행 → 풀 리로드 → Vercel 404
- **원인:** `api/index.js` 401 인터셉터가 인증 엔드포인트(`/auth/`) 포함 모든 401에 리다이렉트 실행
- **수정:** `isAuthEndpoint` 체크 추가 — `/auth/` 경로는 리다이렉트 제외
- **상태:** ✅ 수정 완료 (커밋 5f372ba)

---

## 스크린샷

| 파일 | 시나리오 |
|------|---------|
| sc01-deployed-register-filled.png | SC-01 회원가입 폼 입력 |
| sc02-deployed-duplicate-email.png | SC-02 중복 이메일 에러 |
| sc03-deployed-weak-password.png | SC-03 약한 비밀번호 에러 |
| sc04-deployed-login-success.png | SC-04 로그인 성공 후 할일 목록 |
| sc05-deployed-wrong-password.png | SC-05 잘못된 비밀번호 에러 (재검증) |
| sc06-deployed-category-created.png | SC-06 카테고리 생성 |
| sc07-deployed-duplicate-category.png | SC-07 중복 카테고리 에러 |
| sc08-deployed-task-created.png | SC-08 할일 생성 |
| sc09-deployed-task-no-duedate.png | SC-09 마감일 없는 할일 |
| sc10-deployed-filter-pending.png | SC-10 대기중 필터 |
| sc11-deployed-task-completed.png | SC-11 완료 처리 |
| sc11-deployed-task-uncompleted.png | SC-11 완료 취소 |
| sc12-deployed-task-edited.png | SC-12 할일 수정 |
| sc13-deployed-task-deleted.png | SC-13 할일 삭제 |
| sc14-deployed-category-deleted.png | SC-14 카테고리 삭제 |
