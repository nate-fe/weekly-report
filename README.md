# NATE UI팀 업무 보고

NATE UI팀이 주간 업무를 달력·검색·개인 메모까지 한곳에서 작성하고 공유하는 **내부 업무 보고 웹앱**입니다.  
React + Vite 프론트엔드와 Supabase(PostgreSQL) 백엔드로 구성되어 있습니다.

## 주요 기능

### 팀 입장 (사번 인증)

- 최초 접속 시 **사번**(`N1234` 형식) 입력으로 입장
- `members.employee_id`에 등록된 UI팀 팀원만 이용 가능
- 사번은 브라우저 `localStorage`(`weekly-report-team-access-employee-id`)에 저장
- 헤더에 팀원 이름·호칭(팀장님/매니저님) 인사 표시

### 주간 업무 (`/weekly`)

- ISO 주차(`2026-W24`) 단위로 보고 기간(목~수) 관리
- 좌측 **주차 선택** → 가운데 **달력** + 우측 **업무 목록** 분할 레이아웃
  - 달력과 목록 사이를 드래그해 너비 조절 (`localStorage`: `weekly-list-panel-width`)
- 팀원별 탭(전체 / 개인)에서 업무 추가·수정·삭제
- 업무마다 **서비스**, **PC/모바일**, **업무 내용**, **작업 기간**(`works[]`) 등록
  - 보기 화면에서는 보고 기간 기준으로 **지난주 / 이번주 / 다음주**로 자동 분류
- **전체** 탭: 팀원 컬러 바 달력 + 읽기 전용 목록
  - 달력 **날짜 클릭** → 해당 일자 팀원별 업무 팝업 (`WeeklyDayModal`)
  - 달력 **기간 바 클릭** → 개별 업무 상세 팝업 (`CalendarEventModal`)
  - 팝업·목록 모두 `PC` / `모바일` 뱃지 + 서비스명 형식으로 표시
- **임시 저장** / **임시 저장 불러오기** (`weekly_drafts`)
- **저번주 데이터 불러오기**: 이전 주차 업무를 선택해 복제
- 마크다운 복사, 엑셀 다운로드
- 달력에 **주간회의** 표시 (설정의 요일·시간·예외 일정 반영)

### 업무 검색 (`/search`)

- 저장된 모든 주간 업무(`weekly_tasks`)를 대상으로 검색
- **서비스** · **담당자** · **작업 기간** 필터
- 결과에 주차, 담당자, 작업 내용·기간 표시

### 팀원 관리 (`/members`)

- 팀원 추가·삭제(soft delete), **사번**, 레이블(FE개발 등), 컬러(달력 표시용) 설정
- 팀장은 팀원 관리 목록에서 숨김 (입장·인사용으로 DB에는 유지)
- 삭제된 팀원의 기존 주간 업무 기록은 유지

### 설정 (`/settings`)

- **기본 주간회의**: 요일·시간
- **예외 주간회의**: 특정 날짜만 회의 일정 변경 (달력 ✓ 표시)
- **서비스 목록**: 주간 업무·업무 검색에서 사용하는 서비스명 추가·삭제
- 팀 공통 설정은 Supabase `team_settings`에 저장 (DB 미적용 시 브라우저 `localStorage` fallback)

### 개인 메모 (`/memo`)

- Notion 스타일 **페이지** 단위 메모 (사이드바 목록, 제목, 리치 텍스트 편집)
- 입장 사번(`employee_id`) 기준으로 Supabase `personal_memos`에 저장
- 볼드·이탤릭·색상·글자 크기·목록·체크박스 지원

### 라우트

| 경로 | 설명 |
|------|------|
| `/` | `/weekly`로 리다이렉트 |
| `/weekly` | 주간 업무 |
| `/search` | 업무 검색 |
| `/members` | 팀원 관리 |
| `/settings` | 팀 설정 |
| `/memo` | 개인 메모 |
| `/daily`, `/memo/signup` | `/weekly`, `/memo`로 리다이렉트 |

## 작동 원리

### 화면 구조 (주간 업무)

```
┌─────────────┬──────────────────────────┬─↔─┬──────────────┐
│  주차 목록   │         달력             │   │  업무 목록    │
│  (사이드바)  │  (팀원별 컬러 바)         │   │  (편집/조회)  │
└─────────────┴──────────────────────────┴───┴──────────────┘
```

