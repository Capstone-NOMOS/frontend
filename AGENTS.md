<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# NOMOS frontend

AI 에이전트 팀 협업 도구의 웹 프론트엔드. 백엔드는 별도 레포(Node · TypeScript · PostgreSQL).

스택: Next.js 16.3.5 (App Router) / React 19.2 / TypeScript / Tailwind v4 / Node 20.9+ / **pnpm**

## 참조 문서

작업 전에 해당하는 것을 읽을 것. 목록은 [`docs/README.md`](./docs/README.md).

| 작업 | 읽을 것 |
| --- | --- |
| 기능·도메인 로직 | `docs/NOMOS_기능명세서.md` (**유일한 기준**) |
| 데이터 흐름·실시간·인증 | `docs/architecture.md` |
| 파일 생성·이동 | `docs/conventions.md` |
| 색·배지·여백 | `docs/design.md` |
| "왜 이렇게 돼 있지?" | `docs/adr/` |

`docs/*.docx`는 제출용 원본이며 참조 대상이 아니다.

**명세와 코드가 다르면 명세가 맞다. 명세에 없는 결정은 지어내지 말고 질문할 것.**

## Next.js 16 주의

학습 데이터가 15 이하일 수 있다. 확신이 없으면 `node_modules/next/dist/docs/`를 먼저 읽을 것.

- **서버 가드 파일(`proxy.ts`·`middleware.ts`)을 만들지 말 것.** 인증은 클라이언트 가드 + API 401·403 (→ docs/adr/0007)
- `params` `searchParams` `cookies()` `headers()`는 전부 `await`
- 린트는 `eslint` 직접 실행 (`next lint` 없음)
- Turbopack이 기본. webpack 설정 추가 금지

## 아키텍처 경계

자세한 내용은 `docs/architecture.md`.

- 백엔드는 Node/TS. **Next Route Handler를 BFF로 쓰지 말 것** (같은 언어라 유혹이 크지만 서버가 둘이 되는 건 동일)
- **현재 API에 실시간 채널이 없다. 당분간 폴링** (`refetchInterval`). 실시간 라이브러리 설치 금지 (`docs/adr/0004`)
- 데이터 조회는 반드시 쿼리 훅으로 감쌀 것. 컴포넌트에서 `fetch` 직접 호출 금지
- 승인·질의 응답을 Server Action으로 처리하지 말 것 (판정 주체는 서버)
- 실시간 데이터에 `revalidate`·`use cache` 금지
- `page.tsx`는 위젯을 부르는 얇은 셸로 유지
- `lib/store.tsx`는 해체 예정이다. **새 기능을 여기 덧붙이지 말 것**

## UI 규칙

- **토큰에 없는 색을 쓰지 말 것** (`docs/design.md`). Tailwind 기본 팔레트 직접 사용 금지
- 승인·질의 카드에 **낙관적 업데이트 금지.** 서버 응답으로만 상태 변경
- 액션 버튼은 요청 중 비활성화 (중복 제출이 ADR 기록을 오염시킴)
- 태스크 칸반에 **드래그 이동 금지** (`docs/adr/0003`)
- API JSON은 `camelCase`. `snake_case`를 받아 변환하는 코드를 만들지 말 것
- 수정 요청 잔여 횟수(최대 3회)를 UI에 노출

## 네이밍

자세한 내용은 `docs/conventions.md`.

- 폴더 kebab-case / 컴포넌트 `PascalCase.tsx` / 그 외 `camelCase.ts`
- 변수·함수 camelCase / 컴포넌트·타입 PascalCase / 상수 객체 UPPER\_SNAKE
- 상태 문자열 값은 서버 계약과 동일하게 (`READY`, `WAITING_HUMAN`)
- named export 기본. `page.tsx`·`layout.tsx`만 default
- import는 `@/` 별칭만. `../../` 금지
- 엔티티는 `interface`, 유니언은 `type`

## 작업 방식

- **패키지 추가 전 반드시 물어볼 것** (`dep:add`는 승인 대상)
- 패키지 매니저는 **pnpm**. `npm install`을 쓰지 말 것 (`package-lock.json`이 되살아난다 → adr/0005)
- 커밋 전 `pnpm format` · `pnpm lint` · `pnpm typecheck`. CI가 같은 것을 돌린다 (→ adr/0006)
- **레이어 경계는 린트가 판정한다.** `pnpm lint` 실패를 우회하려 예외를 추가하지 말 것
- `.env*` 수정 금지
- 이슈는 `.github/ISSUE_TEMPLATE/custom.md`를 따를 것. 제목은 `[FEAT/BUG/REFACTOR/CHORE] 이슈 이름`, Description과 To Do를 채울 것
- PR은 `.github/pull_request_template.md`를 따를 것. 제목은 `feat: 로그인 기능 구현` 형식, `Closes #N`으로 이슈 연결, UI 변경 시 스크린샷 첨부
- 새 결정을 내렸으면 `docs/adr/`에 한 장 남길 것
