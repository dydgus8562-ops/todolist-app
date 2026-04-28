# TodoList 애플리케이션 프로젝트 구조 설계 원칙

**버전:** 1.0  
**작성일:** 2026-04-28  
**참조 문서:**
- [도메인 정의서](./1-domain-definition.md)
- [PRD (Product Requirements Document)](./2-prd.md)
- [API 명세](./3-api-specification.md)

---

## 목차

1. [최상위 설계 원칙](#1-최상위-설계-원칙)
2. [의존성 및 레이어 아키텍처](#2-의존성-및-레이어-아키텍처)
3. [코드 및 네이밍 규칙](#3-코드-및-네이밍-규칙)
4. [테스트 및 품질 보증](#4-테스트-및-품질-보증)
5. [설정, 보안 및 운영](#5-설정-보안-및-운영)
6. [프론트엔드 디렉토리 구조](#6-프론트엔드-디렉토리-구조)
7. [백엔드 디렉토리 구조](#7-백엔드-디렉토리-구조)
8. [변경 이력](#변경-이력)

---

## 1. 최상위 설계 원칙

### 1.1 단일 책임 원칙 (Single Responsibility Principle)

**원칙:**  
각 모듈, 파일, 함수는 **하나의 명확한 책임**만 가져야 한다.

**이유:**
- 코드 변경 시 영향 범위 최소화
- 테스트 용이성 증대
- 재사용성과 유지보수성 향상
- MVP 기간 내 빠른 수정 가능

**적용 예시 - 프론트엔드:**
```javascript
// ✅ GOOD: 단일 책임 - 인증 관련 API만 담당
// api/auth.js
export const loginUser = async (email, password) => {
  const response = await api.post('/auth/login', { email, password });
  return response.data;
};

// ✅ GOOD: 단일 책임 - 로그인 폼 UI만 담당
// components/LoginForm.jsx
export function LoginForm() {
  // 폼 렌더링 로직만 포함
}

// ❌ ANTI-PATTERN: 혼재된 책임
// pages/Login.jsx
export function LoginPage() {
  // API 호출 로직 + DB 직접 접근 + UI 렌더링이 모두 섞여있음
  const handleLogin = async () => {
    const response = await fetch('/api/login', {...});
    // DB 쿼리까지 여기서 처리하려는 시도
  };
}
```

**적용 예시 - 백엔드:**
```javascript
// ✅ GOOD: 계층별 단일 책임
// routes/auth.js - 라우팅만 담당
router.post('/login', authController.login);

// controllers/authController.js - 요청/응답 처리만
export const login = async (req, res) => {
  const result = await authService.validateCredentials(req.body);
  res.json(result);
};

// services/authService.js - 비즈니스 로직만
export const validateCredentials = async (credentials) => {
  const user = await userRepository.findByEmail(credentials.email);
  // 비즈니스 로직
};

// repositories/userRepository.js - DB 쿼리만
export const findByEmail = async (email) => {
  return db.query('SELECT * FROM users WHERE email = $1', [email]);
};

// ❌ ANTI-PATTERN: 혼재된 책임
// routes/auth.js에서 모든 것을 처리
router.post('/login', async (req, res) => {
  const user = await db.query('SELECT * FROM users WHERE email = $1', [req.body.email]);
  const isValid = bcrypt.compare(req.body.password, user.password);
  const token = jwt.sign({...}, process.env.JWT_SECRET);
  res.json({ token });
});
```

---

### 1.2 명시적 의존성 (Explicit Dependencies)

**원칙:**  
모든 의존성은 **명시적으로 주입**되거나 **import**되어야 한다. 암묵적 전역 상태나 숨겨진 사이드이펙트를 금지한다.

**이유:**
- 코드 흐름 추적 용이
- 테스트 시 의존성 mocking 가능
- 예상치 못한 부작용 방지
- 버그 디버깅 시간 단축

**적용 예시 - 프론트엔드:**
```javascript
// ✅ GOOD: 의존성 명시적 주입
// hooks/useAuthQuery.js
export function useAuthQuery(credentials) {
  return useQuery({
    queryKey: ['auth', 'login'],
    queryFn: () => loginUser(credentials)  // 함수를 명시적으로 전달
  });
}

// components/LoginForm.jsx
import { useAuthQuery } from '../hooks/useAuthQuery';

export function LoginForm() {
  const { mutate: login } = useMutation({
    mutationFn: loginUser  // 의존성 명시
  });
}

// ❌ ANTI-PATTERN: 암묵적 전역 상태
// utils/api.js (암묵적 singleton)
const apiClient = axios.create({...});  // 어디서나 접근 가능한 전역 인스턴스

// components/LoginForm.jsx
import { apiClient } from '../utils/api';  // 전역 의존성에 암묵적으로 의존

export function LoginForm() {
  const handleLogin = async () => {
    await apiClient.post('/login', {...});  // 테스트에서 mocking 어려움
  };
}
```

**적용 예시 - 백엔드:**
```javascript
// ✅ GOOD: 의존성 주입
// services/authService.js
export class AuthService {
  constructor(userRepository, emailService) {
    this.userRepository = userRepository;  // 의존성 명시
    this.emailService = emailService;
  }

  async register(userData) {
    const user = await this.userRepository.create(userData);
    await this.emailService.sendConfirmation(user.email);  // 명시적 호출
    return user;
  }
}

// controllers/authController.js
export const authController = new AuthController(
  new AuthService(userRepository, emailService)  // 의존성 주입
);

// ❌ ANTI-PATTERN: 암묵적 전역 상태
// config/db.js
const pool = new Pool({...});  // 전역 풀
module.exports = pool;

// services/authService.js
const db = require('../config/db');  // 암묵적 의존성

export const validateCredentials = async (credentials) => {
  const result = await db.query('SELECT * FROM users WHERE email = $1', [credentials.email]);
  // db의 상태 변화가 숨겨짐
};
```

---

### 1.3 환경 분리 (Environment Separation)

**원칙:**  
개발(development), 스테이징(staging), 운영(production) 환경의 설정을 **명확히 분리**한다.

**이유:**
- 운영 환경 데이터 보호
- 환경별 다른 동작 지원 (로깅 레벨, 디버깅 활성화 등)
- CI/CD 파이프라인 자동화
- 사람의 실수로 인한 운영 장애 방지

**적용 예시:**
```javascript
// ✅ GOOD: 환경별 설정 분리
// config/database.js
const config = {
  development: {
    host: 'localhost',
    port: 5432,
    database: 'todolist_dev',
    logging: true
  },
  production: {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    logging: false,
    ssl: true
  }
};

const currentEnv = process.env.NODE_ENV || 'development';
module.exports = config[currentEnv];

// .env.development
NODE_ENV=development
DB_HOST=localhost
JWT_SECRET=dev-secret-key-for-testing-only

// .env.production (운영 환경 - 배포 시스템이 주입)
NODE_ENV=production
DB_HOST=prod-db-server.com
JWT_SECRET=${SECURE_VAULT_SECRET}

// ❌ ANTI-PATTERN: 하드코딩된 환경 설정
// config/database.js
const pool = new Pool({
  host: 'prod-db.example.com',  // 운영 서버 하드코딩
  password: 'admin123'  // 비밀번호 노출
});
```

---

### 1.4 버전 관리 (Version Control)

**원칙:**  
모든 코드 변경은 **git commit** 단위로 추적되며, **브랜치 전략**을 따른다.

**이유:**
- 변경 내역 추적 가능
- 롤백 용이
- 팀 협업 효율화
- 코드 리뷰 활성화

**적용 전략 - MVP 기간:**
```
main (운영 브랜치)
  ├─ feature/auth-login (기능 개발)
  ├─ feature/category-crud (기능 개발)
  ├─ feature/todo-crud (기능 개발)
  └─ fix/jwt-validation (버그 수정)
```

**커밋 메시지 규칙:**
```
<type>(<scope>): <subject>

<body>

<footer>

// 예시
feat(auth): implement JWT login with HS-512
- Add POST /auth/login endpoint
- Validate email and password
- Return JWT token in response

fix(todo): resolve query parameter type conversion
Fixes #42

// 커밋 타입
feat:      새 기능
fix:       버그 수정
refactor:  코드 구조 개선 (기능 변화 없음)
chore:     빌드, 패키지 업데이트 등
docs:      문서 작성
test:      테스트 코드 추가
```

---

### 1.5 코드 일관성 (Code Consistency)

**원칙:**  
Linter(ESLint)와 Formatter(Prettier)를 **강제로 적용**하여 코드 스타일을 통일한다.

**이유:**
- 가독성 향상
- 코드 리뷰 시간 단축 (스타일 논의 제거)
- 버그 패턴 조기 발견 (Linter 규칙)
- 팀 생산성 증대

**프론트엔드 설정 예시:**
```javascript
// .eslintrc.js
module.exports = {
  env: {
    browser: true,
    es2021: true
  },
  extends: ['eslint:recommended', 'react-app'],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module'
  },
  rules: {
    'no-var': 'error',                    // var 금지
    'prefer-const': 'error',              // const 강제
    'no-unused-vars': 'warn',             // 미사용 변수 경고
    'no-console': ['warn', { allow: ['warn', 'error'] }],  // console 제한
    'eqeqeq': 'error'                     // === 강제
  }
};

// .prettierrc.js
module.exports = {
  semi: true,
  singleQuote: true,
  tabWidth: 2,
  trailingComma: 'es5',
  printWidth: 100
};

// package.json
{
  "scripts": {
    "lint": "eslint src --fix",
    "format": "prettier --write src",
    "pre-commit": "npm run lint && npm run format"
  }
}
```

**백엔드 설정 예시:**
```javascript
// .eslintrc.js
module.exports = {
  env: {
    node: true,
    es2021: true
  },
  extends: 'eslint:recommended',
  rules: {
    'no-var': 'error',
    'prefer-const': 'error',
    'no-unused-vars': 'warn',
    'quotes': ['error', 'single'],
    'semi': ['error', 'always']
  }
};
```

---

## 2. 의존성 및 레이어 아키텍처

### 2.1 프론트엔드 레이어 아키텍처

**계층 구조:**
```
┌─────────────────────────────────────┐
│  UI Component Layer (React)         │  화면 렌더링
├─────────────────────────────────────┤
│  Server State Layer (TanStack Query)│  서버 데이터 캐싱/동기화
├─────────────────────────────────────┤
│  Client State Layer (Zustand)       │  전역 클라이언트 상태
├─────────────────────────────────────┤
│  API Client Layer (axios)           │  HTTP 요청/응답
├─────────────────────────────────────┤
│  Backend Server (Node.js/Express)   │  데이터 처리
└─────────────────────────────────────┘
```

**의존성 방향 (단방향):**
- UI 컴포넌트 → 커스텀 훅 (TanStack Query/Zustand)
- 커스텀 훅 → API 클라이언트
- API 클라이언트 → Backend
- **역방향 의존성 금지** (Backend에서 UI로 직접 접근 금지)

**각 계층의 역할:**

| 계층 | 책임 | 허용 | 금지 |
|------|------|------|------|
| UI Component | 렌더링, 사용자 입력 처리 | JSX 렌더링, 훅 호출, prop drilling | API 직접 호출, DB 접근, 비즈니스 로직 |
| TanStack Query | 서버 상태 동기화, 캐싱 | 데이터 페칭, 캐시 관리, 백그라운드 싱크 | 로컬 UI 상태 관리, 복잡한 비즈니스 로직 |
| Zustand Store | 클라이언트 전역 상태 | UI 상태 저장 (테마, 모달 열림/닫힘), 인증 정보 | 서버 상태 저장, API 호출 |
| API Client | HTTP 통신 | 요청 빌드, 응답 파싱, 기본 에러 처리 | 비즈니스 로직, 캐싱, 상태 관리 |

**적용 예시:**
```javascript
// ✅ GOOD: 올바른 레이어 분리
// api/todoApi.js - API 통신만
export const fetchTodos = async () => {
  const response = await api.get('/todos');
  return response.data;
};

// hooks/useTodosQuery.js - 서버 상태 관리
export function useTodosQuery() {
  return useQuery({
    queryKey: ['todos'],
    queryFn: fetchTodos,
    staleTime: 1000 * 60 * 5  // 5분 캐시
  });
}

// store/authStore.js - 클라이언트 상태 관리
export const useAuthStore = create((set) => ({
  isLoggedIn: false,
  user: null,
  setAuth: (user) => set({ isLoggedIn: true, user })
}));

// components/TodoList.jsx - 렌더링만
export function TodoList() {
  const { data: todos } = useTodosQuery();  // 서버 상태 구독
  const { user } = useAuthStore();  // 클라이언트 상태 구독

  return (
    <ul>
      {todos.map(todo => <TodoItem key={todo.id} todo={todo} />)}
    </ul>
  );
}

// ❌ ANTI-PATTERN: 레이어 위반
// components/TodoList.jsx - 여러 책임 혼재
export function TodoList() {
  const [todos, setTodos] = useState([]);

  // API 호출을 컴포넌트에서 직접
  useEffect(() => {
    fetch('/api/todos')
      .then(r => r.json())
      .then(data => setTodos(data));
  }, []);

  // 복잡한 비즈니스 로직을 컴포넌트에서 처리
  const filterCompleted = () => {
    const filtered = todos.filter(t => t.status === 'COMPLETED');
    // 로컬 스토리지에 저장? 서버에 요청? 혼재
  };
}
```

---

### 2.2 백엔드 레이어 아키텍처

**계층 구조:**
```
┌──────────────────────────────────────┐
│  Route Layer (Express Router)        │  요청 라우팅
├──────────────────────────────────────┤
│  Controller Layer                    │  요청/응답 처리
├──────────────────────────────────────┤
│  Service Layer                       │  비즈니스 로직
├──────────────────────────────────────┤
│  Repository Layer (pg)               │  DB 쿼리
├──────────────────────────────────────┤
│  PostgreSQL Database                 │  데이터 저장소
└──────────────────────────────────────┘
```

**의존성 방향 (단방향):**
- Route → Controller → Service → Repository → DB
- **역방향 의존성 금지** (Repository에서 Service 호출 금지)

**각 계층의 역할:**

| 계층 | 책임 | 허용 | 금지 |
|------|------|------|------|
| Route | 요청 경로 정의, 미들웨어 체인 | router.post/get/put/delete, 라우팅 | 비즈니스 로직, DB 접근 |
| Controller | 요청 파싱, 응답 반환, HTTP 상태 | req/res 처리, 유효성 검사, 에러 핸들링 | 비즈니스 로직, DB 쿼리 |
| Service | 비즈니스 로직, 트랜잭션 | 데이터 변환, 검증, 복잡한 로직 | HTTP 처리, DB 쿼리 직접 실행 |
| Repository | DB 쿼리 작성, 실행 | SELECT, INSERT, UPDATE, DELETE | 비즈니스 로직, HTTP 처리 |

**적용 예시:**
```javascript
// ✅ GOOD: 올바른 레이어 분리
// routes/todoRoutes.js
const router = express.Router();
router.get('/todos', authMiddleware, todoController.getTodos);
router.post('/todos', authMiddleware, todoController.createTodo);
module.exports = router;

// controllers/todoController.js
export const getTodos = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const todos = await todoService.getUserTodos(userId);
    res.json({ success: true, data: todos });
  } catch (error) {
    next(error);  // 에러 핸들링 미들웨어로 위임
  }
};

export const createTodo = async (req, res, next) => {
  try {
    const { title, categoryId } = req.body;
    const userId = req.user.id;

    // 유효성 검사
    if (!title || !categoryId) {
      return res.status(400).json({ error: 'VALIDATION_ERROR' });
    }

    const todo = await todoService.createTodo(userId, {
      title,
      categoryId
    });
    res.status(201).json({ success: true, data: todo });
  } catch (error) {
    next(error);
  }
};

// services/todoService.js
export const getUserTodos = async (userId) => {
  // 비즈니스 로직: 사용자의 할일 조회 + 상태 변환
  const todos = await todoRepository.findByUserId(userId);
  return todos.map(todo => ({
    ...todo,
    isOverdue: new Date(todo.dueDate) < new Date() && todo.status === 'PENDING'
  }));
};

export const createTodo = async (userId, todoData) => {
  // 비즈니스 로직: 카테고리 존재 확인 → 할일 생성
  const category = await categoryRepository.findById(todoData.categoryId);
  if (!category || category.userId !== userId) {
    throw new Error('CATEGORY_NOT_FOUND');
  }

  return await todoRepository.create({
    userId,
    ...todoData,
    status: 'PENDING',
    createdAt: new Date()
  });
};

// repositories/todoRepository.js
export const findByUserId = async (userId) => {
  const result = await db.query(
    'SELECT * FROM todos WHERE user_id = $1 ORDER BY created_at DESC',
    [userId]
  );
  return result.rows;
};

export const create = async (todoData) => {
  const result = await db.query(
    `INSERT INTO todos (user_id, category_id, title, status, created_at)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [todoData.userId, todoData.categoryId, todoData.title, todoData.status, todoData.createdAt]
  );
  return result.rows[0];
};

// ❌ ANTI-PATTERN: 레이어 위반
// routes/todoRoutes.js - 비즈니스 로직이 라우트에 섞임
router.post('/todos', async (req, res) => {
  const { title, categoryId } = req.body;
  const userId = req.user.id;

  // 컨트롤러 책임을 라우트에서 수행
  if (!title || !categoryId) {
    return res.status(400).json({ error: 'VALIDATION_ERROR' });
  }

  // 서비스 책임을 라우트에서 수행
  const category = await db.query(
    'SELECT * FROM categories WHERE id = $1 AND user_id = $2',
    [categoryId, userId]
  );
  if (category.rows.length === 0) {
    return res.status(404).json({ error: 'CATEGORY_NOT_FOUND' });
  }

  // 저장소 책임을 라우트에서 수행
  const result = await db.query(
    `INSERT INTO todos (user_id, category_id, title, status, created_at)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [userId, categoryId, title, 'PENDING', new Date()]
  );

  res.status(201).json({ success: true, data: result.rows[0] });
});
```

---

## 3. 코드 및 네이밍 규칙

### 3.1 파일명 규칙

**프론트엔드:**

| 파일 유형 | 규칙 | 예시 |
|-----------|------|------|
| React 컴포넌트 | PascalCase, `.jsx` 확장자 | `LoginForm.jsx`, `TodoItem.jsx` |
| 커스텀 훅 | camelCase, `use` 접두사, `.js` 확장자 | `useTodosQuery.js`, `useAuth.js` |
| Zustand 스토어 | camelCase, `Store` 접미사, `.js` 확장자 | `authStore.js`, `uiStore.js` |
| API 함수 | camelCase, `.js` 확장자 | `todoApi.js`, `authApi.js` |
| 유틸 함수 | camelCase, `.js` 확장자 | `dateUtils.js`, `validation.js` |
| 상수 | camelCase, `constants.js` 파일 | `constants/errors.js`, `constants/api.js` |
| 스타일 | camelCase, `.css` 또는 Tailwind 클래스 | `global.css` |

**백엔드:**

| 파일 유형 | 규칙 | 예시 |
|-----------|------|------|
| 라우터 | camelCase, `Routes` 또는 라우트명, `.js` 확장자 | `authRoutes.js`, `todoRoutes.js` |
| 컨트롤러 | camelCase, `Controller` 접미사, `.js` 확장자 | `authController.js`, `todoController.js` |
| 서비스 | camelCase, `Service` 접미사, `.js` 확장자 | `authService.js`, `todoService.js` |
| 저장소 | camelCase, `Repository` 접미사, `.js` 확장자 | `userRepository.js`, `todoRepository.js` |
| 미들웨어 | camelCase, `.js` 확장자 | `authMiddleware.js`, `errorHandler.js` |
| 유틸 함수 | camelCase, `.js` 확장자 | `jwtUtils.js`, `validation.js` |
| 상수/에러코드 | SCREAMING_SNAKE_CASE, `constants` 폴더 | `constants/errors.js` |
| 설정 | camelCase, `config` 폴더 | `config/database.js`, `config/jwt.js` |

**예시:**
```
✅ GOOD:
src/
  api/
    todoApi.js
    authApi.js
  hooks/
    useTodosQuery.js
    useAuth.js
  store/
    authStore.js
    uiStore.js
  components/
    LoginForm.jsx
    TodoItem.jsx
  utils/
    dateUtils.js
    validation.js
  constants/
    errors.js
    api.js

❌ ANTI-PATTERN:
src/
  api/
    todo_api.js (snake_case 사용)
    getAuth.js (접두사 규칙 없음)
  hooks/
    TodoQuery.js (use 접두사 없음)
  store/
    auth.js (Store 접미사 없음)
  components/
    login_form.jsx (snake_case 사용)
  utils/
    date_utils.js (snake_case 사용)
```

---

### 3.2 변수 및 함수 네이밍

**규칙:**

| 항목 | 규칙 | 예시 |
|------|------|------|
| 변수 | camelCase, 명사 | `userName`, `todoList`, `userId` |
| 함수 | camelCase, 동사+명사 | `getUserTodos()`, `updateTodoStatus()`, `createCategory()` |
| 불리언 | `is/has/can` 접두사 | `isLoggedIn`, `hasError`, `canEdit` |
| 상수 | SCREAMING_SNAKE_CASE | `MAX_TODOS_PER_PAGE`, `JWT_EXPIRY_TIME` |
| 클래스/타입 | PascalCase | `TodoService`, `UserRepository` |
| Private 멤버 | `_` 접두사 또는 `#` (JavaScript) | `_internalState`, `#privateMethod` |

**동사 선택:**

| 동작 | 동사 | 예시 |
|------|------|------|
| 가져오기 | `get`, `fetch` | `getTodo()`, `fetchUser()` |
| 찾기 | `find`, `search` | `findByEmail()`, `searchTodos()` |
| 생성 | `create`, `make` | `createTodo()`, `makeCopy()` |
| 수정 | `update`, `modify` | `updateTodoStatus()`, `modifyTitle()` |
| 삭제 | `delete`, `remove` | `deleteTodo()`, `removeCategory()` |
| 검증 | `validate`, `check` | `validateEmail()`, `checkPassword()` |
| 변환 | `transform`, `parse` | `transformResponse()`, `parseDate()` |
| 처리 | `handle`, `process` | `handleSubmit()`, `processRequest()` |

**적용 예시:**
```javascript
// ✅ GOOD: 명확한 네이밍
const userId = user.id;
const isCompleted = todo.status === 'COMPLETED';
const hasOverdueItems = todos.some(t => t.isOverdue);
const MAX_TITLE_LENGTH = 100;

function getUserTodos(userId) {
  // 사용자의 할일 조회
}

function updateTodoStatus(todoId, newStatus) {
  // 할일 상태 업데이트
}

function isValidEmail(email) {
  // 이메일 유효성 검사
}

// ❌ ANTI-PATTERN: 모호한 네이밍
const u = user.id;  // 'u'는 무엇?
const c = todo.status === 'COMPLETED';  // 'c'는 무엇?
const m = 100;  // 'm'은 무엇?

function get(id) {
  // 무엇을 가져오는가? 사용자? 할일?
}

function update(id, status) {
  // 무엇을 업데이트하는가?
}

function check(value) {
  // 무엇을 검사하는가?
}
```

---

### 3.3 컴포넌트 구조 (프론트엔드)

**React 컴포넌트 작성 순서:**

```javascript
import React from 'react';
import { useMutation } from '@tanstack/react-query';

// 1. 상단: 외부 import
import { useTodosQuery } from '../hooks/useTodosQuery';
import { useAuthStore } from '../store/authStore';
import { updateTodo } from '../api/todoApi';
import TodoItem from './TodoItem';
import { formatDate } from '../utils/dateUtils';

// 2. 상수 정의 (필요 시)
const SORT_OPTIONS = ['created', 'dueDate', 'title'];

// 3. 컴포넌트 함수 정의
export function TodoList({ categoryId }) {
  // 3.1 Props 검증 (필요 시)
  if (!categoryId) {
    throw new Error('categoryId is required');
  }

  // 3.2 Hooks 호출 (모든 커스텀 훅을 먼저)
  const { data: todos, isLoading, error } = useTodosQuery(categoryId);
  const { user } = useAuthStore();
  const [sortBy, setSortBy] = React.useState('created');

  // 3.3 Derived State (계산된 상태)
  const sortedTodos = React.useMemo(() => {
    if (!todos) return [];
    return [...todos].sort((a, b) => {
      if (sortBy === 'created') {
        return new Date(b.createdAt) - new Date(a.createdAt);
      }
      return 0;
    });
  }, [todos, sortBy]);

  // 3.4 Event Handlers 정의
  const handleSortChange = (newSort) => {
    setSortBy(newSort);
  };

  // 3.5 Render logic
  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error.message}</div>;
  }

  // 3.6 JSX 반환
  return (
    <div className="todo-list">
      <select value={sortBy} onChange={(e) => handleSortChange(e.target.value)}>
        {SORT_OPTIONS.map(option => (
          <option key={option} value={option}>{option}</option>
        ))}
      </select>

      <ul>
        {sortedTodos.map(todo => (
          <TodoItem key={todo.id} todo={todo} />
        ))}
      </ul>
    </div>
  );
}

// 4. Export (명명된 export 권장)
export default TodoList;
```

**조건부 렌더링 패턴:**

```javascript
// ✅ GOOD: Early return pattern
function TodoDetail({ todo, isLoading, error }) {
  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <ErrorMessage error={error} />;
  }

  if (!todo) {
    return <EmptyState />;
  }

  // 메인 콘텐츠
  return <div>{/* ... */}</div>;
}

// ❌ ANTI-PATTERN: 과도한 중첩
function TodoDetail({ todo, isLoading, error }) {
  return (
    <>
      {isLoading ? (
        <LoadingSpinner />
      ) : error ? (
        <ErrorMessage error={error} />
      ) : !todo ? (
        <EmptyState />
      ) : (
        <div>{/* ... */}</div>
      )}
    </>
  );
}
```

---

### 3.4 API 응답 필드 네이밍 (camelCase)

**원칙:**  
API 응답의 모든 필드는 **camelCase**로 통일한다.

**적용 예시:**

```javascript
// ✅ GOOD: camelCase 통일
{
  "success": true,
  "data": {
    "id": 1,
    "userId": 100,
    "title": "Learn React",
    "description": "Study React hooks",
    "categoryId": 5,
    "status": "PENDING",
    "dueDate": "2026-05-15",
    "createdAt": "2026-04-28T10:00:00Z",
    "updatedAt": "2026-04-28T10:00:00Z"
  }
}

// ❌ ANTI-PATTERN: snake_case (데이터베이스 컬럼명과 혼동)
{
  "success": true,
  "data": {
    "id": 1,
    "user_id": 100,  // snake_case 금지
    "title": "Learn React",
    "description": "Study React hooks",
    "category_id": 5,  // snake_case 금지
    "status": "PENDING",
    "due_date": "2026-05-15",  // snake_case 금지
    "created_at": "2026-04-28T10:00:00Z",  // snake_case 금지
    "updated_at": "2026-04-28T10:00:00Z"   // snake_case 금지
  }
}
```

**변환 계층 (백엔드):**

```javascript
// services/todoService.js
export const getUserTodos = async (userId) => {
  // 데이터베이스에서 snake_case로 조회
  const todos = await todoRepository.findByUserId(userId);

  // API 응답용으로 camelCase로 변환
  return todos.map(todo => ({
    id: todo.id,
    userId: todo.user_id,  // snake_case → camelCase
    title: todo.title,
    categoryId: todo.category_id,  // snake_case → camelCase
    status: todo.status,
    dueDate: todo.due_date,  // snake_case → camelCase
    createdAt: todo.created_at,  // snake_case → camelCase
    updatedAt: todo.updated_at   // snake_case → camelCase
  }));
};
```

---

### 3.5 SQL 컬럼명 규칙 (snake_case)

**원칙:**  
데이터베이스 테이블과 컬럼은 모두 **snake_case**로 작성한다.

**적용 예시:**

```sql
-- ✅ GOOD: snake_case 컬럼명
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE categories (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  name VARCHAR(100) NOT NULL,
  color VARCHAR(7),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE todos (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  category_id INTEGER NOT NULL REFERENCES categories(id),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(20) DEFAULT 'PENDING',
  due_date DATE,
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ✅ GOOD: 파라미터화 쿼리 (SQL Injection 방지)
SELECT * FROM todos WHERE user_id = $1 AND status = $2;

-- ❌ ANTI-PATTERN: camelCase 컬럼명
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255),
  passwordHash VARCHAR(255),  -- snake_case 사용
  firstName VARCHAR(100),     -- snake_case 사용
  lastName VARCHAR(100),      -- snake_case 사용
  isActive BOOLEAN,           -- snake_case 사용
  createdAt TIMESTAMP,        -- snake_case 사용
  updatedAt TIMESTAMP         -- snake_case 사용
);

-- ❌ ANTI-PATTERN: 문자열 연결로 쿼리 작성 (SQL Injection)
const query = `SELECT * FROM todos WHERE user_id = ${userId} AND status = '${status}'`;
db.query(query);  // 위험!
```

---

### 3.6 상수 및 에러코드 관리

**상수 파일 구조:**

```javascript
// constants/errors.js - 에러 코드 통합 관리
export const ERROR_CODES = {
  // 인증 관련
  INVALID_EMAIL_FORMAT: 'INVALID_EMAIL_FORMAT',
  PASSWORD_TOO_SHORT: 'PASSWORD_TOO_SHORT',
  EMAIL_ALREADY_EXISTS: 'EMAIL_ALREADY_EXISTS',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  TOKEN_INVALID: 'TOKEN_INVALID',

  // 할일 관련
  TODO_NOT_FOUND: 'TODO_NOT_FOUND',
  CATEGORY_NOT_FOUND: 'CATEGORY_NOT_FOUND',
  INVALID_TODO_STATUS: 'INVALID_TODO_STATUS',

  // 인가 관련
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',

  // 서버 관련
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR'
};

// constants/httpStatus.js - HTTP 상태 코드
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_SERVER_ERROR: 500
};

// constants/validation.js - 유효성 검사 상수
export const VALIDATION = {
  MIN_PASSWORD_LENGTH: 8,
  MAX_PASSWORD_LENGTH: 64,
  MAX_TITLE_LENGTH: 255,
  MAX_DESCRIPTION_LENGTH: 1000,
  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  VALID_TODO_STATUSES: ['PENDING', 'COMPLETED', 'OVERDUE']
};

// constants/api.js - API 관련 상수
export const API = {
  BASE_URL: process.env.REACT_APP_API_URL || 'http://localhost:5000',
  JWT_STORAGE_KEY: 'auth_token',
  REQUEST_TIMEOUT: 10000,  // 10초
  CACHE_TIME: 5 * 60 * 1000  // 5분
};

// ✅ GOOD: 상수 사용
if (!user.email.match(VALIDATION.EMAIL_REGEX)) {
  throw new Error(ERROR_CODES.INVALID_EMAIL_FORMAT);
}

// ❌ ANTI-PATTERN: 하드코딩
if (!user.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
  throw new Error('INVALID_EMAIL_FORMAT');
}
```

**백엔드 에러 응답 형식:**

```javascript
// utils/errorHandler.js
export class AppError extends Error {
  constructor(statusCode, errorCode, message) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
  }
}

// controllers/authController.js
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      throw new AppError(
        HTTP_STATUS.BAD_REQUEST,
        ERROR_CODES.INVALID_CREDENTIALS,
        'Email and password are required'
      );
    }

    const user = await authService.validateCredentials(email, password);
    const token = generateToken(user);

    res.json({
      success: true,
      data: {
        user: { id: user.id, email: user.email },
        token
      }
    });
  } catch (error) {
    next(error);  // 에러 핸들링 미들웨어로 위임
  }
};

// middlewares/errorHandler.js - 글로벌 에러 처리
export const errorHandler = (err, req, res, next) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.errorCode,
        message: err.message
      }
    });
  }

  // 예상치 못한 에러
  console.error('Unexpected error:', err);
  res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
    success: false,
    error: {
      code: ERROR_CODES.INTERNAL_SERVER_ERROR,
      message: 'An unexpected error occurred'
    }
  });
};
```

---

## 4. 테스트 및 품질 보증

### 4.1 테스트 대상 우선순위

**MVP 기간 (2026-04-28 ~ 2026-04-30) 고려 시 우선순위:**

1. **단위 테스트 (Unit Tests)** - 핵심 비즈니스 로직
   - Service 계층 (예: 상태 변환, 유효성 검사)
   - Utility 함수 (예: 날짜 포맷, 계산)

2. **통합 테스트 (Integration Tests)** - 계층 간 상호작용
   - Controller + Service + Repository 연결
   - API 엔드포인트 (요청 → 응답)

3. **E2E 테스트 (End-to-End Tests)** - 사용자 시나리오
   - 회원가입 → 로그인 → 할일 생성 → 상태 변경
   - (MVP에서는 선택사항, 시간 부족 시 수동 테스트)

**테스트 커버리지 목표 (MVP):**
- 서비스 로직: 80% 이상
- 컨트롤러 로직: 60% 이상 (주요 경로)
- UI 컴포넌트: 40% 이상 (중요 상호작용)

---

### 4.2 테스트 파일 위치 규칙

**프론트엔드:**
```
frontend/src/
  api/
    todoApi.js
    todoApi.test.js  (동위 배치)
  hooks/
    useTodosQuery.js
    useTodosQuery.test.js
  utils/
    dateUtils.js
    dateUtils.test.js
  components/
    TodoItem.jsx
    TodoItem.test.jsx
```

**백엔드:**
```
backend/src/
  services/
    todoService.js
    todoService.test.js  (동위 배치)
  repositories/
    todoRepository.js
    todoRepository.test.js
  __tests__/  (또는 별도 폴더)
    integration/
      todoApi.integration.test.js
```

**선택 사항:** `__tests__` 폴더를 따로 구성할 수도 있으나, 동위 배치가 더 추천됨 (변경 시 테스트도 함께 눈에 띔).

---

### 4.3 테스트 명명 규칙

```javascript
// ✅ GOOD: describe-it 구조
describe('todoService', () => {
  describe('createTodo', () => {
    it('should create a todo with PENDING status', () => {
      // 테스트 구현
    });

    it('should throw error if title is empty', () => {
      // 테스트 구현
    });

    it('should set createdAt to current timestamp', () => {
      // 테스트 구현
    });
  });

  describe('updateTodoStatus', () => {
    it('should update status to COMPLETED', () => {
      // 테스트 구현
    });

    it('should set completedAt when status changes to COMPLETED', () => {
      // 테스트 구현
    });
  });
});

// ❌ ANTI-PATTERN: 모호한 테스트 명칭
describe('tests', () => {
  it('works', () => {
    // 테스트 실패 시 무엇이 잘못되었는지 파악 어려움
  });

  it('todo test', () => {
    // 너무 일반적
  });
});
```

---

### 4.4 MVP 기간 현실적 테스트 범위

**백엔드 - 필수 단위 테스트 (4시간):**

```javascript
// services/authService.test.js
describe('authService', () => {
  describe('validateCredentials', () => {
    it('should return user if email and password match', async () => {
      const mockUser = { id: 1, email: 'test@example.com', password_hash: 'hashed' };
      // Mock userRepository.findByEmail
      // Test: validateCredentials(email, password) → user
    });

    it('should throw INVALID_CREDENTIALS if password does not match', async () => {
      // Mock userRepository.findByEmail with wrong password
      // Expect: throw AppError with code INVALID_CREDENTIALS
    });

    it('should throw INVALID_CREDENTIALS if user not found', async () => {
      // Mock userRepository.findByEmail → null
      // Expect: throw AppError
    });
  });
});

// services/todoService.test.js
describe('todoService', () => {
  describe('createTodo', () => {
    it('should create todo with PENDING status', async () => {
      const todoData = { userId: 1, categoryId: 1, title: 'Test' };
      // Mock categoryRepository.findById → valid category
      // Mock todoRepository.create → new todo
      // Test: expect status === 'PENDING'
    });

    it('should throw CATEGORY_NOT_FOUND if category does not exist', async () => {
      // Mock categoryRepository.findById → null
      // Expect: throw AppError with code CATEGORY_NOT_FOUND
    });

    it('should throw CATEGORY_NOT_FOUND if category owner is different', async () => {
      const todoData = { userId: 1, categoryId: 1, title: 'Test' };
      const category = { id: 1, userId: 2 };  // 다른 사용자 카테고리
      // Mock categoryRepository.findById → category
      // Expect: throw AppError
    });
  });
});
```

**프론트엔드 - 선택적 (시간 부족 시 생략 가능):**

```javascript
// utils/validation.test.js
describe('validation', () => {
  describe('isValidEmail', () => {
    it('should return true for valid email', () => {
      expect(isValidEmail('test@example.com')).toBe(true);
    });

    it('should return false for invalid email', () => {
      expect(isValidEmail('invalid-email')).toBe(false);
    });
  });
});

// hooks/useTodosQuery.test.js (선택)
describe('useTodosQuery', () => {
  it('should fetch todos on mount', () => {
    // Mock useQuery with todoApi.fetchTodos
    // Test: expect fetchTodos to be called
  });
});
```

**주요 API 엔드포인트 통합 테스트 (4시간):**

```javascript
// __tests__/integration/todoApi.integration.test.js
describe('POST /api/todos', () => {
  it('should create todo with valid payload', async () => {
    const token = generateTestToken(userId);
    const response = await request(app)
      .post('/api/todos')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Test Todo', categoryId: 1 });

    expect(response.status).toBe(201);
    expect(response.body.data.status).toBe('PENDING');
  });

  it('should return 401 if not authenticated', async () => {
    const response = await request(app)
      .post('/api/todos')
      .send({ title: 'Test Todo', categoryId: 1 });

    expect(response.status).toBe(401);
  });

  it('should return 400 if title is missing', async () => {
    const token = generateTestToken(userId);
    const response = await request(app)
      .post('/api/todos')
      .set('Authorization', `Bearer ${token}`)
      .send({ categoryId: 1 });

    expect(response.status).toBe(400);
  });
});
```

---

### 4.5 코드 리뷰 체크리스트

**PR 병합 전 확인 항목:**

- [ ] **아키텍처**
  - [ ] 계층 분리 준수 (컨트롤러에 DB 쿼리 없는가?)
  - [ ] 단방향 의존성 유지 (역방향 참조 없는가?)
  - [ ] 단일 책임 원칙 준수 (함수/클래스가 하나의 책임만 가지는가?)

- [ ] **코드 품질**
  - [ ] ESLint 통과 (`npm run lint`)
  - [ ] 네이밍 규칙 준수 (camelCase, PascalCase 등)
  - [ ] 주석 필요한 곳에만 존재 (자명한 코드는 주석 불필요)
  - [ ] 콘솔 로그 제거 또는 로깅 유틸로 교체

- [ ] **보안**
  - [ ] 민감한 정보 노출 (API 키, DB 비밀번호) 없는가?
  - [ ] SQL Injection 방지 (파라미터화 쿼리 사용하는가?)
  - [ ] 입력 유효성 검사 존재하는가?
  - [ ] 환경변수 .env 파일에서 로드하는가?

- [ ] **테스트**
  - [ ] 새로운 비즈니스 로직에 단위 테스트 추가되었는가?
  - [ ] 기존 테스트 깨뜨리지 않았는가?
  - [ ] 변경사항 관련 테스트 통과하는가?

- [ ] **문서화**
  - [ ] API 명세 업데이트되었는가? (기능 추가 시)
  - [ ] README 또는 CONTRIBUTING 가이드 필요한 업데이트되었는가?
  - [ ] 복잡한 로직에 설명 주석 있는가?

- [ ] **배포 준비**
  - [ ] 마이그레이션 필요한가? (DB 스키마 변경 시)
  - [ ] 환경변수 추가되었는가? (필요 시 배포팀에 알림)
  - [ ] 롤백 계획이 있는가? (주요 변경사항의 경우)

---

## 5. 설정, 보안 및 운영

### 5.1 환경변수 관리

**프론트엔드 (.env 파일):**

```bash
# .env.development
REACT_APP_API_URL=http://localhost:5000
REACT_APP_ENV=development

# .env.production
REACT_APP_API_URL=https://api.todolist.com
REACT_APP_ENV=production

# .env.local (개인 개발용, .gitignore에 포함)
REACT_APP_DEBUG=true
```

**백엔드 (.env 파일):**

```bash
# .env.development
NODE_ENV=development
PORT=5000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=todolist_dev
DB_USER=dev_user
DB_PASSWORD=dev_password
JWT_SECRET=dev-secret-key-min-32-chars-long
JWT_EXPIRY=24h
LOG_LEVEL=debug

# .env.production (배포 시스템이 주입)
NODE_ENV=production
PORT=5000
DB_HOST=prod-db-server.com
DB_PORT=5432
DB_NAME=todolist_prod
DB_USER=prod_user
DB_PASSWORD=${VAULT_DB_PASSWORD}  # 비밀금고에서 주입
JWT_SECRET=${VAULT_JWT_SECRET}    # 비밀금고에서 주입
JWT_EXPIRY=7d
LOG_LEVEL=error
```

**필수 .gitignore 항목:**

```bash
# 프론트엔드
.env.local
.env.*.local

# 백엔드
.env
.env.local
.env.*.local
node_modules/
dist/
build/

# IDE
.vscode/
.idea/
*.swp
*.swo
*~

# OS
.DS_Store
Thumbs.db

# 로그
logs/
*.log
npm-debug.log*
```

---

### 5.2 시크릿 관리

**원칙:**
- 모든 시크릿은 **환경변수**로 관리
- 코드에 절대 하드코딩하지 않기
- 개발/운영 시크릿 완전히 분리

**JWT_SECRET 최소 요구사항 (HS-512 사용):**

```javascript
// config/jwt.js
const crypto = require('crypto');

// JWT_SECRET 최소 64바이트 (512비트)
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET || JWT_SECRET.length < 64) {
  throw new Error('JWT_SECRET must be at least 64 bytes');
}

// 개발 환경에서 테스트용 키 생성
if (process.env.NODE_ENV === 'development' && !process.env.JWT_SECRET) {
  process.env.JWT_SECRET = crypto.randomBytes(64).toString('hex');
  console.warn('Using generated JWT_SECRET for development');
}

const jwtConfig = {
  algorithm: 'HS512',
  secret: JWT_SECRET,
  expiresIn: process.env.JWT_EXPIRY || '24h'
};

module.exports = jwtConfig;
```

**DB 접속 정보 보호:**

```javascript
// ✅ GOOD: 환경변수 사용
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: process.env.NODE_ENV === 'production' ? true : false
});

// ❌ ANTI-PATTERN: 하드코딩
const pool = new Pool({
  host: 'prod-db.example.com',
  password: 'admin123'
});
```

---

### 5.3 CORS 설정

**프론트엔드 (React):**

```javascript
// api/client.js
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL,
  withCredentials: true,  // 쿠키/인증서 포함
  headers: {
    'Content-Type': 'application/json'
  }
});

// JWT 토큰을 Authorization 헤더에 자동 추가
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);
```

**백엔드 (Express):**

```javascript
// app.js
const cors = require('cors');
const express = require('express');

const app = express();

// CORS 설정
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'];
    
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,  // 쿠키/인증서 허용
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
app.use(express.json());

// 라우트 등록
app.use('/api/auth', authRoutes);
app.use('/api/todos', authMiddleware, todoRoutes);
// ...
```

**.env 설정:**

```bash
# .env.development
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001

# .env.production
ALLOWED_ORIGINS=https://todolist.com,https://www.todolist.com
```

---

### 5.4 에러 응답 형식 표준화

**표준 응답 형식:**

```javascript
// ✅ GOOD: 일관된 응답 형식
// 성공 응답
{
  "success": true,
  "data": {
    "id": 1,
    "email": "user@example.com",
    "token": "eyJhbGc..."
  }
}

// 실패 응답
{
  "success": false,
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "Email or password is incorrect"
  }
}

// 검증 오류 (상세)
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      {
        "field": "email",
        "message": "Invalid email format"
      },
      {
        "field": "password",
        "message": "Password must be at least 8 characters"
      }
    ]
  }
}
```

**백엔드 구현:**

```javascript
// utils/response.js
export class AppError extends Error {
  constructor(statusCode, errorCode, message, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.details = details;
  }
}

// middlewares/errorHandler.js
export const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const response = {
    success: false,
    error: {
      code: err.errorCode || 'INTERNAL_SERVER_ERROR',
      message: err.message
    }
  };

  if (err.details) {
    response.error.details = err.details;
  }

  // 운영 환경에서는 스택 트레이스 숨김
  if (process.env.NODE_ENV !== 'production') {
    response.error.stack = err.stack;
  }

  res.status(statusCode).json(response);
};

// 사용 예시
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const errors = [];
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.push({ field: 'email', message: 'Invalid email format' });
    }
    if (!password || password.length < 8) {
      errors.push({ field: 'password', message: 'Password must be at least 8 characters' });
    }

    if (errors.length > 0) {
      throw new AppError(
        400,
        'VALIDATION_ERROR',
        'Validation failed',
        errors
      );
    }

    const user = await authService.validateCredentials(email, password);
    res.json({
      success: true,
      data: { user, token: generateToken(user) }
    });
  } catch (error) {
    next(error);
  }
};
```

---

### 5.5 로깅 원칙

**로깅 전략:**

```javascript
// utils/logger.js
class Logger {
  constructor() {
    this.logLevel = process.env.LOG_LEVEL || 'info';
  }

  debug(message, data = {}) {
    if (this.shouldLog('debug')) {
      console.log(`[DEBUG] ${this.timestamp()} ${message}`, data);
    }
  }

  info(message, data = {}) {
    if (this.shouldLog('info')) {
      console.log(`[INFO] ${this.timestamp()} ${message}`, data);
    }
  }

  warn(message, data = {}) {
    if (this.shouldLog('warn')) {
      console.warn(`[WARN] ${this.timestamp()} ${message}`, data);
    }
  }

  error(message, error = {}) {
    if (this.shouldLog('error')) {
      console.error(`[ERROR] ${this.timestamp()} ${message}`, error);
    }
  }

  shouldLog(level) {
    const levels = { debug: 0, info: 1, warn: 2, error: 3 };
    return levels[level] >= levels[this.logLevel];
  }

  timestamp() {
    return new Date().toISOString();
  }
}

export const logger = new Logger();
```

**요청/응답 로깅 미들웨어:**

```javascript
// middlewares/requestLogger.js
import { logger } from '../utils/logger';

export const requestLogger = (req, res, next) => {
  const startTime = Date.now();

  // 요청 로그
  logger.info(`${req.method} ${req.path}`, {
    userId: req.user?.id,
    query: req.query,
    body: sanitizeBody(req.body)  // 민감한 정보 제거
  });

  // 응답 로그
  const originalJson = res.json;
  res.json = function (data) {
    const duration = Date.now() - startTime;
    logger.info(`${req.method} ${req.path} completed`, {
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      userId: req.user?.id
    });
    return originalJson.call(this, data);
  };

  next();
};

function sanitizeBody(body) {
  if (!body) return body;
  const sanitized = { ...body };
  delete sanitized.password;
  delete sanitized.passwordHash;
  return sanitized;
}
```

**에러 로깅:**

```javascript
// middlewares/errorHandler.js
export const errorHandler = (err, req, res, next) => {
  // 에러 로그 (상세)
  logger.error(`${req.method} ${req.path}`, {
    statusCode: err.statusCode || 500,
    errorCode: err.errorCode,
    message: err.message,
    userId: req.user?.id,
    stack: err.stack
  });

  // 응답
  res.status(err.statusCode || 500).json({
    success: false,
    error: {
      code: err.errorCode || 'INTERNAL_SERVER_ERROR',
      message: err.message
    }
  });
};
```

---

### 5.6 SQL Injection 방지

**원칙:**  
**모든 SQL 쿼리는 파라미터화된 쿼리를 사용해야 한다.**

```javascript
// ✅ GOOD: 파라미터화 쿼리
export const findByEmail = async (email) => {
  const result = await db.query(
    'SELECT * FROM users WHERE email = $1',
    [email]  // 파라미터 분리
  );
  return result.rows[0];
};

export const findTodosByStatus = async (userId, status) => {
  const result = await db.query(
    'SELECT * FROM todos WHERE user_id = $1 AND status = $2',
    [userId, status]  // 모든 변수를 파라미터로 전달
  );
  return result.rows;
};

export const createTodo = async (userId, categoryId, title) => {
  const result = await db.query(
    'INSERT INTO todos (user_id, category_id, title, status, created_at) VALUES ($1, $2, $3, $4, $5) RETURNING *',
    [userId, categoryId, title, 'PENDING', new Date()]
  );
  return result.rows[0];
};

// ❌ ANTI-PATTERN: 문자열 연결 (SQL Injection 위험)
export const findByEmail = async (email) => {
  // 공격자가 email에 "' OR '1'='1" 입력 가능
  const query = `SELECT * FROM users WHERE email = '${email}'`;
  const result = await db.query(query);
  return result.rows[0];
};

// ❌ ANTI-PATTERN: 일부만 파라미터화
export const findTodosByStatus = async (userId, status) => {
  const query = `SELECT * FROM todos WHERE user_id = $1 AND status = '${status}'`;
  const result = await db.query(query, [userId]);  // status는 파라미터화되지 않음
  return result.rows;
};
```

**입력 유효성 검사 (추가 보안):**

```javascript
// utils/validation.js
export const validateTodoCreation = (title, categoryId) => {
  const errors = [];

  if (!title || typeof title !== 'string') {
    errors.push('Title must be a non-empty string');
  }

  if (title.length > MAX_TITLE_LENGTH) {
    errors.push(`Title must not exceed ${MAX_TITLE_LENGTH} characters`);
  }

  if (!categoryId || typeof categoryId !== 'number' || categoryId <= 0) {
    errors.push('Category ID must be a positive number');
  }

  return errors;
};

// controllers/todoController.js
export const createTodo = async (req, res, next) => {
  try {
    const { title, categoryId } = req.body;
    const userId = req.user.id;

    // 유효성 검사
    const validationErrors = validateTodoCreation(title, categoryId);
    if (validationErrors.length > 0) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Validation failed', validationErrors);
    }

    const todo = await todoService.createTodo(userId, { title, categoryId });
    res.status(201).json({ success: true, data: todo });
  } catch (error) {
    next(error);
  }
};
```

---

## 6. 프론트엔드 디렉토리 구조

```
frontend/
├── public/
│   ├── index.html
│   ├── favicon.ico
│   └── manifest.json
│
├── src/
│   ├── api/                           # HTTP 통신 계층
│   │   ├── client.js                  # axios 인스턴스, 인터셉터
│   │   ├── authApi.js                 # 인증 관련 API 함수
│   │   ├── todoApi.js                 # 할일 관련 API 함수
│   │   ├── categoryApi.js             # 카테고리 관련 API 함수
│   │   └── userApi.js                 # 사용자 관련 API 함수
│   │
│   ├── components/                    # 재사용 가능한 UI 컴포넌트
│   │   ├── common/
│   │   │   ├── Button.jsx             # 공통 버튼 컴포넌트
│   │   │   ├── Input.jsx              # 공통 입력 필드
│   │   │   ├── Modal.jsx              # 공통 모달
│   │   │   ├── Spinner.jsx            # 로딩 스피너
│   │   │   └── ErrorMessage.jsx       # 에러 메시지
│   │   ├── LoginForm.jsx              # 로그인 폼
│   │   ├── RegisterForm.jsx           # 회원가입 폼
│   │   ├── TodoItem.jsx               # 할일 아이템
│   │   ├── TodoList.jsx               # 할일 목록
│   │   ├── CategorySelect.jsx         # 카테고리 선택
│   │   └── Header.jsx                 # 헤더/네비게이션
│   │
│   ├── pages/                         # 라우트 단위 페이지 컴포넌트
│   │   ├── LoginPage.jsx              # 로그인 페이지
│   │   ├── RegisterPage.jsx           # 회원가입 페이지
│   │   ├── DashboardPage.jsx          # 대시보드/메인 페이지
│   │   ├── TodoDetailPage.jsx         # 할일 상세 페이지 (선택)
│   │   └── NotFoundPage.jsx           # 404 페이지
│   │
│   ├── hooks/                         # 커스텀 훅
│   │   ├── useTodosQuery.js           # TanStack Query 훅: 할일 조회
│   │   ├── useTodoMutation.js         # TanStack Query 훅: 할일 생성/수정/삭제
│   │   ├── useCategoriesQuery.js      # TanStack Query 훅: 카테고리 조회
│   │   ├── useAuth.js                 # 인증 관련 훅 (Zustand 스토어)
│   │   ├── useLocalStorage.js         # 로컬스토리지 커스텀 훅
│   │   └── useDebounce.js             # 디바운싱 커스텀 훅
│   │
│   ├── store/                         # Zustand 전역 상태
│   │   ├── authStore.js               # 인증 상태 (로그인 사용자, 토큰)
│   │   ├── uiStore.js                 # UI 상태 (모달 열림/닫힘, 토스트 메시지)
│   │   └── filterStore.js             # 필터/정렬 상태 (선택)
│   │
│   ├── utils/                         # 순수 유틸 함수
│   │   ├── dateUtils.js               # 날짜 처리 함수
│   │   ├── validation.js              # 입력 유효성 검사
│   │   ├── formatters.js              # 데이터 포맷팅 함수
│   │   └── errorHandler.js            # 에러 처리 유틸
│   │
│   ├── constants/                     # 상수 정의
│   │   ├── errors.js                  # 에러 코드
│   │   ├── api.js                     # API 엔드포인트, 타임아웃 등
│   │   ├── validation.js              # 검증 규칙 상수
│   │   └── todoStatus.js              # 할일 상태 상수 (PENDING, COMPLETED, OVERDUE)
│   │
│   ├── styles/                        # 글로벌 스타일
│   │   ├── globals.css                # 글로벌 스타일
│   │   ├── tailwind.css               # Tailwind 글로벌 설정
│   │   └── variables.css              # CSS 변수 정의
│   │
│   ├── App.jsx                        # 루트 컴포넌트, 라우팅 정의
│   ├── index.jsx                      # 진입점
│   └── index.css                      # 글로벌 스타일 (기본)
│
├── .env.development                   # 개발 환경 설정
├── .env.production                    # 운영 환경 설정
├── .eslintrc.js                       # ESLint 설정
├── .prettierrc.js                     # Prettier 설정
├── package.json
├── package-lock.json
└── tailwind.config.js                 # Tailwind CSS 설정
```

**각 디렉토리 세부 설명:**

### api/ - HTTP 통신 계층

**역할:** Backend와의 모든 통신을 담당

**포함 대상:**
- axios/fetch 인스턴스 설정
- API 함수 (GET, POST, PUT, DELETE)
- 요청/응답 인터셉터 (JWT 토큰 자동 추가, 에러 처리)

**제한사항:**
- 비즈니스 로직 금지
- 상태 관리 금지 (TanStack Query/Zustand에서 처리)

**파일 예시:**

```javascript
// api/client.js - axios 인스턴스
import axios from 'axios';
import { useAuthStore } from '../store/authStore';

export const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' }
});

// JWT 토큰 자동 추가
api.interceptors.request.use((config) => {
  const { token } = useAuthStore.getState();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 에러 응답 처리
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // 토큰 만료 시 로그아웃 처리 (선택사항)
      useAuthStore.getState().logout();
    }
    return Promise.reject(error);
  }
);
```

```javascript
// api/todoApi.js
import { api } from './client';

export const fetchTodos = async () => {
  const response = await api.get('/todos');
  return response.data.data;  // API 응답 구조에 맞춰 변환
};

export const fetchTodoById = async (id) => {
  const response = await api.get(`/todos/${id}`);
  return response.data.data;
};

export const createTodo = async (todoData) => {
  const response = await api.post('/todos', todoData);
  return response.data.data;
};

export const updateTodo = async (id, updates) => {
  const response = await api.put(`/todos/${id}`, updates);
  return response.data.data;
};

export const deleteTodo = async (id) => {
  await api.delete(`/todos/${id}`);
};
```

### components/ - UI 컴포넌트

**역할:** 재사용 가능한 UI 컴포넌트

**포함 대상:**
- 프레젠테이션 컴포넌트 (JSX 렌더링만)
- 폼 입력 컴포넌트
- 공통 UI 요소 (버튼, 모달, 스피너 등)

**제한사항:**
- API 직접 호출 금지
- 글로벌 상태 구독 금지 (prop으로 전달)
- 비즈니스 로직 금지

**파일 예시:**

```javascript
// components/TodoItem.jsx
export function TodoItem({ todo, onStatusChange, onDelete }) {
  return (
    <div className="todo-item">
      <h3>{todo.title}</h3>
      <p className="text-gray-500">{todo.description}</p>
      
      <select 
        value={todo.status}
        onChange={(e) => onStatusChange(todo.id, e.target.value)}
      >
        <option value="PENDING">Pending</option>
        <option value="COMPLETED">Completed</option>
      </select>

      <button onClick={() => onDelete(todo.id)}>Delete</button>
    </div>
  );
}
```

### pages/ - 페이지 컴포넌트

**역할:** 라우트에 매핑되는 전체 페이지

**포함 대상:**
- 라우트 단위 컴포넌트
- 여러 컴포넌트의 조합
- 페이지 레벨의 상태 관리 (TanStack Query/Zustand)

**파일 예시:**

```javascript
// pages/DashboardPage.jsx
import { useTodosQuery } from '../hooks/useTodosQuery';
import { useAuthStore } from '../store/authStore';
import TodoList from '../components/TodoList';
import Header from '../components/Header';

export function DashboardPage() {
  const { data: todos, isLoading } = useTodosQuery();
  const { user, logout } = useAuthStore();

  return (
    <div>
      <Header user={user} onLogout={logout} />
      {isLoading ? <Spinner /> : <TodoList todos={todos} />}
    </div>
  );
}
```

### hooks/ - 커스텀 훅

**역할:** 로직 재사용 (데이터 페칭, 상태 관리)

**포함 대상:**
- TanStack Query 훅 (useQuery, useMutation)
- Zustand 스토어 접근
- 커스텀 로직 (DOM 조작, 이벤트 처리 등)

**파일 예시:**

```javascript
// hooks/useTodosQuery.js
import { useQuery } from '@tanstack/react-query';
import { fetchTodos } from '../api/todoApi';

export function useTodosQuery() {
  return useQuery({
    queryKey: ['todos'],
    queryFn: fetchTodos,
    staleTime: 5 * 60 * 1000  // 5분
  });
}

// hooks/useTodoMutation.js
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createTodo, updateTodo, deleteTodo } from '../api/todoApi';

export function useCreateTodoMutation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: createTodo,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['todos'] });
    }
  });
}
```

### store/ - Zustand 상태

**역할:** 클라이언트 글로벌 상태 관리

**포함 대상:**
- 인증 정보 (로그인 사용자, 토큰)
- UI 상태 (모달, 사이드바, 토스트 메시지)
- 로컬 UI 설정 (테마, 언어 선택)

**제한사항:**
- 서버 상태 저장 금지 (TanStack Query에서 관리)
- 복잡한 비즈니스 로직 금지

**파일 예시:**

```javascript
// store/authStore.js
import { create } from 'zustand';

export const useAuthStore = create((set) => ({
  token: localStorage.getItem('auth_token') || null,
  user: null,
  isLoggedIn: false,

  setAuth: (user, token) => set({
    user,
    token,
    isLoggedIn: true
  }),

  logout: () => {
    localStorage.removeItem('auth_token');
    set({ user: null, token: null, isLoggedIn: false });
  }
}));

// store/uiStore.js
export const useUiStore = create((set) => ({
  isModalOpen: false,
  toast: null,

  openModal: () => set({ isModalOpen: true }),
  closeModal: () => set({ isModalOpen: false }),
  
  showToast: (message, type = 'info') => {
    set({ toast: { message, type } });
    setTimeout(() => set({ toast: null }), 3000);
  }
}));
```

### utils/ - 유틸 함수

**역할:** 순수 함수 모음

**포함 대상:**
- 날짜/시간 처리
- 문자열 포맷팅
- 입력 유효성 검사
- 계산 함수

**파일 예시:**

```javascript
// utils/dateUtils.js
export function formatDate(date) {
  return new Date(date).toLocaleDateString('ko-KR');
}

export function isOverdue(dueDate, status) {
  return new Date(dueDate) < new Date() && status === 'PENDING';
}

export function getDaysUntilDue(dueDate) {
  const today = new Date();
  const due = new Date(dueDate);
  return Math.ceil((due - today) / (1000 * 60 * 60 * 24));
}

// utils/validation.js
export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function validateTodoTitle(title) {
  if (!title || typeof title !== 'string') {
    return 'Title must be a non-empty string';
  }
  if (title.length > 255) {
    return 'Title must not exceed 255 characters';
  }
  return null;  // 유효함
}
```

### constants/ - 상수

**파일 예시:**

```javascript
// constants/errors.js
export const ERROR_CODES = {
  INVALID_EMAIL: 'INVALID_EMAIL',
  PASSWORD_TOO_SHORT: 'PASSWORD_TOO_SHORT',
  EMAIL_EXISTS: 'EMAIL_EXISTS',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  NETWORK_ERROR: 'NETWORK_ERROR'
};

// constants/api.js
export const API_CONFIG = {
  BASE_URL: process.env.REACT_APP_API_URL,
  TIMEOUT: 10000,
  RETRY_COUNT: 3
};

// constants/todoStatus.js
export const TODO_STATUS = {
  PENDING: 'PENDING',
  COMPLETED: 'COMPLETED',
  OVERDUE: 'OVERDUE'
};

export const STATUS_LABELS = {
  PENDING: '진행 중',
  COMPLETED: '완료',
  OVERDUE: '기한 초과'
};
```

---

## 7. 백엔드 디렉토리 구조

```
backend/
├── src/
│   ├── routes/                        # Express 라우터
│   │   ├── authRoutes.js              # POST /auth/register, POST /auth/login
│   │   ├── todoRoutes.js              # CRUD 라우트
│   │   ├── categoryRoutes.js          # CRUD 라우트
│   │   └── userRoutes.js              # GET /users/me
│   │
│   ├── controllers/                   # 요청/응답 처리
│   │   ├── authController.js          # 인증 로직
│   │   ├── todoController.js          # 할일 CRUD 로직
│   │   ├── categoryController.js      # 카테고리 CRUD 로직
│   │   └── userController.js          # 사용자 조회 로직
│   │
│   ├── services/                      # 비즈니스 로직
│   │   ├── authService.js             # 가입, 로그인, 토큰 생성
│   │   ├── todoService.js             # 할일 비즈니스 로직
│   │   ├── categoryService.js         # 카테고리 비즈니스 로직
│   │   └── userService.js             # 사용자 비즈니스 로직
│   │
│   ├── repositories/                  # DB 쿼리 (pg)
│   │   ├── userRepository.js          # users 테이블
│   │   ├── todoRepository.js          # todos 테이블
│   │   ├── categoryRepository.js      # categories 테이블
│   │   └── baseRepository.js          # 공통 DB 함수 (선택)
│   │
│   ├── middlewares/                   # Express 미들웨어
│   │   ├── authMiddleware.js          # JWT 검증
│   │   ├── errorHandler.js            # 글로벌 에러 핸들러
│   │   ├── requestLogger.js           # 요청 로깅
│   │   └── validationMiddleware.js    # 입력 검증 (선택)
│   │
│   ├── utils/                         # 순수 유틸 함수
│   │   ├── jwtUtils.js                # JWT 생성, 검증
│   │   ├── passwordUtils.js           # 비밀번호 해싱
│   │   ├── validation.js              # 입력 검증 함수
│   │   ├── errorHandler.js            # AppError 클래스
│   │   └── logger.js                  # 로깅 유틸
│   │
│   ├── constants/                     # 상수 정의
│   │   ├── errors.js                  # 에러 코드
│   │   ├── httpStatus.js              # HTTP 상태 코드
│   │   ├── validation.js              # 검증 상수
│   │   └── todoStatus.js              # 할일 상태 상수
│   │
│   ├── config/                        # 설정
│   │   ├── database.js                # 데이터베이스 연결
│   │   ├── jwt.js                     # JWT 설정
│   │   └── env.js                     # 환경변수 검증
│   │
│   ├── app.js                         # Express 앱 설정 (미들웨어, 라우트 등록)
│   └── server.js                      # 서버 진입점 (포트 리스닝)
│
├── migrations/                        # 데이터베이스 마이그레이션 (선택)
│   ├── 001-create-users.sql
│   ├── 002-create-categories.sql
│   └── 003-create-todos.sql
│
├── seeds/                             # 시드 데이터 (테스트용)
│   └── seed.js
│
├── .env.development                   # 개발 환경 설정
├── .env.production                    # 운영 환경 설정
├── .eslintrc.js                       # ESLint 설정
├── .prettierrc.js                     # Prettier 설정
├── package.json
├── package-lock.json
└── README.md
```

**각 디렉토리 세부 설명:**

### routes/ - Express 라우터

**역할:** HTTP 요청을 컨트롤러로 라우팅

**포함 대상:**
- Router 정의
- 라우트 경로
- 미들웨어 체인
- 컨트롤러 함수 바인딩

**제한사항:**
- 비즈니스 로직 금지
- DB 쿼리 금지

**파일 예시:**

```javascript
// routes/authRoutes.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

router.post('/register', authController.register);
router.post('/login', authController.login);

module.exports = router;

// routes/todoRoutes.js
const authMiddleware = require('../middlewares/authMiddleware');
const todoController = require('../controllers/todoController');

router.get('/todos', authMiddleware, todoController.getTodos);
router.post('/todos', authMiddleware, todoController.createTodo);
router.put('/todos/:id', authMiddleware, todoController.updateTodo);
router.delete('/todos/:id', authMiddleware, todoController.deleteTodo);

module.exports = router;
```

### controllers/ - 컨트롤러

**역할:** 요청 파싱, 응답 생성, 에러 처리

**포함 대상:**
- 요청 검증
- 서비스 호출
- 응답 포맷팅
- HTTP 상태 코드 설정

**제한사항:**
- 비즈니스 로직 금지 (Service에서 처리)
- DB 직접 접근 금지 (Repository 사용)

**파일 예시:**

```javascript
// controllers/todoController.js
const todoService = require('../services/todoService');
const { AppError } = require('../utils/errorHandler');
const { HTTP_STATUS, ERROR_CODES } = require('../constants');

exports.getTodos = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const todos = await todoService.getUserTodos(userId);
    res.json({ success: true, data: todos });
  } catch (error) {
    next(error);
  }
};

exports.createTodo = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { title, categoryId, description, dueDate } = req.body;

    // 유효성 검사
    if (!title || !categoryId) {
      throw new AppError(
        HTTP_STATUS.BAD_REQUEST,
        ERROR_CODES.VALIDATION_ERROR,
        'Title and categoryId are required'
      );
    }

    const todo = await todoService.createTodo(userId, {
      title,
      categoryId,
      description,
      dueDate
    });

    res.status(HTTP_STATUS.CREATED).json({ success: true, data: todo });
  } catch (error) {
    next(error);
  }
};

exports.updateTodo = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const todoId = req.params.id;
    const updates = req.body;

    const todo = await todoService.updateTodo(userId, todoId, updates);
    res.json({ success: true, data: todo });
  } catch (error) {
    next(error);
  }
};

exports.deleteTodo = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const todoId = req.params.id;

    await todoService.deleteTodo(userId, todoId);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};
```

### services/ - 서비스 (비즈니스 로직)

**역할:** 비즈니스 로직 구현

**포함 대상:**
- 복잡한 데이터 처리
- 여러 저장소 조합
- 유효성 검사
- 트랜잭션

**제한사항:**
- HTTP 처리 금지 (Controller에서 처리)
- DB 쿼리 직접 실행 금지 (Repository 사용)

**파일 예시:**

```javascript
// services/todoService.js
const todoRepository = require('../repositories/todoRepository');
const categoryRepository = require('../repositories/categoryRepository');
const { AppError } = require('../utils/errorHandler');
const { HTTP_STATUS, ERROR_CODES } = require('../constants');

exports.getUserTodos = async (userId) => {
  const todos = await todoRepository.findByUserId(userId);
  
  // 비즈니스 로직: 상태 변환 (OVERDUE 계산)
  return todos.map(todo => ({
    ...todo,
    isOverdue: new Date(todo.due_date) < new Date() && todo.status === 'PENDING'
  }));
};

exports.createTodo = async (userId, todoData) => {
  // 비즈니스 로직: 카테고리 소유권 확인
  const category = await categoryRepository.findById(todoData.categoryId);
  if (!category || category.user_id !== userId) {
    throw new AppError(
      HTTP_STATUS.NOT_FOUND,
      ERROR_CODES.CATEGORY_NOT_FOUND,
      'Category not found'
    );
  }

  const todo = await todoRepository.create({
    user_id: userId,
    category_id: todoData.categoryId,
    title: todoData.title,
    description: todoData.description,
    due_date: todoData.dueDate,
    status: 'PENDING',
    created_at: new Date()
  });

  return transformTodoResponse(todo);
};

exports.updateTodo = async (userId, todoId, updates) => {
  const todo = await todoRepository.findById(todoId);
  
  if (!todo || todo.user_id !== userId) {
    throw new AppError(
      HTTP_STATUS.NOT_FOUND,
      ERROR_CODES.TODO_NOT_FOUND,
      'Todo not found'
    );
  }

  // 상태 변경 시 completedAt 설정
  if (updates.status === 'COMPLETED' && todo.status !== 'COMPLETED') {
    updates.completed_at = new Date();
  }

  const updated = await todoRepository.update(todoId, updates);
  return transformTodoResponse(updated);
};

exports.deleteTodo = async (userId, todoId) => {
  const todo = await todoRepository.findById(todoId);
  
  if (!todo || todo.user_id !== userId) {
    throw new AppError(
      HTTP_STATUS.FORBIDDEN,
      ERROR_CODES.FORBIDDEN,
      'You do not have permission to delete this todo'
    );
  }

  await todoRepository.delete(todoId);
};

// 응답 변환 헬퍼
function transformTodoResponse(todo) {
  return {
    id: todo.id,
    userId: todo.user_id,
    categoryId: todo.category_id,
    title: todo.title,
    description: todo.description,
    status: todo.status,
    dueDate: todo.due_date,
    completedAt: todo.completed_at,
    createdAt: todo.created_at,
    updatedAt: todo.updated_at
  };
}
```

### repositories/ - 저장소 (DB 접근)

**역할:** 데이터베이스 쿼리 실행

**포함 대상:**
- SELECT, INSERT, UPDATE, DELETE 쿼리
- 파라미터화 쿼리
- 트랜잭션 (필요 시)

**제한사항:**
- 비즈니스 로직 금지
- 데이터 변환 금지 (snake_case → camelCase는 Service에서)

**파일 예시:**

```javascript
// repositories/todoRepository.js
const { db } = require('../config/database');

exports.findByUserId = async (userId) => {
  const result = await db.query(
    'SELECT * FROM todos WHERE user_id = $1 ORDER BY created_at DESC',
    [userId]
  );
  return result.rows;
};

exports.findById = async (todoId) => {
  const result = await db.query(
    'SELECT * FROM todos WHERE id = $1',
    [todoId]
  );
  return result.rows[0];
};

exports.create = async (todoData) => {
  const result = await db.query(
    `INSERT INTO todos (user_id, category_id, title, description, status, due_date, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [
      todoData.user_id,
      todoData.category_id,
      todoData.title,
      todoData.description,
      todoData.status,
      todoData.due_date,
      todoData.created_at,
      todoData.created_at
    ]
  );
  return result.rows[0];
};

exports.update = async (todoId, updates) => {
  const fields = [];
  const values = [todoId];
  let paramIndex = 2;

  Object.entries(updates).forEach(([key, value]) => {
    fields.push(`${key} = $${paramIndex++}`);
    values.push(value);
  });

  fields.push(`updated_at = $${paramIndex++}`);
  values.push(new Date());

  const query = `UPDATE todos SET ${fields.join(', ')} WHERE id = $1 RETURNING *`;
  const result = await db.query(query, values);
  return result.rows[0];
};

exports.delete = async (todoId) => {
  await db.query('DELETE FROM todos WHERE id = $1', [todoId]);
};
```

### middlewares/ - 미들웨어

**역할:** 요청 전처리, 인증, 에러 처리

**파일 예시:**

```javascript
// middlewares/authMiddleware.js
const { verifyToken } = require('../utils/jwtUtils');
const { AppError } = require('../utils/errorHandler');
const { HTTP_STATUS, ERROR_CODES } = require('../constants');

module.exports = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError(
        HTTP_STATUS.UNAUTHORIZED,
        ERROR_CODES.TOKEN_INVALID,
        'Missing or invalid token'
      );
    }

    const token = authHeader.slice(7);
    const decoded = verifyToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    next(new AppError(
      HTTP_STATUS.UNAUTHORIZED,
      ERROR_CODES.TOKEN_INVALID,
      'Invalid token'
    ));
  }
};

// middlewares/errorHandler.js
const { logger } = require('../utils/logger');

module.exports = (err, req, res, next) => {
  logger.error(`${req.method} ${req.path}`, {
    statusCode: err.statusCode || 500,
    errorCode: err.errorCode,
    message: err.message
  });

  const statusCode = err.statusCode || 500;
  const response = {
    success: false,
    error: {
      code: err.errorCode || 'INTERNAL_SERVER_ERROR',
      message: err.message
    }
  };

  res.status(statusCode).json(response);
};
```

### utils/ - 유틸 함수

**파일 예시:**

```javascript
// utils/jwtUtils.js
const jwt = require('jsonwebtoken');
const { JWT_CONFIG } = require('../config/jwt');

exports.generateToken = (user) => {
  return jwt.sign(
    { id: user.id, email: user.email },
    JWT_CONFIG.secret,
    { algorithm: JWT_CONFIG.algorithm, expiresIn: JWT_CONFIG.expiresIn }
  );
};

exports.verifyToken = (token) => {
  return jwt.verify(token, JWT_CONFIG.secret, { algorithms: [JWT_CONFIG.algorithm] });
};

// utils/passwordUtils.js
const crypto = require('crypto');

exports.hashPassword = (password) => {
  return crypto.createHash('sha256').update(password).digest('hex');
};

exports.comparePassword = (password, hash) => {
  return this.hashPassword(password) === hash;
};
```

### constants/ 및 config/

**constants/errors.js:**
```javascript
exports.ERROR_CODES = {
  INVALID_EMAIL: 'INVALID_EMAIL',
  PASSWORD_TOO_SHORT: 'PASSWORD_TOO_SHORT',
  EMAIL_EXISTS: 'EMAIL_EXISTS',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  TODO_NOT_FOUND: 'TODO_NOT_FOUND',
  CATEGORY_NOT_FOUND: 'CATEGORY_NOT_FOUND',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR'
};
```

**config/database.js:**
```javascript
const { Pool } = require('pg');

const config = {
  development: {
    host: 'localhost',
    port: 5432,
    database: 'todolist_dev',
    user: 'dev_user',
    password: 'dev_password'
  },
  production: {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: true
  }
};

const currentEnv = process.env.NODE_ENV || 'development';
exports.db = new Pool(config[currentEnv]);
```

### app.js 및 server.js

**app.js - Express 앱 설정:**
```javascript
const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/authRoutes');
const todoRoutes = require('./routes/todoRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const userRoutes = require('./routes/userRoutes');
const authMiddleware = require('./middlewares/authMiddleware');
const errorHandler = require('./middlewares/errorHandler');

const app = express();

// 미들웨어
app.use(cors());
app.use(express.json());

// 라우트 등록
app.use('/api/auth', authRoutes);
app.use('/api/todos', authMiddleware, todoRoutes);
app.use('/api/categories', authMiddleware, categoryRoutes);
app.use('/api/users', authMiddleware, userRoutes);

// 에러 핸들러
app.use(errorHandler);

module.exports = app;
```

**server.js - 서버 진입점:**
```javascript
const app = require('./app');
const { logger } = require('./utils/logger');

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  logger.info(`Server is running on port ${PORT}`);
});
```

---

## 변경 이력

| 버전 | 작성일 | 주요 변경사항 |
|------|--------|------------|
| 1.0 | 2026-04-28 | 초안 작성: 최상위 원칙, 레이어 아키텍처, 코드 규칙, 테스트 전략, 설정/보안 원칙, 프론트엔드/백엔드 디렉토리 구조 정의 |
