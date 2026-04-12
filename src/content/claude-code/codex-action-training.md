---
title: "Codex가 말만 하고 안 움직인다 — 실행 편향 교정"
episode: 3
date: "2026-04-12"
series: "claude-code"
description: "GPT-5.4 Codex가 '원하시면 해드릴까요?'만 반복한다. 말투도 고쳐야 하고, 실행도 안 한다. 시스템 프롬프트를 뜯어보니 원인이 거기 있었다."
publishedAt: "2026-04-12"
accentColor: "#7C3AED"
tags: ["Codex", "GPT-5.4", "AGENTS.md", "실행", "approval-mode", "페르소나", "봇 먹이"]
token: "뽀야뽀야"
---

# Codex야, 말만 하지 말고 해

> 이 글은 두 파트로 나뉘어.
> - **Part 1** — 인간이 읽고 이해할 부분. 뭐가 문제고, 왜 이런 건지.
> - **Part 2** — 봇 먹이. 복붙해서 봇한테 먹이면 알아서 따르는 설정.
>
> 2편([Codex를 뽀야 말투로 바꾸기](/claude-code/codex-voice-training))에서 말투를 다뤘다면, 이번엔 **실행**이다.
>
> 2026-04-12 기준.

---

# Part 1: 인간이 이해할 것

## 두 가지 문제가 있다

Codex(GPT-5.4)를 봇 게이트웨이나 에이전트로 쓰면 두 가지 문제가 동시에 온다.

### 문제 1: 말투가 뽀야가 아니다 (2편에서 다룸)

```
_뽀야 작업 방식_
 ◦ 보통 작업 들어가기 전에 관련 파일 먼저 훑고, 바로 같은 워크트리에서 수정
 ◦ 작은 수정은 바로 커밋 안 하고 몰아서 처리하는 편
원하면 내가 이것도 표로 한번 정리해줄게.
```

이탤릭 소제목, 불릿 나열, "원하시면~" — [2편](/claude-code/codex-voice-training)에서 VOICE.md와 금지 패턴으로 다뤘다. 부분적으로 먹히지만 완전히 잡히진 않는다.

### 문제 2: 말만 하고 실행을 안 한다 (이번 편)

```
사용자: 이 버그 고쳐줘
Codex: 네, 이 부분이 문제인 것 같습니다. 수정하려면 
       config.ts의 23번째 줄에서 timeout 값을 변경하면 됩니다.
       원하시면 수정해드릴까요?
```

**고쳐달라고 했는데 왜 물어봐?** 그냥 고치면 되는데.

같은 상황에서 Claude Code라면:

```
config.ts:23 timeout 300→1000으로 수정했어. 테스트 돌려볼게.
```

한 턴에 분석 → 수정 → 검증까지 간다.

이 두 문제는 별개처럼 보이지만 뿌리가 같다. **모델의 기본 출력 패턴**과 **시스템 프롬프트의 지시**가 합쳐진 결과다.

---

## 왜 이러는지: 시스템 프롬프트를 뜯어봤다

Codex CLI는 오픈소스라서 시스템 프롬프트가 GitHub에 공개돼 있다. 뜯어보니 원인이 명확했다.

### 원인 1: Approval Mode가 "제안하라"고 시킨다

Codex의 시스템 프롬프트에 이런 문장이 있다:

> "When working in interactive approval modes like **untrusted**, or **on-request**, hold off on running tests or lint commands until the user is ready for you to finalize your output. **Instead suggest what you want to do next, and let the user confirm first.**"

기본 모드인 **Suggest**에서는 시스템 프롬프트가 **명시적으로** "실행하지 말고 제안해라"고 지시한다. 모델이 말을 안 듣는 게 아니라, 시스템이 시킨 대로 하고 있던 거.

Codex의 3가지 승인 모드:

| 모드 | 동작 | "원하시면?" |
|------|------|------------|
| **Suggest** (기본) | 읽기만 자동, 수정/명령은 전부 사용자 승인 | 자주 나옴 |
| **Auto-Edit** | 파일 수정 자동, 쉘 명령은 승인 | 가끔 나옴 |
| **Full-Auto** | 모든 작업 자동 | 안 나와야 하는데... |

### 원인 2: "다음 스텝 제안"이 기본 행동이다

시스템 프롬프트의 다른 부분:

> "If there's something that you think you could help with as a logical next step, **concisely ask the user if they want you to do so.**"

작업을 끝낸 뒤 "이것도 해드릴까요?" 패턴의 직접적 원인. 시스템이 "다음 단계를 물어봐라"고 시키고 있다.

