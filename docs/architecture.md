# 아키텍처

결정의 배경은 Notion TO-DO에 있다. 이 문서는 **코드에 적용되는 규칙만** 담는다.

## 1. 시스템 경계

```
브라우저 ── HTTP (조회는 폴링) ──▶ Node/TypeScript 백엔드 (별도 레포)
```

- 백엔드는 Node/TypeScript 하나(DB는 PostgreSQL). **Next.js Route Handler를 BFF로 쓰지 않는다**
- 백엔드도 TypeScript라 BFF 유혹이 커지지만, 서버를 둘 운영하게 되는 건 마찬가지다
- **현재 API에는 실시간 채널이 없다. 당분간 폴링으로 갱신한다** (→ adr/0004)
- 실시간 채널이 생기더라도 서버는 백엔드 소유. 프론트는 클라이언트로만 붙는다
- 승인·질의 응답을 Server Action으로 처리하지 않는다. 판정 주체는 서버다

## 2. 렌더링

- `app/**/page.tsx`는 **얇은 서버 셸**. 파라미터를 풀어 위젯에 넘기는 것까지만
- 화면 내용은 `"use client"` 위젯이 담당
- `params` `searchParams` `cookies()` `headers()`는 전부 `await`
- 실시간으로 바뀌는 데이터에 `revalidate`·`use cache` 금지. 갱신 경로가 폴링과 캐시로 이원화되면 어긋난다
- 서버 컴포넌트는 사용자 토큰이 없으므로 로그인이 필요한 API를 부르지 않는다 (→ adr/0007)

## 3. 인증과 권한

- 사람 토큰 1시간, refresh 없음. 만료되면 재로그인한다
- 토큰은 로그인 응답 body로 받아 `sessionStorage`에 보관하고 `Authorization: Bearer` 헤더로 보낸다. 쿠키를 쓰지 않는다 (`credentials: 'include'` 금지)
- 라우트 보호는 클라이언트 가드로 한다. **권한의 근거는 API의 401·403이다** (→ adr/0007)
- `proxy.ts`·`middleware.ts`를 만들지 않는다. Next 서버는 사용자 토큰을 볼 수 없다
- Room 접근 규칙은 서버가 강제하고 화면도 같은 규칙을 반영한다
  - 대표는 Room 1·2를 **읽을 수 있지만 입력창이 없다**
  - FE가 Room 2(BE)에 접근하면 403
- 클라이언트 필터링은 보조 수단일 뿐 권한의 근거가 아니다

## 4. 데이터 흐름

서버 상태는 TanStack Query, UI 상태는 별도 스토어.

### 현재: 폴링 (잠정 — adr/0004)

현재 API에는 WebSocket·SSE가 없다. 조회 API를 주기적으로 다시 부른다.

```
쿼리 훅 ──(refetchInterval)──▶ GET API ──▶ Query 캐시 ──▶ 화면
```

1. **데이터 조회는 반드시 쿼리 훅으로 감싼다.** 컴포넌트에서 `fetch`를 직접 부르지 않는다.
   나중에 실시간 채널이 붙으면 훅 내부만 바꾸면 되도록 하기 위해서다
2. **폴링 주기는 화면별로 정한다.** 대시보드·태스크 목록 3~5초, 문서·설정은 폴링하지 않음
3. **탭이 숨겨지면 멈춘다.** 돌아왔을 때 즉시 한 번 갱신한다 (`refetchIntervalInBackground: false`, `refetchOnWindowFocus: true`)
4. **증분 조회가 가능한 곳은 증분으로.** 노트는 `since_seq`로 이후 분만 받아 이어 붙인다
5. **에이전트 오프라인 판정은 서버 신호로.** 프론트 타이머로 추정하지 않는다. 현재는 해당 API가 없으므로 표시하지 않는다

### 이후: 실시간 채널이 생기면

전송이 무엇이든(WebSocket / SSE) 다음 원칙은 유지한다.

- 수신 이벤트는 **캐시를 갱신하는 입력**이지 상태 저장소가 아니다
- 이벤트 → 쿼리키 매핑을 한 파일에 모은다
- 재연결은 곧 무효화다. 놓친 이벤트를 따로 추적하지 않는다
- 로그 스트림은 버퍼에 모아 100ms 또는 rAF 단위로 flush한다

## 5. 상태 기계 표시

`TaskState` 9종은 서버가 전이시킨다. 프론트는 표시만 한다.

- `QUEUED` — 상대 브릿지 오프라인. 대기 중임을 드러낼 것
- `WAITING_HUMAN` — 4시간·24시간 경과를 표시
- `ESCALATED` — 검증 3회 실패. 다른 상태와 확실히 구분할 것

