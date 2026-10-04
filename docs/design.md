# 디자인 토큰

정의 위치는 `src/app/globals.css`의 `@theme` 블록 하나뿐이다.

## 절대 규칙

- **토큰에 없는 색을 쓰지 말 것.** `text-green-600`, `bg-amber-50` 같은 Tailwind 기본 팔레트 직접 사용 금지
- 새 토큰이 필요하면 `@theme`에 추가하고 **이 문서도 같이 갱신**할 것
- 아래 decider 색은 장식이 아니라 **도메인 의미**다. 임의로 바꾸면 화면이 거짓말을 하게 된다

## 색

### brand / ink

| 토큰 | 값 | 용도 |
| --- | --- | --- |
| `brand-50` \~ `brand-800` | `#eef3fa` \~ `#12213b` | 주요 액션, 강조, 선택 상태 |
| `ink-50` \~ `ink-900` | `#f9fafb` \~ `#111827` | 본문·보더·배경 회색 스케일 |

ink 스케일은 50 · 100 · 200 · 300 · 400 · 500 · 600 · 700 · 800 · 900 열 단계다(`globals.css`의 `--color-ink-*`). **여기 없는 단계(예: `ink-650`)를 클래스에 쓰면 Tailwind가 CSS를 만들지 않아 색이 조용히 빠진다.** 빌드·린트가 잡아주지 않으므로 새 단계가 필요하면 토큰부터 추가할 것.

### 행위자 색

| 토큰 | 값 | 대상 |
| --- | --- | --- |
| `fe-500` / `fe-100` | `#7c3aed` / `#ede9fe` | FE 에이전트 |
| `be-500` / `be-100` | `#0d9488` / `#ccfbf1` | BE 에이전트 |
| `pm-500` / `pm-100` | `#1f3864` / `#dbe5f3` | PM, 그리고 **대표(OWNER) 배지** |
| `pm-chart` | `#2f5597` | 차트에서 PM 계열 |

> `ROLE_TONE`이 `OWNER → pm`으로 매핑돼 있어 대표 배지가 PM 색을 쓴다. 의도된 동작이며, 대표와 PM을 시각적으로 구분해야 할 화면이 생기면 그때 토큰을 분리한다.

### decider 색 (정책표와 1:1)

`Decider` 타입의 네 값에 각각 대응한다. 명세 §0-1 정책표를 화면에 옮기는 유일한 수단이다.

| decider | 전경 | 배경 | 의미 |
| --- | --- | --- | --- |
| `AUTO` | `auto` `#059669` | `auto-bg` `#ecfdf5` | 자동 실행 |
| `PM_REVIEW` | `review` `#0284c7` | `review-bg` `#f0f9ff` | PM 검토 |
| `HUMAN` | `human` `#d97706` | `human-bg` `#fffbeb` | 사람 승인 필요 |
| `FORBIDDEN` | `forbidden` `#dc2626` | `forbidden-bg` `#fef2f2` | 금지 |

## Badge tone

`Badge`의 `tone`이 위 토큰을 감싼다. **새 배지를 만들 때 색을 직접 쓰지 말고 tone을 고를 것.**

| tone | 토큰 | 쓰는 곳 |
| --- | --- | --- |
| `neutral` | ink-100 / ink-700 | 기본, READY, CLAIMED, QUEUED, 검증 SKIPPED, "목업" 배지 |
| `brand` | brand-50 / brand-600 | SUBMITTED, VERIFYING, 재제출 |
| `success` | auto-bg / auto | DONE, AUTO, 검증 PASS |
| `warn` | human-bg / human | WAITING\_HUMAN, AWAITING\_APPROVAL, BLOCKED, HUMAN |
| `danger` | forbidden-bg / forbidden | FAILED, ESCALATED, FORBIDDEN, 검증 FAIL |
| `info` | review-bg / review | IN\_PROGRESS, PM\_REVIEW |
| `fe` `be` `pm` | 행위자 색 | 역할 배지 |