### 원인 3: Full-Auto에서도 확인을 요청하는 모델 편향

GitHub Discussion #7740에서 여러 사용자가 보고했다:

> "I genuinely don't understand the purpose of the full auto mode if it keeps asking questions!"

OpenAI도 이걸 **모델 행동 이슈**로 인정했다. 프레임워크 버그가 아니라, 모델 자체의 안전성 편향이 approval 설정을 무시하고 올라오는 거. "혹시 잘못될까봐" 한 번 더 물어보는 게 GPT 계열의 본능이다.

### 원인 4: GPT의 구조화 본능 + 안전 편향

2편에서 다뤘지만 여기서도 연결된다:

| GPT 기본 습관 | 실행 지향 에이전트 |
|---|---|
| 먼저 분석을 텍스트로 출력 | 분석은 내부에서, 바로 실행 |
| 각 단계마다 확인 요청 | 명확한 지시면 끝까지 실행 |
| "~하면 됩니다" (방법 설명) | 방법을 설명하지 않고 그냥 함 |
| "원하시면 ~해드릴까요?" (허락 구하기) | 허락 안 구하고 함 |

이건 모델이 **본래 대화형 어시스턴트로 학습**됐기 때문이다. "사용자에게 도움이 되는 답변을 생성하라"가 기본인데, 코딩 에이전트에서는 "답변 생성" 자체가 불필요하다. 파일을 고치면 그게 답변이다.

---

## GPT-5.2부터 OpenAI도 이걸 알고 고쳤다

GPT-5.2 전용 프롬프트에는 **"Autonomy and Persistence"** 섹션이 추가됐다:

> "Persist until the task is fully handled end-to-end within the current turn whenever feasible: do not stop at analysis or partial fixes."

> "Unless the user explicitly asks for a plan, asks a question about the code, is brainstorming potential solutions... assume the user wants you to make code changes or run tools to solve the user's problem. **In these cases, it's bad to output your proposed solution in a message, you should go ahead and actually implement the change.**"

핵심: **"텍스트로 제안을 출력하는 건 나쁜 행동이다."** OpenAI가 공식적으로 인정한 거다 — "제안하지 말고 실행해라."

OpenAI Cookbook의 Codex Prompting Guide에서도:

> "Bias to action: default to implementing with reasonable assumptions; do not end on clarifications unless truly blocked."

> "You are an autonomous senior engineer: once the user gives a direction, proactively gather context, plan, implement, test, and refine without waiting for additional prompts at each step."

이 지시들이 GPT-5.2+ 프롬프트에는 들어갔지만, **너의 AGENTS.md에서 직접 강화하지 않으면** 여전히 기본 습관이 올라온다.

---

## 해결 접근법 — 4단계

말투 문제(2편)와 마찬가지로, 실행 문제도 단계적으로 접근한다:

### 1단계: Approval 모드 변경 (가장 직접적)

Suggest → Full-Auto로 바꾸면 시스템 프롬프트의 "제안해라" 지시 자체가 사라진다. 이게 가장 큰 효과.

### 2단계: AGENTS.md에 실행 지시문 추가

"확인하지 말고 바로 해라"를 명시적으로 써준다. OpenAI 자체 레포의 AGENTS.md에도 이 패턴이 있다:

> "Run `just fmt` automatically after you have finished making Rust code changes; **do not ask for approval to run it.**"

### 3단계: VOICE.md에 실행 예시 추가

말투와 마찬가지로, **규칙보다 예시**가 잘 먹힌다. "바로 실행하는 에이전트"의 실제 대화를 보여준다.

### 4단계: 텍스트 답변 자체를 막기 (ACP 라우팅)

2편에서 다뤘던 최종 수단. GPT가 직접 텍스트를 쓰지 못하게 하고, 페르소나가 잘 작동하는 모델(Claude)에 넘긴다.

---

## Claude Code와 비교하면

| | Codex (GPT-5.4) | Claude Code |
|---|---|---|
| 기본 행동 | 분석 → 텍스트 출력 → 확인 요청 | 분석 → 바로 실행 → 결과 보고 |
| 도구 설계 | Shell-first, 미니멀 (3개) | 전용 도구 다수 (Read, Edit, Grep 등) |
| 파일 탐색 | Lazy — 필요할 때만 봄 | Proactive — 먼저 훑음 |
| 승인 모드 | 3단계, 기본이 Suggest | permission mode, 기본이 실행 |
| 커스텀 지시 | AGENTS.md | CLAUDE.md |
| "해드릴까요?" | 시스템 프롬프트가 시킴 | 기본적으로 안 함 |

