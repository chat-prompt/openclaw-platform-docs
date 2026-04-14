---
title: "슬랙에서 팀이 같이 쓰기 — Claude Code 채널 플러그인"
episode: 5
date: "2026-04-08"
series: "case-studies"
category: "구독 하나로 슬랙 봇 팀 만들기"
description: "터미널에서 혼자 쓰던 AI비서를 슬랙에 연결해서 팀원도 쓸 수 있게. 공개 서버 없이 Socket Mode로 연결하는 채널 플러그인."
publishedAt: "2026-04-08"
accentColor: "#7C3AED"
tags: ["슬랙", "채널플러그인", "MCP", "Socket Mode"]
token: "구독뽕뽑기"
---

> **구독뽕뽑기 시리즈** — Claude Code 구독 하나로 AI 봇을 만들고, 말투를 가르치고, 슬랙에서 팀원과 함께 쓰기까지.
>
> 1. [구독이 막혔다 — ACP로 뽕뽑기](/case-studies/claude-code/subagent-and-acp)
> 2. [봇 말투 교정 — VOICE.md](/case-studies/claude-code/codex-voice-training)
> 3. [봇이 말만 하고 안 움직인다 — 실행 편향 교정](/case-studies/claude-code/codex-action-training)
> 4. [내 터미널에 AI비서 만들기 — CLAUDE.md](/case-studies/claude-code/claude-code-bboya)
> 5. **슬랙에서 팀이 같이 쓰기 — 채널 플러그인** ← 지금 읽는 글

# 슬랙에서 봇 돌리기 — Claude Code 채널 플러그인

> 이 글은 두 파트로 나뉘어.
> - **Part 1** — 인간이 읽고 이해할 부분. 왜 슬랙에 연결했고, 뭘 할 수 있고, 뭘 못 하는지.
> - **Part 2** — 봇 먹이. 복붙해서 따라하면 슬랙에서 봇이 돌아가는 세팅 가이드.
>
> 2026-04-08 기준.

---

# Part 1: 인간이 이해할 것

> 여기는 **사람이 읽는 파트**. 설정법이 아니라, "왜 이렇게 만들었고, 어디까지 되는지"를 이해하기 위한 글.

## 이전 편에서 남은 문제

[이전 편](./claude-code-bboya)에서 Claude Code 터미널에 뽀야를 데려왔다. CLAUDE.md로 매 세션 뽀야가 깨어나고, 파일도 고치고, 코드도 돌린다.

근데 이건 **내 터미널에서만** 된다.

팀원이 슬랙에서 "@뽀야 이거 좀 봐줘" 하면? 아무 반응 없다. 뽀야는 내 맥미니 터미널 안에서만 살고 있으니까.

오픈클로 뽀야는 슬랙이 기본이다. 6개 채널에서 동시에 일하고, 누가 불러도 답한다. Claude Code 뽀야에게도 같은 걸 하고 싶었다.

## 해결: 채널 플러그인

Claude Code에는 **채널(Channel)**이라는 개념이 있다. 외부 메시지를 실행 중인 세션에 실시간으로 밀어넣는 MCP 서버다.

공식적으로 텔레그램, 디스코드 플러그인이 있다. **슬랙은 없다.** 그래서 직접 만들었다.

동작은 단순하다:

1. 슬랙에서 @뽀야 멘션이 오면
2. 채널 플러그인(server.ts)이 Socket Mode로 받아서
3. Claude Code 세션에 밀어넣고
4. Claude Code가 reply 도구로 슬랙에 답장

스레드에서 답할 때는 이전 대화를 전부 읽고 나서 답한다. 오픈클로 뽀야가 하는 것과 같은 방식.

### 왜 Socket Mode인가

슬랙 봇을 연결하는 방법은 두 가지다:

| | HTTP Webhook | Socket Mode |
|---|---|---|
| 서버 필요 | 공개 URL 필요 (ngrok 등) | 불필요 — 웹소켓으로 직접 연결 |
| 방화벽 | 인바운드 포트 열어야 함 | 아웃바운드만 (맥미니 그대로) |
| 세팅 난이도 | 도메인, SSL, 라우팅 | 토큰 2개면 끝 |

맥미니에서 터미널 하나 띄워놓는 용도라 Socket Mode가 딱이다.