1. **주차 선택** — `weekly_records`에서 해당 주의 `from`/`to`와 `weekly_tasks`를 불러옵니다.
2. **팀원 탭** — `전체`는 달력+조회 전용, 개인 탭에서만 업무 편집이 가능합니다.
3. **달력** — 각 업무의 `works[]` 기간을 팀원 색상 바로 렌더링합니다.
4. **업무 목록** — 같은 주차 데이터를 카드 형태로 표시·편집합니다.

### 데이터 흐름

```
TeamAccessGate (사번) + TeamSettingsProvider (팀 설정)
    ↓
React 페이지 (Weekly / WorkSearch / Settings / …)
    ↓ read / write
storage.js  ←→  Supabase REST API
    ↓              ↓
weeklyTask.js   PostgreSQL
nateServices.js   members, weekly_records, weekly_tasks
workSearch.js     weekly_drafts, team_settings, personal_memos
weeklyCalendar.js
```

- **`storage.js`**: Supabase CRUD를 담당하는 단일 접근 레이어
- **`weeklyTask.js`**: 업무 객체 정규화, `works[]` ↔ DB 행 변환, 지난주/이번주/다음주 분류
- **`nateServices.js`**: 서비스·플랫폼 파싱·조합 (서비스 목록은 `team_settings`에서 로드, 기본값 하드코딩)
- **`workSearch.js`**: 업무 검색 필터 (서비스·담당자·기간)
- **`teamMeeting.js`**: 주간회의 설정 정규화, 달력 회의일 판별
- **`teamAccess.js`**: 사번 입장, 팀원 조회, 헤더 인사
- **`weeklyCalendar.js`**: 업무 → 달력 이벤트(기간 바) 변환, 일자별 그룹핑

### 업무 모델

앱 내부에서는 아래 구조로 다룹니다.

```js
{
  id, memberId, assignee,
  service: '메인',           // NATE 서비스명 (설정에서 관리)
  platforms: ['PC', '모바일'],
  nameDetail: '메인 UI 수정', // 업무 내용
  name: '메인 PC 모바일 메인 UI 수정', // DB 저장용 합성 문자열
  works: [{ id, content, from, to, status }],
  target: { date, memo }
}
```

DB에는 `service`/`platforms`/`nameDetail` 대신 `name` 문자열과 `works` JSONB가 저장됩니다.  
과거 `last_*` / `curr_*` / `next_*` 컬럼 데이터는 로드 시 `works[]`로 자동 변환됩니다.

### 저장·임시 저장

| 동작 | 저장 위치 | 설명 |
|------|-----------|------|
| **저장** | `weekly_records` + `weekly_tasks` | 정식 보고본. 해당 주차 임시 저장은 삭제됨 |
| **임시 저장** | `weekly_drafts` | 작성 중인 초안. 주차를 바꿀 때 미저장 변경분 자동 저장 |
| **저번주 불러오기** | (메모리) | 이전 주차 `weekly_tasks`를 복제해 현재 주에 추가 |
| **팀 설정** | `team_settings` | 주간회의·서비스 목록. DB 실패 시 `localStorage`(`team-meeting-settings`) fallback |
| **개인 메모** | `personal_memos` | 사번(`employee_id`)당 `pages` JSONB |

## 기술 스택

| 구분 | 기술 |
|------|------|
| 프론트엔드 | React 18, Vite 5, React Router 7 |
| 백엔드 | Supabase (Postgres + REST API) |
| 배포 | GitHub Pages (`/weekly-report/`) |
| 기타 | SheetJS (`xlsx`) — 엑셀 내보내기 |

## 프로젝트 구조