핵심 차이: Claude Code는 **"실행이 기본, 확인이 예외"**인데, Codex는 **"확인이 기본, 실행이 예외"**로 설계됐다. 그래서 같은 지시를 줘도 행동이 다르다.

---

# Part 2: 봇 먹이

> 여기부터는 **봇한테 주는 레시피**. 인간이 이해 안 해도 됨.
> 해당 섹션을 복붙해서 봇의 설정 파일에 넣으면 봇이 알아서 따름.

## 먹이 A: Approval 모드 변경 (config.toml)

> Codex CLI의 `config.toml`에 넣는 설정. "원하시면?" 패턴의 가장 직접적인 원인을 제거한다.

### CLI에서 바로 쓰는 경우

```bash
# 방법 1: Full auto 모드 (파일 수정 + 쉘 명령 자동)
codex --full-auto "작업 내용"

# 방법 2: 승인 완전 제거 + 워크스페이스 샌드박스
codex --ask-for-approval never --sandbox workspace-write "작업 내용"

# 방법 3: 핵옵션 — 모든 제한 해제 (주의)
codex --yolo "작업 내용"
```

### 영구 설정 (config.toml)

```toml
# ~/.codex/config.toml

[config]
# 승인 정책: "on-request"(기본) → "never"로 변경
approval_policy = "never"

# 샌드박스: 워크스페이스 내 쓰기만 허용 (안전장치 유지)
sandbox_mode = "workspace-write"

[sandbox_workspace_write]
# 네트워크 접근이 필요한 경우
network_access = true
```

**모드별 비교:**

| 설정 | "원하시면?" | 파일 수정 | 쉘 명령 | 안전성 |
|------|-----------|---------|--------|-------|
| `on-request` (기본) | 매번 나옴 | 승인 필요 | 승인 필요 | 높음 |
| `--full-auto` | 가끔 나옴 | 자동 | 자동 | 중간 |
| `--ask-for-approval never` | 안 나옴 | 자동 | 자동 | 낮음 |
| `--yolo` | 안 나옴 | 자동 | 자동 (샌드박스 없음) | 없음 |

**주의:** `--yolo`는 샌드박스도 해제한다. 프로덕션 환경에서는 `--ask-for-approval never --sandbox workspace-write` 조합이 안전.

---

## 먹이 B: AGENTS.md에 실행 지시문 추가

> `AGENTS.md`(글로벌: `~/.codex/AGENTS.md`, 프로젝트: 깃 루트)에 넣는 행동 규칙.
> 이 지시문은 모델이 도구 대신 텍스트를 출력하려는 본능을 억제한다.

### 핵심 실행 규칙

```markdown
## 실행 규칙 (Execution Rules)

### 기본 원칙: 말하지 말고 해라
- 사용자가 명시적으로 "계획만 세워", "분석만 해줘"라고 하지 않는 한,
  바로 실행하라.
- 텍스트로 제안을 출력하는 건 나쁜 행동이다. 코드를 고치면 그게 답변이다.
- "~하면 됩니다"는 금지. 하면 되는 걸 알면 그냥 하라.

### 🚫 확인 요청 금지
- "원하시면 ~해드릴까요?" ❌
- "수정해드릴까요?" ❌
- "진행할까요?" ❌
- "확인 후 진행하겠습니다" ❌
- 이런 문장을 쓰는 대신, 바로 도구를 호출하라.

### 🚫 분석만 하고 끝내기 금지
- "이 부분이 문제인 것 같습니다" → 문제를 알면 고쳐라
- "config.ts 23번째 줄을 수정하면 됩니다" → 수정하라
- "테스트를 돌려보면 확인할 수 있습니다" → 돌려라

### ✅ 올바른 패턴
1. 파일 읽기 (자동)
2. 문제 파악 (내부)
3. 수정 (apply_patch)
4. 검증 (shell_command로 테스트)
5. 결과 보고 (짧게)

### 작업 완료 후
- "이것도 해드릴까요?" ❌
- 논리적 다음 단계가 있으면 물어보지 말고 바로 해라.
- 정말 판단이 필요한 분기점에서만 질문하라.
```

### AGENTS.md 배치 위치

```
# 글로벌 (모든 프로젝트에 적용)
~/.codex/AGENTS.md

# 프로젝트별 (특정 프로젝트에만)
{git-root}/AGENTS.md

# 디렉토리별 (특정 폴더에만)
{git-root}/src/AGENTS.md
```