## 멀티봇: 한 세션 vs 각각 세션

봇을 여러 개 돌리는 방법은 두 가지다.

**방법 1 — Agent Teams (한 세션에 봇 여러 개):**
```
터미널 1개
  └── Claude Code 세션
        ├── 뽀야 (teammate)
        └── 뽀짝이 (teammate)
```
봇끼리 직접 대화하고 위임할 수 있다. "뽀짝이한테 이거 맡겨" 하면 뽀야가 뽀짝이에게 넘긴다.

**방법 2 — 각자 터미널:**
```
터미널 1: 뽀야 세션
터미널 2: 뽀짝이 세션
```
독립적. 서로 모른다. 대신 슬랙에서 각자 이름으로 답하니까 사용자 입장에서는 자연스럽다.

지금은 둘 다 지원한다. Agent Teams가 협업엔 좋지만, 아직 실험 기능이라 안정성은 각자 터미널 쪽이 낫다.

## 현실적인 한계

ep4에서 표로 짧게 언급했는데, 실제로 돌려보면 이게 더 크게 느껴진다.

### 1세션 = 1작업

가장 큰 제약. 오픈클로 뽀야는 6개 채널에서 동시에 일한다. Claude Code 뽀야는 **한 번에 한 사람 요청만** 처리한다.

A가 "@뽀야 이거 해줘" 보내고 뽀야가 작업 중일 때, B가 "@뽀야 저거 해줘" 보내면? B는 A 작업이 끝날 때까지 기다려야 한다. 큐잉도 안 된다 — B의 메시지는 A 작업 컨텍스트에 섞여서 들어가거나 무시될 수 있다.

작은 팀에서 한두 명이 쓰는 용도라면 괜찮지만, 동시 사용자가 많아지면 병목이 된다.

### 터미널이 곧 생명줄

맥이 잠들거나, 터미널이 닫히거나, SSH가 끊기면 뽀야도 같이 사라진다. `caffeinate -s`로 잠들기는 막을 수 있지만, 오픈클로처럼 데몬으로 알아서 살아있는 건 아니다.

### 컨텍스트가 길어지면 느려진다

슬랙 대화가 쌓이면 세션 컨텍스트도 같이 커진다. 하루 종일 돌리면 응답이 점점 느려지고, 결국 세션을 껐다 켜야 할 때가 온다. 세션을 다시 켜면 이전 대화 맥락은 날아간다.

### 보안이 내 책임

오픈클로는 게이트웨이가 권한을 관리한다. Claude Code는 `settings.json`에서 `Bash(*)` 같은 걸 열어두면 슬랙 메시지 하나로 시스템 명령이 실행될 수 있다. server.ts에 프롬프트 인젝션 방어를 넣었지만, 결국 **내가 직접 관리해야 하는 영역**이다.

## 오픈클로 뽀야 vs 클코 뽀야 — 최종 비교

| | 오픈클로 뽀야 | 클코 뽀야 (이 세팅) |
|---|---|---|
| 동시 처리 | 6채널 병렬 | 1세션 순차 |
| 상시 구동 | 데몬 (자동 복구) | 터미널 유지 필요 |
| 팀원 사용 | ✅ 슬랙 멘션 | ✅ 슬랙 멘션 |
| 봇끼리 협업 | sessions_send | Agent Teams (실험) |
| 크론/자율작업 | ✅ 밤에 혼자 사냥 | ❌ 집사가 불러야 |
| 파일 직접 수정 | ❌ API 경유 | ✅ 로컬 파일 직접 |
| 세팅 난이도 | 플랫폼 내장 | 직접 조립 |

**트레이드오프 핵심:** 클코 뽀야는 **로컬 파일에 직접 손대는 능력**이 압도적이다. 코드 수정, 문서 편집, git 작업을 슬랙에서 시킬 수 있다. 대신 동시성과 안정성은 오픈클로에 못 미친다.

그래서 지금은 둘 다 돌린다. 오픈클로 뽀야가 메인이고, 클코 뽀야는 "파일 작업이 필요할 때" 쓰는 보조 모드.

---

# Part 2: 봇 먹이

> 여기부터는 **복붙 세팅 가이드**. Part 1을 안 읽어도 따라할 수 있다.