> `success`/`warn`/`danger`/`info`는 decider 토큰을 재사용한다. 즉 초록이 "완료"와 "자동 승인" 두 뜻을 겸한다. 현재는 문맥이 겹치지 않아 유지하지만, decider 배지와 상태 배지가 한 줄에 나란히 놓이는 화면을 만들 때는 라벨로 구분할 것.

## 태스크 상태 배지

`TASK_META`가 9개 상태의 라벨과 tone을 고정한다. 상태를 화면에 직접 문자열로 찍지 말고 `TaskBadge`를 쓸 것.

`READY` `QUEUED` → neutral / `IN_PROGRESS` → info / `WAITING_HUMAN` → warn / `SUBMITTED` `VERIFYING` → brand / `DONE` → success / `FAILED` `ESCALATED` → danger

API에 연결된 화면은 서버 상태 8종을 `API_TASK_META` / `ApiTaskBadge`로 찍는다. 위 9종은 목업 화면 전용이다.

`READY` `CLAIMED` → neutral / `IN_PROGRESS` → info / `VERIFYING` → brand / `AWAITING_APPROVAL` `BLOCKED` → warn / `ESCALATED` → danger / `DONE` → success

## 검증 결과 배지

`PASS` → success / `FAIL` → danger / `SKIPPED` → **neutral**. SKIPPED는 "못 돌렸다"이지 통과가 아니다. PASS와 같은 색을 쓰지 말고 `detail.reason`을 함께 보여줄 것.

산출물의 `gateMode`(`AUTO` `PM_REVIEW` `HUMAN` `FORBIDDEN`)는 decider 색을 그대로 쓴다 (success / info / warn / danger).

## 인계 노트

`kind`: `IMPLEMENTED` → success / `DECIDED` → brand / `GOTCHA` → warn / `DEVIATION` → danger.

`DECIDED`(결정 사항)는 프로젝트의 모든 태스크에 전달되므로 행 전체를 brand-50 배경 + brand-500 왼쪽 선으로 강조한다. 다른 kind는 강조하지 않는다.

## 조직 멤버 배지

`orgRole`: `REPRESENTATIVE` → pm ("대표") / `MEMBER` → neutral ("팀원").

`isCollaborator`는 세 상태다: 필드 없음 → neutral "확인 불가" / `false` → warn "GitHub 권한 없음" / `true` → success "확인됨". 필드 없음은 "확인하지 못함"이지 권한 없음이 아니다. false와 같은 색을 쓰지 말 것.

## 타이포·형태

- `--font-sans`: Geist Sans → 시스템 → Pretendard → Noto Sans KR 순 폴백. 한글이 섞이는 제품이라 폴백 순서를 바꾸지 말 것
- `--font-mono`: Geist Mono. 로그·코드·토큰 수치에 사용
- `--radius-xl2`: 14px. 카드 기본 반경
- `--shadow-card` / `--shadow-pop`: 카드 / 팝오버·모달

## 커스텀 유틸리티

`globals.css`에 정의된 것만 쓴다.

- `card` — 흰 배경 + ink-200 보더 + 카드 반경 + 카드 그림자. **카드는 이 유틸로 만들 것**
- `dots-bg` — 점 패턴 배경
- `no-scrollbar` — 스크롤바 숨김
- `safe-bottom` — 모바일 하단 안전영역
- `animate-rise` — 220ms 등장. 새 메시지·카드 삽입에 사용
- `pulse-dot` — 에이전트 작업 중 표시

## 문서 렌더

마크다운 본문은 `.prose-doc` 클래스가 h1\~h3, 목록, 코드, 표, 인용을 모두 정의한다. 문서 페이지에 별도 타이포 스타일을 추가하지 말 것.

`.prose-doc`에 표 스타일이 이미 있으므로, 마크다운 렌더러를 GFM 지원으로 교체할 때 CSS는 손대지 않아도 된다.