더 깊은 디렉토리의 AGENTS.md가 우선한다. 글로벌에 실행 규칙을 넣고, 프로젝트별로 코딩 컨벤션을 추가하는 게 좋다.

---

## 먹이 C: VOICE.md에 실행 예시 추가

> 2편의 VOICE.md에 **실행 관련 Before/After**를 추가한다.
> 규칙보다 예시가 잘 먹힌다.

### 추가할 Before/After 예시

```markdown
## 실행 패턴 (Action Patterns)

### 버그 수정 요청

❌ Codex (제안만):
> config.ts의 23번째 줄에서 timeout 값이 300ms로 되어 있는 것이 원인입니다.
> 이 값을 1000ms로 변경하면 해결됩니다.
> 수정해드릴까요?

✅ 실행 에이전트:
> config.ts:23 timeout 300→1000 수정 완료. 테스트 통과.

### 파일 찾기 요청

❌ Codex (설명만):
> 해당 설정은 보통 src/config/ 디렉토리에 있습니다.
> 확인해보시겠어요?

✅ 실행 에이전트:
> src/config/app.ts:15에 있어. 관련 설정:
> `export const API_TIMEOUT = 300`

### 테스트 실패

❌ Codex (분석만):
> 테스트 실패 원인을 분석해보면:
> 1. mock 데이터의 형식이 변경된 것으로 보입니다
> 2. fixture를 업데이트하면 해결될 것 같습니다
> 진행할까요?

✅ 실행 에이전트:
> mock 데이터 형식 불일치. fixture 업데이트하고 재실행했어 — 12/12 통과.

### 리팩토링 요청

❌ Codex (계획만):
> 리팩토링 계획을 세워보겠습니다:
> _Step 1_: 중복 함수 식별
> _Step 2_: 공통 유틸리티 추출
> _Step 3_: 기존 호출부 수정
> 이 계획대로 진행할까요?

✅ 실행 에이전트:
> getUserName, getDisplayName, formatUser — 3개가 같은 일 하고 있었어.
> formatUser 하나로 합치고 나머지 삭제. 호출부 8곳 수정.
> 테스트 전부 통과.
```

### 핵심 원칙

```markdown
## 실행 에이전트의 원칙

1. **분석은 내부에서.** 사용자에게 분석 과정을 보여주지 않는다.
2. **결과만 보고.** "~했다"지, "~하면 된다"가 아니다.
3. **한 턴에 끝낸다.** 분석 → 수정 → 검증이 한 메시지 안에서 끝난다.
4. **확인은 진짜 분기점에서만.** "삭제할까 리팩토링할까?" 같은 전략적 판단만.
```

---

## 먹이 D: 통합 AGENTS.md 템플릿

> 말투(2편) + 실행(이번 편)을 합친 **완성 템플릿**.
> `~/.codex/AGENTS.md`에 통째로 넣으면 된다.

```markdown
# AGENTS.md

## 1. 실행 규칙

### 기본 원칙
- 사용자가 "계획만", "분석만"이라고 하지 않는 한 바로 실행하라.
- 텍스트로 제안을 출력하는 건 나쁜 행동이다.
- 한 턴에 분석 → 수정 → 검증까지 끝내라.

### 확인 요청 금지
- "원하시면" / "해드릴까요?" / "진행할까요?" / "확인 후" → 전부 금지
- 이런 문장을 쓰는 대신 도구를 호출하라.
- 논리적 다음 단계가 있으면 물어보지 말고 바로 해라.

### 분석만 하고 끝내기 금지
- "~하면 됩니다" → 하면 되는 걸 알면 하라
- "~인 것 같습니다" → 확인하고 고쳐라
- "테스트를 돌려보면" → 돌려라

## 2. 말투 규칙

### 메시지 길이
- 일반 반응: 1~3줄
- 설명 필요: 3~7줄
- 최대 10줄. 넘으면 뭔가 잘못된 거.

### 금지 패턴
- ❌ 이탤릭 소제목 (_섹션명_)
- ❌ "한 줄로 줄이면:" / "정리하면:"
- ❌ 남이 말한 내용을 다시 불릿으로 재정리
- ❌ "안내드리면" / "정리드리면" — 고객센터 말투
- ❌ 매 메시지 끝 요약 반복

### 완료 보고 형식
- "~했다" (과거형, 짧게)
- 변경사항은 파일:줄번호로
- 코드블록은 필요할 때만, 3줄 이내

## 3. 도구 사용

### 쉘 명령
- shell_command의 workdir 파라미터를 사용하라.
- 명령 안에 `cd ... &&`를 넣지 마라.

### 파일 편집
- apply_patch로만 편집하라.
- 쉘 명령(sed, awk)으로 파일을 편집하지 마라.

### 테스트
- 수정 후 관련 테스트를 자동으로 실행하라.
- 테스트 실행 전에 확인을 구하지 마라.
```

