# 중간발표 자료 (2026-10-16)

| 파일 | 무엇 |
| --- | --- |
| `askuser-owner-report.html` | 조사 보고서. 브라우저로 바로 열린다(파일 하나, 글꼴만 CDN) |
| `askuser-owner-report.md` | 같은 보고서의 원본 마크다운. GitHub에서 그대로 읽힌다 |
| `midterm-deck.html` | 발표 슬라이드 15장. 브라우저로 연다 |
| `midterm-deck.pptx` | 같은 슬라이드의 PowerPoint 판(수정용) |

## 발표할 때

- `midterm-deck.html`: 오른쪽 화살표나 스페이스로 다음, 왼쪽 화살표로 이전, `F`로 전체 화면. 화면 오른쪽 절반을 누르면 다음 장. 주소 끝 `#5`처럼 쓰면 그 장으로 간다. 인쇄하면 장마다 한 쪽짜리 PDF가 된다.
- `midterm-deck.pptx`: 글꼴은 [Pretendard](https://github.com/orioncactus/pretendard)다. 발표 PC에 없으면 PowerPoint가 다른 글꼴로 바꿔 줄바꿈이 달라질 수 있으니 설치해 두거나 HTML 판으로 발표한다. 장마다 발표자 노트(말할 거리)가 들어 있다. HTML 판에는 노트가 화면에 나오지 않는다.

## 숫자를 다시 만들 때

숫자는 손으로 쓰지 않았다. NOMOS 연구 허브(로컬 레포 `nomos-hub`, 브랜치 `exp/askuser-owner`)에서 만든다.

```bash
.venv/bin/python -m hub.askuser.extract            # 로컬 세션에서 AskUserQuestion 질문 추출
.venv/bin/python -m hub.askuser.labels             # 임시 라벨 붙이기
.venv/bin/python -m hub.analysis.askuser_owner_report   # 라우터 채점 → reports/askuser_owner/results.json
.venv/bin/python -m hub.askuser.build_docs <보고서.md> <보고서.html>
.venv/bin/python -m hub.askuser.build_deck <이 폴더>    # 덱 HTML과 PPTX를 results.json 숫자로 다시 그린다
```

## 먼저 알아 둘 한계

- 실제 질문 173개의 정답은 Claude가 붙인 임시 라벨이다. 팀원 세 명의 블라인드 검수(`hub.askuser.review`)가 끝나야 숫자를 주장할 수 있다.
- LLM 라우터는 정답을 볼 수 없게 막은 Claude 서브에이전트(haiku, sonnet)로 돌렸다. 운영 경로(`claude -p`)의 지연과 비용은 아직 재지 않았다.
- v2 라우터 규칙은 실제 질문의 오답을 보고 만들었으므로 실제 질문 수치(98.3%)는 낙관적이다.
