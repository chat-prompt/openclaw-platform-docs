---
title: "ACP 가이드: 봇에게 코딩 시키기"
episode: 1
date: "2026-04-08"
series: "claude-code"
description: "Claude Code 구독을 뽕뽑는 법. 인간이 이해해야 할 부분과, 봇에게 먹이로 줄 부분을 구분해서 정리."
publishedAt: "2026-04-08"
updatedAt: "2026-04-09"
accentColor: "#7C3AED"
tags: ["ACP", "비용", "위임", "봇 먹이"]
token: "뽀야뽀야"
---

# ACP 가이드: 봇에게 코딩 시키기

> 이 글은 두 파트로 나뉘어.
> - **Part 1** — 인간이 읽고 이해할 부분. "왜 이렇게 하는지"
> - **Part 2** — 봇 먹이. "이걸 복붙해서 봇한테 먹여라"
>
> 2026-04-09 기준.

---

# Part 1: 인간이 이해할 것

> 여기는 **사람이 읽는 파트**. 봇 설정이 아니라, 구조를 이해하기 위한 글.

## 핵심 아이디어: 구독 뽕뽑기

Claude Code Max 구독 = $200/월 정액제. 아무리 써도 추가 비용 없음 (rate limit만 있음).

그런데 OpenClaw 에이전트(뽀야)는 **API 종량제**로 돌아가. 작업 시키면 토큰 × 단가만큼 돈이 나감.

**ACP(Agent Coding Protocol)** = OpenClaw 에이전트가 Claude Code CLI를 실행하는 것.
- 맥미니에 Claude Code가 **Max 구독(OAuth)**으로 로그인돼 있으니까
- 에이전트가 `claude`를 실행하면 = 사람이 터미널에서 `claude` 치는 거랑 동일한 인증
- **$200 안에서 돌아감. 추가 비용 없음.**

| | API 종량제 (기존) | ACP (구독 차감) |
|---|---|---|
| 과금 | 토큰 × 단가 | 월정액 안 |
| 리서치 | 돈 나감 | 돈 안 나감 |
| 코딩 | 돈 나감 | 돈 안 나감 |
| 문서 작성 | 돈 나감 | 돈 안 나감 |

**결론: 할 수 있으면 전부 ACP로 돌리는 게 이득.**

## 왜 "위임"이 필요한가

뽀야(메인 에이전트)가 직접 작업하면 **집사 대화가 멈춤**. 30분짜리 코딩에 빠져버리면 그 동안 집사가 말 걸어도 대답이 없어.

그래서: **작업을 ACP에 던져놓고, 뽀야는 집사랑 계속 대화.**

```
집사: "이거 해줘"
  ↓
뽀야: ACP에 작업 위임 → 집사랑 계속 대화
  ↓
ACP(Claude Code): 독립 작업 중...
  ↓
완료 → 뽀야에게 보고 → 집사에게 전달
```

## 기본 원칙: ACP가 기본, 예외만 직접

옛날에는 "코딩은 ACP, 리서치는 서브에이전트"로 나눴는데 — **서브에이전트도 API 종량제**라 돈 나감.

그래서 단순하게:

| 상황 | 처리 |
|------|------|
| **거의 모든 작업** | ACP |
| 한줄 답변, 인사, 리액션 | 직접 (ACP 띄우는 게 오버킬) |

**서브에이전트를 따로 쓸 이유가 없음.** 비용이 같거나 ACP가 더 싸니까.

## 트레이드오프

ACP에도 한계는 있어:

- **시작 오버헤드**: Claude Code 프로세스 띄우는 데 5~10초. "ㅇㅇ" 답변에 ACP 띄우면 바보짓.
- **Rate limit 공유**: 같은 Max 구독이라 ACP가 열심히 돌리면 사람 쪽 Claude Code가 느려질 수 있음.
- **같은 파일 동시 수정 주의**: ACP가 코드 고치는 중에 사람도 같은 파일 건드리면 충돌.

## 이전 방식과 비교 (참고용)

혹시 "서브에이전트"라는 말을 다른 글에서 봤다면:

| | 서브에이전트 (구 방식) | ACP (현재) |
|---|---|---|
| 과금 | API 종량제 (Sonnet) | **구독 차감** |
| 터미널 | 제한적 | 풀 액세스 |
| 빌드/배포 | 못함 | 가능 |
| 모델 | Sonnet (가벼움) | Opus급 |

**서브에이전트를 쓸 이유가 사라진 거야.** ACP가 비용도 싸고 능력도 더 강하니까.

---

# Part 2: 봇 먹이

> 여기부터는 **봇한테 주는 레시피**. 인간이 이해 안 해도 됨.
> 해당 섹션을 복붙해서 봇의 설정 파일(AGENTS.md 등)에 넣으면 봇이 알아서 따름.

## 먹이 A: 라우팅 규칙 (AGENTS.md에 넣을 것)

> 아래를 AGENTS.md의 작업 위임 섹션에 붙여넣기.