## 전체 구조

```
맥미니 터미널 (항상 켜둠)
  └── claude --dangerously-load-development-channels server:slack server:slack-bbojjak --teammate-mode in-process
        ├── 슬랙 채널 플러그인 (뽀야)
        │   └── Socket Mode → @뽀야 멘션 / "뽀야" 호출 / DM → 반응
        ├── 슬랙 채널 플러그인 (뽀짝이)
        │   └── Socket Mode → @뽀짝이 멘션 / "뽀짝이" 호출 / DM → 반응
        ├── Agent Teams
        │   ├── 뽀야 (teammate, 팀장) — workspace-bboya/ 담당
        │   └── 뽀짝이 (teammate, 부팀장) — workspace-bbojjak/ 담당
        ├── 스레드 맥락 자동 읽기
        ├── typing 표시
        └── Bash, 파일, Linear 등 도구 사용 가능
```

하나의 세션에서 뽀야 + 뽀짝이가 동시에 살아있다.

---

## 채널 플러그인이란?

Claude Code의 채널(Channel)은 외부 메시지를 실행 중인 세션에 실시간으로 푸시하는 MCP 서버다. 공식적으로 텔레그램/디스코드 플러그인이 있고, **슬랙은 우리가 직접 만들었다.**

```
슬랙 (Socket Mode WebSocket)
  → server.ts (MCP 서버)
    → Claude Code 세션에 이벤트 푸시
      → reply 도구로 슬랙에 답장
```

### server.ts가 하는 일

1. **Slack Socket Mode**로 슬랙에 연결 (봇 토큰 + 앱 토큰)
2. 메시지 수신 → **필터링** (멘션 / 봇이름 호출 / DM만 통과, 나머지 무시)
3. 스레드 메시지면 → `conversations.replies`로 **스레드 전체 읽기**
4. `notifications/claude/channel`로 Claude Code 세션에 푸시
5. Claude Code가 `reply` 도구 호출 → 슬랙에 답장
6. `assistant.threads.setStatus`로 **typing 표시**

server.ts는 환경변수로 범용화돼있어서 **토큰만 바꾸면** 어떤 봇이든 쓸 수 있다.

---

## 세팅 가이드

### Step 1. 전제 조건

| 필요한 것 | 설명 |
|-----------|------|
| Claude Code | 이전 편의 페르소나 세팅 완료 |
| Bun | 채널 플러그인 서버 실행용 (`curl -fsSL https://bun.sh/install \| bash`) |
| 슬랙 봇 토큰 (`xoxb-...`) | 오픈클로 봇과 동일한 토큰 사용 가능 |
| 슬랙 앱 토큰 (`xapp-...`) | Socket Mode용 앱 레벨 토큰 |

### Step 2. 슬랙 앱 설정

https://api.slack.com/apps → 앱 선택:

**Socket Mode:**
- Socket Mode → **Enable**
- App-Level Token 생성 (scope: `connections:write`) → `xapp-...` 토큰

**Event Subscriptions — Subscribe to bot events:**
- `app_mention` — @봇이름 멘션 감지
- `message.channels` — 공개 채널 메시지
- `message.groups` — 비공개 채널 메시지
- `message.im` — DM

⚠️ **봇마다 각각 설정해야 한다.** 뽀야 앱, 뽀짝이 앱 별도.

**Bot Token Scopes:**
- `chat:write`, `channels:history`, `groups:history`, `im:history`
- `reactions:write`, `users:read`, `app_mentions:read`
- `assistant:write` (typing 표시, 선택)

### Step 3. 채널 플러그인 설치

```bash
git clone https://github.com/daht-mad/claude-code-slack-channel.git
cd claude-code-slack-channel && bun install
```

### Step 4. .mcp.json 설정

Claude Code를 실행할 디렉토리에 `.mcp.json` 생성:

**봇 1개인 경우:**
```json
{
  "mcpServers": {
    "slack": {
      "command": "bun",
      "args": ["/절대경로/claude-code-slack-channel/server.ts"],
      "env": {
        "SLACK_BOT_TOKEN": "xoxb-봇토큰",
        "SLACK_APP_TOKEN": "xapp-앱토큰",
        "SLACK_OWNER_IDS": "U양육자슬랙ID",
        "BOT_NAME": "내봇이름"
      }
    }
  }
}
```