```
src/
  App.jsx                       # 라우팅·헤더 네비
  context/
    TeamAccessContext.jsx       # 사번 입장 상태
    TeamSettingsContext.jsx     # 팀 설정(회의·서비스) 전역 로드
  pages/
    Weekly.jsx                  # 주간 업무
    WorkSearch.jsx              # 업무 검색
    Members.jsx                 # 팀원 관리
    Settings.jsx                # 팀 설정
    PersonalMemo.jsx            # 개인 메모
  components/
    TeamAccessGate.jsx          # 사번 입장 화면
    WeeklyCalendar.jsx          # 주간 달력
    WeeklyTaskCard.jsx          # 업무 카드 (보기/편집)
    WeeklyDayModal.jsx          # 날짜 클릭 팝업
    CalendarEventModal.jsx      # 기간 바 클릭 팝업
    MemoRichEditor.jsx          # 개인 메모 리치 에디터
    ServicePlatformLabel.jsx    # PC/모바일 뱃지 + 서비스명
    PrevWeekImportModal.jsx
    WorkEntryRow.jsx            # 작업 기간 입력 행
  utils/
    storage.js                  # Supabase 데이터 접근
    weeklyTask.js               # 업무 모델·검증·주차 분류
    weeklyCalendar.js           # 달력 이벤트 변환
    workSearch.js               # 업무 검색 필터
    teamMeeting.js              # 주간회의 설정
    teamAccess.js               # 사번 입장·인사
    personalMemo.js             # 개인 메모 CRUD
    nateServices.js             # 서비스·플랫폼 파싱
    employeeId.js               # 사번 입력·정규화
    dates.js, excel.js, members.js, …
  lib/supabase.js               # Supabase 클라이언트
supabase/
  schema.sql                    # 전체 스키마 (신규 설치)
  migrate-*.sql                 # 기존 DB 마이그레이션
  fix-permissions.sql
.github/workflows/
  deploy.yml                    # GitHub Pages 자동 배포
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
| `migrate-member-employee-id.sql` | `members.employee_id` + UI팀 기본 팀원 시드 |
| `migrate-weekly-fields.sql` | 주간 업무 기간·상태 컬럼 |
| `migrate-weekly-works.sql` | `weekly_tasks.works` JSONB |
| `migrate-weekly-drafts.sql` | `weekly_drafts` 임시 저장 테이블 |
| `migrate-team-settings.sql` | `team_settings` (주간회의) |
| `migrate-team-services.sql` | `team_settings.services` JSONB |
| `migrate-personal-memos-employee-id.sql` | `personal_memos` (사번 기준) |
| `migrate-personal-memo-pages.sql` | `personal_memos.pages` JSONB |
| `migrate-drop-daily-tasks.sql` | (선택) 사용하지 않는 `daily_tasks` 테이블 삭제 |
| `fix-permissions.sql` | RLS·권한 재설정 |

### 4. 개발 서버

```bash
npm run dev
```

로컬에서는 `http://localhost:5173/weekly` 로 접속합니다.  
등록된 팀원 **사번**으로 입장해야 합니다.

### 5. 프로덕션 빌드

```bash
npm run build
npm run preview   # 빌드 결과 미리보기 (base: /weekly-report/)
```

## GitHub Pages 배포

`main` 브랜치 push 시 `.github/workflows/deploy.yml`이 자동으로 빌드·배포합니다.

Repository **Settings → Secrets and variables → Actions**에 아래 시크릿을 등록해야 합니다.

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

배포 URL: `https://<org>.github.io/weekly-report/`

## 데이터 모델 (DB)

### `members`

팀원 ID, 이름, 달력 색상, 레이블, **사번**(`employee_id`), `deleted_at`(soft delete).

### `weekly_records`

주차 키(`2026-W24`), 보고 기간 `from_date` / `to_date`.

### `weekly_tasks`

주차별 업무. `member_id`, `assignee`, `name`, `works`(JSONB), `target_date` 등.

### `weekly_drafts`

주차별 임시 저장 JSON. 정식 저장 시 해당 주차 draft는 삭제됩니다.

### `team_settings`

팀 공통 설정 (`id = 'default'`). `meeting_day`, `meeting_time`, `exceptions`(JSONB), `services`(JSONB).

### `personal_memos`

사번(`employee_id`)당 개인 메모. `pages`(JSONB: `id`, `title`, `content`, `updatedAt`).

## 참고

- 주간 **임시 저장**은 Supabase `weekly_drafts`에 보관됩니다. 주차를 열면 정식 저장본을 먼저 보여 주고, **임시 저장 불러오기**로 이어서 작성할 수 있습니다.
- 정식 저장 시 해당 주차의 임시 저장은 자동으로 삭제됩니다.
- 팀원 삭제는 soft delete이며, 과거 주간 업무 기록은 그대로 남습니다.
- **서비스 목록**은 설정에서 편집하며, DB에 값이 없으면 `nateServices.js` 기본 목록을 사용합니다.
- 브라우저 `localStorage` 사용: 입장 사번, 달력·목록 분할 너비, 팀 설정 fallback(`team-meeting-settings`).