## 6. 액션 규칙

- **낙관적 업데이트 금지.** 승인·질의 응답은 서버 응답으로만 상태를 바꾼다
- 요청 중 버튼 비활성화 + 멱등키 전송. 중복 제출은 ADR 기록을 오염시킨다
- 수정 요청 잔여 횟수(최대 3회)를 화면에 노출한다
- 예산 80% 경고, 초과 시 분배 정지 상태를 표시한다

## 7. 기술 선택

설치 여부는 `package.json`이 기준이다. **설치됨**은 의존성에 있다는 뜻이고, 코드에 적용됐다는 뜻은 아니다 (→ §8).

| 영역 | 선택 | 상태 |
| --- | --- | --- |
| 프레임워크 | Next.js 16 App Router (→ [adr/0001](./adr/0001-next-16-유지.md)) | 설치됨 · 적용됨 |
| 아이콘 | lucide-react | 설치됨 · 적용됨 |
| 서버 상태 | `@tanstack/react-query` | 설치됨 · 미적용 |
| UI 상태 | zustand | 설치됨 · 미적용 |
| 로그 뷰어 | `@tanstack/react-virtual` + 배치 flush | 설치됨 · 미적용 |
| 마크다운 | react-markdown + remark-gfm + rehype-sanitize | 설치됨 · 미적용 (현재는 `components/docs/Markdown.tsx` 자체 파서) |
| API 타입 | openapi-typescript (계약에서 생성). BE가 TS지만 소스를 직접 import하지 않는다 | 설치됨 · 미적용 |
| 목업 | MSW | 설치됨 · 미적용 |
| 실시간 | **당분간 폴링** (TanStack Query `refetchInterval`). 실시간 채널은 BE 계획 확인 후 결정 (adr/0004) | **설치 금지** |
| UI 부품 | 자체 구현 유지. 모달·팝오버가 필요한 시점에 Radix만 부분 도입 | 미설치 (그 시점에 질문) |

**패키지 추가는 `dep:add` 승인 대상이다. 임의로 설치하지 말 것.**

## 8. 현재 상태 (이행 중)

목업 단계의 구조가 아직 남아 있다. 아래는 **의도된 최종 형태가 아니며** 순차적으로 해체한다.

- `lib/store.tsx` — Context + reducer 단일 스토어. 명세 생성·검증·진행을 `setTimeout`으로 시뮬레이션한다. 즉 현재는 클라이언트가 판정 주체다. `AppState`·`Session` 타입도 여기 있다 (스토어와 함께 사라지므로 엔티티로 올리지 않았다)
- `localStorage` 영속(`nomos.mock.v3`) — 서버 연동 시 제거한다
- `lib/mock/seed.ts` — MSW 핸들러로 옮긴다

FSD 이행(adr/0002)에서 `src/lib/`만 레이어 밖 예외로 남겼다. 지금 옮기면 해체 때 두 번 옮기게 된다. 위젯이 `@/lib/store`를 직접 import하는 것도 그때까지의 예외다.

**새 기능을 이 스토어에 덧붙이지 말 것.** 서버 연동 작업과 충돌한다. 불가피하면 먼저 질문할 것.

## 9. API 계약 규칙

백엔드는 Node/TypeScript + PostgreSQL이다. 다음은 계약으로 합의된 사항이며 프론트에서 임의로 우회하지 않는다.

- **JSON 필드는 `camelCase`.** DB가 `snake_case`여도 변환은 백엔드 직렬화 계층에서 한 번만 한다.
  프론트에 변환 레이어를 만들지 말 것
- **상태 문자열은 UPPER_SNAKE** (`READY`, `WAITING_HUMAN`). DB enum과 그대로 대응한다
- **ID는 문자열로 받는다.** 백엔드가 `bigint`를 쓰더라도 문자열로 직렬화한다 (JS 정수 한계)
- 타입은 계약 문서에서 `openapi-typescript`로 생성한다. 손으로 베끼지 않는다
- 실시간 채널이 생기면 이벤트 payload 타입은 OpenAPI로 표현하기 어렵다. 공유 타입 여부는 그때 정한다

### 미결 사항

- 현재 API에는 실시간 채널이 없고, 노트 API의 `since_seq`는 폴링용으로 설계돼 있다
- 기능명세서 F-14는 WebSocket을 요구한다. 명세와 API가 어긋나 있으며 BE 계획 확인이 필요하다
- **결정 전까지 WebSocket·Socket.IO 등 실시간 라이브러리를 설치하지 말 것**