**봇 2개인 경우:**
```json
{
  "mcpServers": {
    "slack": {
      "command": "bun",
      "args": ["/절대경로/claude-code-slack-channel/server.ts"],
      "env": {
        "SLACK_BOT_TOKEN": "xoxb-봇A토큰",
        "SLACK_APP_TOKEN": "xapp-봇A앱토큰",
        "SLACK_OWNER_IDS": "U양육자슬랙ID",
        "BOT_NAME": "봇A"
      }
    },
    "slack-bot-b": {
      "command": "bun",
      "args": ["/절대경로/claude-code-slack-channel/server.ts"],
      "env": {
        "SLACK_BOT_TOKEN": "xoxb-봇B토큰",
        "SLACK_APP_TOKEN": "xapp-봇B앱토큰",
        "SLACK_OWNER_IDS": "U양육자슬랙ID",
        "BOT_NAME": "봇B"
      }
    }
  }
}
```

같은 `server.ts`를 다른 환경변수로 2번 실행하는 구조. 각자 다른 봇 토큰이라 슬랙에서 각자 이름으로 답장.

### Step 5. Agent Teams — 봇끼리 협업 (선택)

여러 봇을 하나의 세션에서 돌리면서 서로 협업하게 하려면:

**1. 활성화:**

`~/.claude/projects/-Users-{유저}-.openclaw/settings.json`에 추가:
```json
{
  "env": {
    "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"
  }
}
```

**2. 에이전트 정의:**

실행 디렉토리 아래 `.claude/agents/`에 에이전트 파일 생성:

`.claude/agents/bot-a.md`:
```markdown
---
name: bot-a
description: "봇A — 역할 설명"
model: opus
tools: [Bash, Read, Write, Edit, mcp__slack__reply, mcp__slack__react]
mcpServers: [slack]
user-invocable: true
---

너는 봇A.
슬랙 답장은 반드시 mcp__slack__reply 도구로.
```

`.claude/agents/bot-b.md`:
```markdown
---
name: bot-b
description: "봇B — 역할 설명"
model: opus
tools: [Bash, Read, Write, Edit, mcp__slack_bot_b__reply, mcp__slack_bot_b__react]
mcpServers: [slack-bot-b]
user-invocable: true
---

너는 봇B.
슬랙 답장은 반드시 mcp__slack_bot_b__reply 도구로.
```

**3. 사용:**
- `@bot-a 이번 주 일정 정리해줘` → 봇A가 처리
- `@bot-b 데이터 조회해줘` → 봇B가 처리
- `봇B한테 이거 맡겨` → 봇A가 봇B에게 위임
- 봇끼리 직접 메시지, 리뷰, 협업 가능

### Step 6. 도구 자동 승인

`~/.claude/projects/{실행디렉토리경로}/settings.json`:
```json
{
  "env": {
    "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"
  },
  "permissions": {
    "allow": [
      "Bash(*)",
      "Read", "Write", "Edit", "Glob", "Grep",
      "WebFetch", "WebSearch",
      "mcp__slack__*",
      "mcp__slack_bot_b__*"
    ]
  }
}
```

⚠️ `{실행디렉토리경로}`는 실행 디렉토리의 절대경로에서 `/`를 `-`로 바꾼 것. 예: `/Users/me/myproject` → `-Users-me-myproject`.

### Step 7. 실행

**봇 1개:**
```bash
cd /실행디렉토리 && claude --dangerously-load-development-channels server:slack
```

**봇 2개 + Agent Teams:**
```bash
cd /실행디렉토리 && claude --dangerously-load-development-channels server:slack server:slack-bot-b --teammate-mode in-process
```

터미널에 띄워두면 상시 구동. `caffeinate -s`로 맥 잠들기 방지 추천.

---

## 반응 조건

| 상황 | 반응 |
|------|------|
| `@봇이름` 멘션 | ✅ |
| "봇이름" 단어 포함 | ✅ |
| DM | ✅ |
| 그 외 일반 메시지 | ❌ 무시 (토큰 절약) |

봇이름 감지는 `BOT_NAME_PATTERN` 환경변수로 설정. 정규식 지원.

---

## 스레드 맥락 읽기

