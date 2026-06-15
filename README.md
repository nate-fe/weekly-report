# NATE UI팀 업무 보고

팀원별 **일일 업무**와 **주간 업무**를 작성·조회하는 내부 보고 웹 앱입니다.  
React + Vite 프론트엔드와 Supabase(PostgreSQL) 백엔드로 구성되어 있습니다.

## 주요 기능

### 일일 업무 (`/daily`)

- 날짜별로 팀원마다 업무를 등록 (제목, 메모, 완료 여부)
- **목록** / **달력** 보기 전환
- 달력에서 날짜 클릭 시 해당 일자 팀원별 업무 팝업
- 제출 현황 표시 (`5명 중 3명 제출` 형식)
- 엑셀 다운로드

### 주간 업무 (`/weekly`)

- ISO 주차(`2026-W24`) 단위로 보고 기간(목~수) 관리
- 팀원별 탭에서 업무 추가·수정·삭제
- 업무마다 **작업 기간**(`works[]`)을 자유롭게 여러 개 등록
  - 보기 화면에서는 보고 기간 기준으로 **지난주 / 이번주 / 다음주**로 자동 분류
- **전체** 탭: 팀원별 컬러 바 달력 + 목록 보기
  - 달력 날짜 클릭 → 해당 일자 전체 팀원 업무 팝업
  - 기간 바 클릭 → 개별 업무 상세 팝업
- **임시 저장** / **임시 저장 불러오기** (Supabase `weekly_drafts` 테이블)
- **전주 불러오기**: 이전 주차 업무를 선택해 복제
- 마크다운 복사, 엑셀 다운로드

### 팀원 관리 (`/members`)

- 팀원 추가·삭제(soft delete), 레이블(FE개발 등), 컬러(달력 표시용) 설정
- 삭제된 팀원의 기존 업무 기록은 유지

## 기술 스택

| 구분 | 기술 |
|------|------|
| 프론트엔드 | React 18, Vite 5, React Router 7 |
| 백엔드 | Supabase (Postgres + REST API) |
| 기타 | SheetJS (`xlsx`) — 엑셀보내기 |

## 프로젝트 구조

```
src/
  pages/
    Daily.jsx      # 일일 업무
    Weekly.jsx     # 주간 업무
    Members.jsx    # 팀원 관리
  components/      # 달력, 업무 카드, 모달 등
  utils/
    storage.js     # Supabase 데이터 접근
    weeklyTask.js  # 주간 업무 모델·검증
    weeklyDraft.js # 임시 저장 시각 포맷
    dailyCalendar.js
    weeklyCalendar.js
    dates.js
    excel.js
  lib/supabase.js  # Supabase 클라이언트
supabase/
  schema.sql       # 전체 스키마 (신규 설치)
  migrate-*.sql    # 기존 DB 마이그레이션
  fix-permissions.sql
```

## 시작하기

### 1. 의존성 설치

```bash
npm install
```

### 2. 환경 변수

`.env.local.example`을 참고해 `.env.local`을 생성합니다.

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Supabase 대시보드 → **Settings → API**에서 URL과 `anon` 키를 확인할 수 있습니다.

### 3. Supabase 스키마

**처음 설치**하는 경우 Supabase SQL Editor에서 `supabase/schema.sql`을 실행합니다.

**이미 DB가 있는 경우** 아래 마이그레이션을 필요한 것만 순서대로 실행합니다.

| 파일 | 내용 |
|------|------|
| `migrate-members.sql` | `members.label` 컬럼 |
| `migrate-member-soft-delete.sql` | `members.deleted_at` |
| `migrate-weekly-fields.sql` | 주간 업무 기간·상태 컬럼 |
| `migrate-weekly-works.sql` | `weekly_tasks.works` JSONB |
| `migrate-weekly-drafts.sql` | `weekly_drafts` 임시 저장 테이블 |
| `fix-permissions.sql` | RLS·권한 재설정 |

### 4. 개발 서버

```bash
npm run dev
```

### 5. 프로덕션 빌드

```bash
npm run build
npm run preview   # 빌드 결과 미리보기
```

## 데이터 모델 요약

### 주간 업무 (`weekly_tasks`)

```js
{
  id, memberId, assignee, name,
  works: [{ id, content, from, to, status }],  // 자유 추가
  target: { date, memo }
}
```

레거시 `last_*` / `curr_*` / `next_*` 컬럼이 있어도 앱에서 `works`로 자동 변환합니다.

### 일일 업무 (`daily_tasks`)

날짜 + 팀원별로 여러 건의 업무(제목, 메모, 완료 여부)를 저장합니다.

## 참고

- 주간 **임시 저장**은 Supabase `weekly_drafts`에 보관됩니다. 주차를 열면 정식 저장본을 먼저 보여 주고, **임시 저장 불러오기**로 이어서 작성할 수 있습니다.
- 정식 저장 시 해당 주차의 임시 저장은 자동으로 삭제됩니다.
- 팀원 삭제는 soft delete이며, 과거 일일·주간 기록은 그대로 남습니다.