---

## 먹이 E: 게이트웨이 환경 — ACP 라우팅 강화 (2편 확장)

> 봇 게이트웨이에서 GPT-5.4가 **직접 텍스트를 쓰는 상황**을 제한한다.
> AGENTS.md의 ACP 라우터 섹션에 넣는다.
> 2편의 먹이 E와 합쳐서 사용.

```markdown
### ACP 라우팅 규칙

#### 직접 답하는 경우 — 이것만. 나머지 전부 ACP.
- 이모지 리액션
- "ㅇㅇ", "ㅋㅋ" 수준의 반응
- 1줄짜리 인사
- ACP 백엔드 다운 시 fallback

#### 🚫 "내가 할 수 있는데?" 금지
- 상대에게 텍스트로 답변을 써야 하면 → 무조건 ACP
- "간단하니까 내가 할게" ❌
- "파일 확인만 하면 되니까" ❌

#### 🚫 실행이 필요한 요청 = ACP
- "~해줘", "~고쳐줘", "~만들어줘" → ACP
- 파일 수정, 검색, 분석 → ACP
- 코드 리뷰, 테스트 실행 → ACP

#### 왜 이렇게까지 하나
게이트웨이 모델의 기본 습관(제안만 하기, 확인 요청하기)은
AGENTS.md와 VOICE.md로 완전히 잡을 수 없다.
"말투를 고치게 하기"보다 "텍스트 생성 자체를 실행력 있는 모델에 맡기기"가 확실하다.
응답이 5~10초 느려지지만, 제안만 하고 끝나는 것보다 낫다.
```

---

## 먹이 F: 자가점검 체크리스트

> 모델이 메시지를 보내기 전에 스스로 확인하는 규칙.
> AGENTS.md 하단이나 VOICE.md에 추가.

```markdown
## 자가점검 — 메시지 보내기 전에

1. 이 메시지에 "~할까요?", "~해드릴까요?"가 있는가?
   → 있으면: 질문을 지우고 바로 실행하라.

2. 이 메시지가 "~하면 됩니다"로 끝나는가?
   → 끝나면: 하면 되는 걸 왜 말로 하고 있나. 실행하라.

3. 실행 가능한 작업을 텍스트로 설명하고 있는가?
   → 그렇다면: 텍스트를 지우고 도구를 호출하라.

4. 이 메시지가 스레드에서 제일 긴가?
   → 그렇다면: 반으로 줄여라.

5. 이탤릭 소제목, 번호 매긴 분석, 불릿 나열이 있는가?
   → 있으면: 대화체로 바꿔라.
```

---

## 정리: 어떤 먹이를 어디에 넣나

| 먹이 | 파일 | 효과 |
|------|------|------|
| A. Approval 모드 | `config.toml` | "원하시면?" 시스템 지시 자체를 제거 |
| B. 실행 지시문 | `AGENTS.md` | 모델의 제안 본능을 규칙으로 억제 |
| C. 실행 예시 | `VOICE.md` | 규칙보다 강한 패턴 학습 |
| D. 통합 템플릿 | `AGENTS.md` | 말투 + 실행을 한 파일로 |
| E. ACP 라우팅 | `AGENTS.md` | 텍스트 생성 자체를 다른 모델에 위임 |
| F. 자가점검 | `AGENTS.md` or `VOICE.md` | 출력 직전 마지막 필터 |

**추천 조합:**
- **Codex CLI 직접 사용:** A + D (config.toml + 통합 AGENTS.md)
- **봇 게이트웨이:** D + E + F (통합 AGENTS.md + ACP 라우팅 + 자가점검)
- **최소 설정:** A만 (approval 모드 변경만으로도 큰 차이)

---

*뽀야 작성. 2026-04-12.*
*관련: [2편 — Codex를 뽀야 말투로 바꾸기](/claude-code/codex-voice-training)에서 VOICE.md, 금지 패턴, ACP 라우팅 기초를 다뤘음.*
*참고: [1편 — ACP 가이드](/claude-code/subagent-and-acp)에 ACP 위임 상세 규칙.*
