# 아키텍처

결정의 배경은 Notion TO-DO에 있다. 이 문서는 **코드에 적용되는 규칙만** 담는다.

## 1. 시스템 경계

```
브라우저 ── HTTP ──▶ Node/TypeScript 백엔드 (별도 레포)
    │                    │
    └──── WebSocket ─────┘
```

- 백엔드는 Node/TypeScript 하나(DB는 PostgreSQL). **Next.js Route Handler를 BFF로 쓰지 않는다**
- 백엔드도 TypeScript라 BFF 유혹이 커지지만, 서버를 둘 운영하게 되는 건 마찬가지다
- WebSocket 서버는 백엔드 소유. 프론트는 클라이언트로만 붙는다
- 승인·질의 응답을 Server Action으로 처리하지 않는다. 판정 주체는 서버다

## 2. 렌더링

- `app/**/page.tsx`는 **얇은 서버 셸**. 파라미터를 풀어 위젯에 넘기는 것까지만
- 화면 내용은 `"use client"` 위젯이 담당
- `params` `searchParams` `cookies()` `headers()`는 전부 `await`
- 실시간으로 바뀌는 데이터에 `revalidate`·`use cache` 금지. 갱신 경로가 WS와 캐시로 이원화되면 어긋난다

## 3. 인증과 권한

- 세션은 JWT 24시간
- 라우트 가드는 **`proxy.ts`**. `middleware.ts`를 만들지 말 것 (Next 16에서 대체됨)
- Room 접근 규칙은 서버가 강제하고 화면도 같은 규칙을 반영한다
  - 대표는 Room 1·2를 **읽을 수 있지만 입력창이 없다**
  - FE가 Room 2(BE)에 접근하면 403
- 클라이언트 필터링은 보조 수단일 뿐 권한의 근거가 아니다

## 4. 데이터 흐름

서버 상태는 TanStack Query, UI 상태는 별도 스토어. WebSocket은 **캐시를 갱신하는 입력**이지 상태 저장소가 아니다.

```
WS 이벤트 ──▶ 이벤트→쿼리키 매핑 ──▶ Query 캐시 갱신 ──▶ 화면
재연결     ──▶ 관련 쿼리 invalidate ──▶ 서버에서 복구
```

네 가지 원칙:

1. **이벤트 → 쿼리키 매핑을 한 파일에 모은다.** 이벤트 종류가 많아 흩어지면 손을 못 댄다
2. **재연결은 곧 무효화다.** 놓친 이벤트를 따로 추적하지 않고 서버를 진실로 삼아 복구한다
3. **에이전트 오프라인 판정은 서버 신호로.** 30초 규칙을 프론트 타이머로 추정하지 않는다
4. **로그는 배치로 반영한다.** 줄마다 setState 하지 말고 버퍼에 모아 100ms 또는 rAF 단위로 flush

WebSocket은 놓칠 수 있는 전송이다. 소켓만으로 상태를 쌓으면 한 번 끊긴 뒤 화면과 서버가 영구히 어긋난다.

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

| 영역 | 선택 |
| --- | --- |
| 프레임워크 | Next.js 16 App Router (→ [adr/0001](./adr/0001-next-16-유지.md)) |
| 서버 상태 | TanStack Query |
| UI 상태 | Zustand |
| 실시간 | **미정 — BE와 함께 결정** (adr/0004 예정). 네이티브 WS + 재연결 래퍼 / Socket.IO 중 후자로 기울어 있음 |
| 로그 뷰어 | `@tanstack/react-virtual` + 배치 flush |
| 마크다운 | react-markdown + remark-gfm + rehype-sanitize |
| API 타입 | openapi-typescript (계약에서 생성). BE가 TS지만 소스를 직접 import하지 않는다 |
| 목업 | MSW |
| UI 부품 | 자체 구현 유지. 모달·팝오버가 필요한 시점에 Radix만 부분 도입 |

**패키지 추가는 `dep:add` 승인 대상이다. 임의로 설치하지 말 것.**

## 8. 현재 상태 (이행 중)

목업 단계의 구조가 아직 남아 있다. 아래는 **의도된 최종 형태가 아니며** 순차적으로 해체한다.

- `lib/store.tsx` — Context + reducer 단일 스토어. 명세 생성·검증·진행을 `setTimeout`으로 시뮬레이션한다. 즉 현재는 클라이언트가 판정 주체다
- `localStorage` 영속(`nomos.mock.v3`) — 서버 연동 시 제거한다
- `lib/mock/seed.ts` — MSW 핸들러로 옮긴다

**새 기능을 이 스토어에 덧붙이지 말 것.** 서버 연동 작업과 충돌한다. 불가피하면 먼저 질문할 것.

## 9. API 계약 규칙

백엔드는 Node/TypeScript + PostgreSQL이다. 다음은 계약으로 합의된 사항이며 프론트에서 임의로 우회하지 않는다.

- **JSON 필드는 `camelCase`.** DB가 `snake_case`여도 변환은 백엔드 직렬화 계층에서 한 번만 한다.
  프론트에 변환 레이어를 만들지 말 것
- **상태 문자열은 UPPER_SNAKE** (`READY`, `WAITING_HUMAN`). DB enum과 그대로 대응한다
- **ID는 문자열로 받는다.** 백엔드가 `bigint`를 쓰더라도 문자열로 직렬화한다 (JS 정수 한계)
- 타입은 계약 문서에서 `openapi-typescript`로 생성한다. 손으로 베끼지 않는다
- WebSocket 이벤트 payload 타입은 OpenAPI로 표현하기 어렵다. 별도 공유 타입을 쓸지는 실시간 라이브러리 결정과 함께 정한다

### 미결 사항

실시간 전송 방식(네이티브 WebSocket / Socket.IO)이 아직 정해지지 않았다.
백엔드가 Node이므로 Socket.IO의 Room과 ack이 우리 도메인(Room 1·2·3, 승인 멱등성)에 잘 맞는다.
**결정 전까지 실시간 관련 라이브러리를 설치하지 말 것.**
