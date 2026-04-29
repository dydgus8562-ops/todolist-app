# 스타일 가이드 (Style Guide) - TodoList 애플리케이션

본 문서는 `sample.png` 디자인을 바탕으로 프론트엔드 어플리케이션에 적용할 시각적 일관성을 위한 스타일 가이드를 정의합니다.

---

## 1. 컬러 팔레트 (Color Palette)

### 1.1 배경 및 기본 색상
| 용도 | 색상 코드 | Tailwind 예시 | 비고 |
|------|-----------|---------------|------|
| 메인 배경 | `#F4F4F4` | `bg-[#F4F4F4]` | 전체 앱 배경 |
| 사이드바 배경 | `#FFFFFF` | `bg-white` | 좌측 메뉴 영역 |
| 기본 텍스트 | `#333333` | `text-[#333333]` | 본문 및 제목 |
| 보조 텍스트 | `#7C7C7C` | `text-[#7C7C7C]` | 배지 숫자, 설명 등 |

### 1.2 포인트 및 상태 색상
| 용도 | 색상 코드 | Tailwind 예시 | 비고 |
|------|-----------|---------------|------|
| 활성 상태 (Active) | `#EBEBEB` | `bg-[#EBEBEB]` | 메뉴 선택 시 배경 |
| 강조/버튼 | `#000000` | `bg-[#333333]` | "Add Event", View Toggle 활성 |

### 1.3 카테고리/태그 파스텔 컬러
이미지 내 할일 및 리스트에 사용된 파스텔 톤입니다.
- **Red (Personal):** `#FFD6D6` (bg), `#FF4D4D` (icon)
- **Blue (Work):** `#D1F5FF` (bg), `#4DDAFF` (icon)
- **Yellow (List 1):** `#FFF4BD` (bg), `#FFD700` (icon)
- **Light Green (Tag 1):** `#DAF2D6` (bg)

---

## 2. 타이포그래피 (Typography)

- **Font Family:** `Inter`, `Segoe UI`, `sans-serif` (깨끗한 고딕 계열)
- **Headings:**
    - **H1 (월/연도):** `text-4xl`, `font-bold`
    - **H2 (메뉴 섹션):** `text-sm`, `font-bold`, `uppercase`, `tracking-wider`
- **Body:**
    - **Normal:** `text-md` (약 16px)
    - **Small:** `text-sm` (사이드바 메뉴, 숫자 등)

---

## 3. UI 컴포넌트 스타일

### 3.1 사이드바 (Sidebar)
- **레이아웃:** 너비 고정, 패딩 24px.
- **메뉴 아이템:** 
    - 상하 간격이 넉넉하며, 아이콘과 텍스트 조합.
    - 선택된 아이템은 둥근 모서리(`rounded-lg`)와 배경색(`bg-[#EBEBEB]`) 적용.
- **검색창:** 
    - `bg-[#F4F4F4]`, `rounded-md`, `border-none`.
    - 좌측에 돋보기 아이콘 배치.

### 3.2 할일/이벤트 배지 (Task Pills)
- **모양:** `rounded-md` 또는 `rounded-full` (완전 둥근 형태보다는 약간 각진 둥근 형태 선호).
- **스타일:** 배경색은 파스텔 톤, 테두리 없음. 내부 텍스트는 가독성을 위해 어두운 색상.

### 3.3 버튼 (Buttons)
- **Primary ("Add Event"):** `border border-gray-200`, `rounded-md`, `px-4`, `py-2`.
- **Toggle (Day/Week/Month):** 
    - 그룹화된 형태.
    - 선택되지 않은 항목은 배경 투명, 선택된 항목은 `bg-[#EBEBEB]`.

---

## 4. 레이아웃 및 간격 (Layout & Spacing)

- **여백 (Padding/Margin):** 8px 단위를 기본으로 사용 (`p-2`, `p-4`, `p-6` 등).
- **그리드:** 
    - 사이드바와 메인 컨텐츠 영역 구분.
    - 캘린더/목록 그리드는 경계선 없이 여백만으로 구분하여 개방감 부여.
- **둥근 모서리:** 모든 컨테이너와 입력창에 `rounded-lg` (약 8px~12px) 적용.

---

## 5. 아이콘 가이드
- **Style:** `Outline` 형태의 얇은 선 아이콘.
- **Size:** 18px ~ 20px.
