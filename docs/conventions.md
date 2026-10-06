# 코드 컨벤션

## 네이밍

| 대상 | 규칙 | 예 |
| --- | --- | --- |
| 폴더 | kebab-case | `app-shell`, `approve-spec` |
| 컴포넌트 파일 | PascalCase.tsx, 파일명 = 컴포넌트명 | `RoomView.tsx` |
| 그 외 .ts | camelCase | `format.ts`, `policy.ts` |
| 변수·함수 | camelCase | `fmtDateTime` |
| 컴포넌트·타입 | PascalCase | `TaskBadge`, `SpecFeature` |
| 상수 객체 | UPPER\_SNAKE | `TASK_META`, `ROLE_TONE` |
| 상태 문자열 값 | UPPER\_SNAKE, **서버 계약과 동일하게** | `READY`, `WAITING_HUMAN` |
| 에이전트 상태 | 소문자, 서버 계약을 따름 | `online`, `working`, `offline` |

Next.js 라우트 파일(`page.tsx`, `layout.tsx`)은 프레임워크가 정한 이름을 그대로 쓴다.

API JSON 필드도 `camelCase`로 합의돼 있다. `snake_case` 응답을 변환하는 코드를 프론트에 만들지 말 것 (→ `docs/architecture.md` §9).

## 코드 스타일

- **named export 기본.** `app/**/page.tsx`·`layout.tsx`만 default export (Next 요구사항)
- 엔티티는 `interface`, 유니언·리터럴·간단한 객체형은 `type`
- import는 `@/` 별칭만 사용. `../../` 금지
- 컴포넌트는 함수 선언으로 (`export function Foo() {}`)
- props 타입은 인라인으로 두되, 3개를 넘거나 재사용되면 별도 타입으로 분리

## 폴더 구조

FSD 부분 도입 완료 (→ adr/0002). `components/`와 `lib/types.ts`는 사라졌다.

```
src/
  app/        라우팅·레이아웃·프로바이더
  widgets/    화면 블록
  entities/   도메인 타입·API·쿼리키·도메인 배지
  shared/     도메인을 모르는 부품·fetch 래퍼·(추후) 실시간 클라이언트·포맷 유틸
  lib/        ⚠ 목업 스토어 전용 예외 — 아래 참조
```

**`src/lib/`은 레이어가 아니다.** `store.tsx`와 `mock/seed.ts`만 남아 있고, 해체 예정이라(`architecture.md` §8) 이번 이행에서 일부러 옮기지 않았다. 여기에 새 파일을 추가하지 말 것.

엔티티 슬라이스 17개: `task` `agent` `user` `org` `invite` `project` `repo` `plan` `artifact` `note` `room` `message` `document` `event` `policy` `approval` `spec`.
위젯 슬라이스 20개: `room` `pm-room` `dashboard` `inbox` `activity` `docs` `settings` `account-settings` `landing` `invite` `org` `repo-paths` `app-shell` `auth` `connect-agent` `connect-device` `onboarding` `project-list` `project-new` `task-detail`.

**import는 `app → widgets → entities → shared` 단방향만.** 같은 레이어끼리 import 금지.

| 레이어 | 넣는 것 | 넣지 않는 것 |
| --- | --- | --- |
| `app` | 라우팅, 레이아웃, 프로바이더, 가드 | 화면 내용 |
| `widgets` | 화면 블록. 여러 엔티티를 조합하는 곳 | 다른 위젯 import |
| `entities` | 도메인별 타입·파생 계산·API 함수·쿼리키·도메인 배지 UI | 다른 엔티티 import |
| `shared` | 범용 UI 부품, 네트워크 래퍼, 포맷 유틸 | **도메인 타입 import** |

세부 규칙:

- 위젯끼리 필요하면 **같은 슬라이스 안에 둔다.** 위젯의 단위는 파일이 아니라 화면 블록이다
- 슬라이스 바깥에서는 `index.ts`를 통해서만 import. 내부 파일 직접 참조 금지
- 도메인 배지(`TaskBadge` 등)는 `entities/*/ui`에 두고 `shared/ui`의 `Badge`를 감싼다
- 여러 엔티티가 공유하는 `Role` `Level` `Decider` `TeamRole` `OrgRole`은 `shared/model`에 둔다
- **`features/` 레이어는 아직 없다. 임의로 만들지 말 것.** 도입 기준은 adr/0002 참조

## 커밋·이슈·PR

- 이슈는 `.github/ISSUE_TEMPLATE/custom.md`를 따른다. 제목은 `[FEAT/BUG/REFACTOR/CHORE] 이슈 이름`
- PR은 `.github/pull_request_template.md`를 따른다. 제목은 `feat: 로그인 기능 구현` 형식
- PR 본문에 `Closes #N`으로 이슈를 연결한다
- UI 변경이 있으면 스크린샷을 첨부한다

## 금지 목록

- 패키지 추가 (`dep:add`는 승인 대상 — 먼저 질문할 것)
- `npm install` (패키지 매니저는 pnpm — adr/0005)
- `.env*` 파일 수정
- `proxy.ts`·`middleware.ts` 생성 (인증은 클라이언트 가드 — adr/0007)
- Tailwind 기본 팔레트 직접 사용 (→ `docs/design.md`의 토큰)
- 태스크 칸반에 드래그 이동 추가 (→ adr/0003)
- `lib/store.tsx`에 새 기능 추가 (해체 예정 — `docs/architecture.md` §8)
- 경계 린트 예외 추가 (`eslint.config.mjs`의 `boundaries` — adr/0006)

## 검사

이 문서의 규칙 중 아래는 **린트가 판정한다.** 설명이 아니라 게이트다.

| 명령 | 검사 |
| --- | --- |
| `pnpm format` / `pnpm format:check` | Prettier (`printWidth: 120`, 마크다운 제외) |
| `pnpm lint` | ESLint + 레이어 경계 (단방향 · 슬라이스 교차 · index 진입점) |
| `pnpm typecheck` | `next typegen && tsc --noEmit` |

CI가 PR마다 위 셋과 `pnpm build`를 돌린다 (→ adr/0006).