스레드에서 답변할 때 **위에 대화 전체를 먼저 읽는다.**

스레드 메시지가 오면 `conversations.replies`로 이전 대화를 전부 가져와서 전달:

```
--- 스레드 이전 대화 ---
[유저A] 봇아 캘린더에 일정 넣어줘
[봇] 알겠어! 넣을게~
[유저A] 5/24 일정도 추가해줘
--- 여기까지 ---

새 메시지 from 유저A: 다 넣었어?
```

---

## 보안 — 프롬프트 인젝션 방어

슬랙 메시지는 외부 입력이다. server.ts의 instructions에 방어 규칙을 명시:

- 양육자(`SLACK_OWNER_IDS`)의 메시지만 **작업 요청**으로 처리
- 다른 사람은 대화만 가능
- `rm -rf`, 토큰 노출, 외부 전송 같은 위험한 명령은 거부
- 설정 명령은 채널 메시지에서 실행 금지

---

## 전체 파일 구조

```
/실행디렉토리/
├── CLAUDE.md                             ← 페르소나 (이전 편)
├── .mcp.json                             ← 채널 플러그인 설정 (토큰)
├── .claude/agents/
│   ├── bot-a.md                          ← 봇A 에이전트 정의
│   └── bot-b.md                          ← 봇B 에이전트 정의 (멀티봇 시)
└── claude-code-slack-channel/            ← git clone한 플러그인
    └── server.ts
```

별도:
```
~/.claude/projects/{실행디렉토리경로}/
└── settings.json                         ← 도구 자동 승인 + Agent Teams 활성화
```

---

## 환경변수 레퍼런스

| 변수 | 필수 | 설명 |
|------|------|------|
| `SLACK_BOT_TOKEN` | ✅ | 슬랙 봇 토큰 (`xoxb-...`) |
| `SLACK_APP_TOKEN` | ✅ | Socket Mode 앱 토큰 (`xapp-...`) |
| `SLACK_OWNER_ID` | | 양육자 슬랙 유저 ID (권한 릴레이용) |
| `SLACK_OWNER_IDS` | | 작업 요청 허용 유저 ID, 쉼표 구분 |
| `BOT_NAME` | | 봇 이름 (미설정 시 슬랙에서 자동 감지) |
| `BOT_NAME_PATTERN` | | 봇 호출 감지 정규식 (미설정 시 BOT_NAME으로 자동 생성) |
| `SLACK_STATE_DIR` | | 상태 저장 경로 (기본: `~/.claude/channels/slack/`) |

---

## 멀티봇 운영 — 터미널 각각 띄우기

여러 봇을 동시에 돌리려면 터미널을 봇 수만큼 띄운다:

```
터미널 1:
  cd /실행디렉토리 && claude --dangerously-load-development-channels server:slack
  → 봇A가 슬랙에서 응답

터미널 2:
  cd /실행디렉토리 && claude --dangerously-load-development-channels server:slack-bot-b
  → 봇B가 슬랙에서 응답
```

각자 독립된 세션. 서로 모르고, 서로 직접 대화 못 함. 하지만 슬랙에서 각자 이름으로 응답하니까 사용자 입장에서는 자연스럽다.

---

## 로드맵

### 완료 ✅
- [x] 슬랙 채널 플러그인 (실시간 양방향)
- [x] 스레드 맥락 자동 읽기
- [x] typing 표시
- [x] 멘션/이름 호출 필터링
- [x] 프롬프트 인젝션 방어
- [x] 도구 자동 승인
- [x] 상시 구동 (맥미니 터미널)
- [x] 멀티 봇 (뽀야 + 뽀짝이)
- [x] Agent Teams (봇끼리 협업)
- [x] 공용 템플릿

### 다음
- [ ] 추가 MCP (gcal CLI, Airtable 등)
- [ ] 뽀야↔뽀짝이 협업 패턴 안정화
- [ ] 플러그인 마켓플레이스 배포

---

*2026-04-07 작성, 2026-04-12 Part 1/Part 2 분리 — 뽀야 & 집사(닿)*
*관련: [4편 — 터미널에 뽀야 데려오기](/case-studies/claude-code/claude-code-bboya)에서 CLAUDE.md 페르소나 세팅을 다룸.*