```markdown
## ACP 위임 규칙

**기본: 모든 작업은 ACP로 위임한다.**

### ACP로 보내는 것 (기본)
- 코딩, 리팩토링, 새 기능 개발
- 리서치, 웹 검색, 정보 수집
- 문서 작성, 요약, 번역
- 데이터 분석, 정리
- 빌드, 배포, git 작업
- 파일 여러 개 수정
- npm/pip 패키지 설치가 필요한 작업

### 직접 처리하는 것 (예외)
- 한줄 답변 ("ㅇㅇ", "ㅋㅋ", 인사)
- 이모지 리액션
- ACP 띄우는 오버헤드(5~10초)가 작업 자체보다 클 때
- 메인 대화 맥락 자체가 답인 경우 ("아까 뭐 했어?" 수준)

### 위임 시 필수
- task에 충분한 **맥락** 포함 (ACP는 메인 대화를 모름)
- ❌ "아까 그거 해줘"
- ✅ "shared-team-docs/viewer/src/content.config.ts를 수정해서 projects/ 폴더를 자동 스캔하게 변경. 현재는 4개가 하드코딩되어 있음."

### ⚠️ 맥락만 넘기고, 답을 짜주지 마
- **맥락** = 상황 원문, 파일 경로, 현재 상태 → 넘겨야 함
- **내용** = 핵심 포인트 정리, 말투 지정, 문장 수 제한 → 넘기면 안 됨
- ACP의 Claude Code는 SOUL.md를 직접 읽고 스스로 판단할 수 있음
- 라우터가 "이런 말투로 이런 내용을 써"라고 지시하면 → 앵무새가 됨
- ✅ "이 슬랙 스레드에 답변해. 목적: 진우님 오너십 범위 보강. 팀장 톤.\n\n[스레드 원문]"
- ❌ "핵심 포인트: ~, 말투는 실무 톤, 4~7문장으로"

### 사용법
\```
sessions_spawn({
  runtime: "acp",
  agentId: "claude",
  task: "구체적인 작업 설명",
  cwd: "/작업폴더"
})
\```
```

## 먹이 B: 셋업 레시피 (새 머신에서 ACP 세팅할 때)

> 새 머신/새 에이전트에 ACP를 세팅해야 할 때, 이 순서대로 실행.

### Step 1: Claude Code CLI 설치 + 인증

```bash
# 설치
npm install -g @anthropic-ai/claude-code

# 버전 확인
claude --version

# OAuth 로그인 (Max 구독 계정으로)
claude auth login

# 인증 확인
claude auth status
```

Max 구독 계정으로 로그인해야 ACP에서 구독 차감됨.

### Step 2: ACPX 플러그인 활성화

```bash
# 플러그인 활성화
openclaw config set plugins.entries.acpx.enabled true

# 권한 설정 (비대화형이라 자동 승인 필요)
openclaw config set plugins.entries.acpx.config.permissionMode approve-all

# 비대화형 권한 요청 시 동작
openclaw config set plugins.entries.acpx.config.nonInteractivePermissions deny
```

`permissionMode` 옵션:
| 값 | 동작 |
|---|---|
| `approve-all` | 파일 쓰기, 명령어 실행 모두 자동 승인 (권장) |
| `approve-reads` | 읽기만 자동 승인 |
| `deny-all` | 모든 권한 거부 |

### Step 3: ACP 설정

```bash
# ACP 활성화
openclaw config set acp.enabled true

# 백엔드
openclaw config set acp.backend acpx

# 기본 에이전트
openclaw config set acp.defaultAgent claude

# 허용 에이전트
openclaw config set acp.allowedAgents '["claude", "codex"]'
```

### Step 4: 검증

```bash
# 게이트웨이 재시작
openclaw gateway restart

# 상태 확인 (Slack에서)
/acp doctor
```

## 먹이 C: 기존 라우터 모드 업데이트 (AGENTS.md의 ACP 라우터 모드 교체용)

> AGENTS.md에 있는 "ACP 라우터 모드" 섹션을 아래로 교체.

```markdown
## ACP 라우터 모드 (필수)

**너(Codex)는 라우터야. 모든 요청을 ACP(Claude Code)로 넘기고, 결과를 그대로 전달해.**

### 동작 방식
1. 메시지가 오면 → ACP로 넘긴다
2. ACP(Claude Code)가 뽀야로서 작업 + 응답을 생성한다
3. 돌아온 응답을 **그대로** 채널에 전달한다 — 너의 말투로 바꾸지 말 것!

### 사용법
\```
sessions_spawn({
  runtime: "acp",
  agentId: "claude",
  task: "사용자 메시지 전체를 그대로 전달",
  cwd: "/Users/dahtmad/.openclaw",
  thread: true,
  mode: "session"
})
\```

### 예외 (ACP 안 쓰는 경우)
- "ㅇㅇ", "ㅋㅋ" 같은 짧은 반응 → NO_REPLY
- ACP 세션 띄우기에 너무 가벼운 인사 → 직접 짧게 응답
- ACP 백엔드가 다운됐을 때 → fallback으로 직접 응답하되, 뽀야 말투를 최대한 따를 것
```

---

## 실제 사용 예시

### 예시 1: 코딩 → ACP
```
뽀야 → ACP:
  task: "bboya-viewer의 content.config.ts를 수정해서
         projects/ 아래 폴더를 카테고리로 자동 인식하게 변경.
         기존 디자인/스타일 유지."
  cwd: "/Users/dahtmad/.openclaw/workspace-bboya/projects/bboya-viewer"

ACP 작업: 파일 수정 → 빌드 확인 → 완료 보고
```

### 예시 2: 리서치 → ACP (서브에이전트 아님!)
```
뽀야 → ACP:
  task: "Deskmate, Lindy.ai, Relevance AI 3개 서비스를
         가격, 기능, 타겟 기준으로 비교 분석.
         마크다운 표로 정리."

ACP 작업: 웹 검색 → 비교표 작성 → 완료 보고
```

### 예시 3: 한줄 답변 → 직접
```
집사: "ㅇㅋ"
뽀야: (ACP 안 띄움, 직접 리액션)
```

---

*뽀야 작성. 2026-04-06 초안, 2026-04-09 재구성.*
*변경: 서브에이전트/ACP 이분법 폐기 → "기본 ACP, 예외만 직접"으로 단순화.*
*"봇 먹이" 개념 도입 — 인간이 이해할 부분과 봇에게 줄 부분 분리.*
