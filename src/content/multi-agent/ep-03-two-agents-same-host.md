---
title: "같은 맥미니에 2마리 — 뽀야 + 뽀짝이"
episode: 3
series: multi-agent
publishedAt: "2026-04-25"
accentColor: "#8B5CF6"
description: "한 대의 맥미니에 두 에이전트를 페르소나 격리해서 돌리는 법. cwd 기반 spawn + bindings route + slack-thread-rehydrate hook 자동 적용."
tags: ["멀티에이전트", "OpenClaw", "Claude CLI", "페르소나 격리"]
token: "밋업"
---

# 02 · 같은 맥미니에 2마리 (뽀야 + 뽀짝이)

> 전제: [01-single-agent.md](./01-single-agent.md)를 끝내 첫 에이전트가 돌고 있음.
> 예시: 뽀야(default, 팀장 비서) + 뽀짝이(부팀장, AI스터디 전담)

## 전체 그림 — 페르소나 격리 메커니즘

```
한 대의 맥미니, 한 대의 OpenClaw 게이트웨이

Slack Workspace A (뽀피터스)
    ├── @뽀야  (Bot Token A, default account)
    └── @뽀짝이 (Bot Token B, bbojjak account)
        │
        ▼
    게이트웨이 1개 (launchd: ai.openclaw.gateway)
        │
        ├─→ bindings route [accountId=default|dajidongsan|hbscom] → agentId=bboya
        └─→ bindings route [accountId=bbojjak]                    → agentId=bbojjak
            │
            ▼
        cli-backend가 agentId에 맞는 cwd로 Claude CLI spawn
            ├─→ cwd=workspace-bboya   ──┐
            └─→ cwd=workspace-bbojjak ──┤
                                        ▼
            OpenClaw가 그 cwd의 워크스페이스 파일 자동 주입
            (IDENTITY/SOUL/USER/AGENTS/TOOLS/MEMORY)
                                        │
                                        ▼
                        각자의 페르소나로 응답
```

**핵심**: 같은 Claude CLI 바이너리인데 **spawn되는 cwd가 다르니** OpenClaw의 자동 주입도 다르게 먹힌다 → 페르소나 격리. 2마리 운영의 작동 원리는 전부 이 한 줄로 수렴한다.

## 2마리 운영의 핵심 원칙

0. **페르소나 격리 = cwd 분리 + OpenClaw 자동 주입**. 각 에이전트의 말투·정체성·하드룰은 01 가이드대로 **각자의 워크스페이스 파일(SOUL/AGENTS Red Lines 등)에서 이미 관리되고 있음**. 2마리 됐다고 말투 규칙을 새로 박는 게 아니라, cwd만 올바르게 라우팅되면 페르소나는 자동으로 격리된다.
1. **슬랙 앱은 에이전트마다 별도**. 토큰 2쌍.
2. **워크스페이스 디렉토리도 별도**. `workspace-bboya/`, `workspace-bbojjak/`
3. **`default: true`는 단 1명**. 전체 매칭 실패 시 최종 fallback 대상. 보통 팀장 역할을 default로.
4. **route 바인딩은 accountId 기준**. 한 에이전트가 여러 슬랙 account를 받을 수 있음 (뽀야가 default/dajidongsan/hbscom 전부 받는 식)
5. **게이트웨이는 여전히 1대**. 2마리라고 2대 돌릴 필요 없음 — cli-backend가 에이전트별 cwd로 spawn 격리

---

## STEP 1 · 두 번째 슬랙 앱 만들기 (뽀짝이)

01 가이드 STEP 1과 동일하게 반복 — **별개의 Slack App**으로.

- 앱 이름: `뽀짝이`
- Workspace: 같은 뽀피터스 워크스페이스
- Socket Mode ON, Bot/App Token 별도 발급
- Bot Token Scopes: 01 가이드와 동일
- Event Subscriptions: `app_mention`, `message.channels`, `message.groups`, `message.im`
- 앱 설치 후 원하는 채널에 `/invite @뽀짝이`

⚠️ **같은 슬랙 앱을 재사용하지 말 것.** 토큰 하나 = account 하나 = 에이전트 하나의 원칙.

---

## STEP 2 · 두 번째 워크스페이스 디렉토리

01 가이드에서 `workspace-bboya/`를 만들었던 것과 **완전히 동일한 방식**으로 `workspace-bbojjak/`을 만든다. 페르소나 파일 6개 (IDENTITY/SOUL/USER/AGENTS/TOOLS/MEMORY) + AGENTS.md의 `## Session Startup` / `## Red Lines` 섹션.

```
~/.openclaw/
├── workspace-bboya/    ← 01 가이드에서 만든 것
│   ├── IDENTITY.md     스코티시폴드 팀장
│   ├── SOUL.md         반말, 팀장 톤
│   ├── AGENTS.md       ## Red Lines에 말투 박힘 (뽀야용)
│   └── ...
└── workspace-bbojjak/  ← 새로 만듦 (01 STEP 1과 동일 절차)
    ├── IDENTITY.md     봄베이 부팀장
    ├── SOUL.md         존댓말, 실무 전담
    ├── AGENTS.md       ## Red Lines에 말투 박힘 (뽀짝이용)
    └── ...
```

### 페르소나 격리는 어떻게 되나

핵심은 "**2마리 됐다고 별도 장치 넣는 게 아니다**"는 것. 01에서 이미 확립한 방식 그대로:

- 뽀야의 반말·팀장 톤 → `workspace-bboya/AGENTS.md`의 `## Red Lines`에 박혀있음
- 뽀짝이의 존댓말·실무 톤 → `workspace-bbojjak/AGENTS.md`의 `## Red Lines`에 박혀있음

→ cli-backend가 뽀짝이 호출받으면 `cwd=workspace-bbojjak`로 Claude CLI spawn → OpenClaw가 그 cwd의 AGENTS.md를 주입 → 뽀짝이는 자기 Red Lines만 봄. **뽀야의 반말 규칙은 뽀짝이 세션에 들어갈 일이 없다.** 서로 간섭 없음.

### 뽀짝이 사례 — Red Lines에 박지 않으면 생기는 일

한때 뽀짝이 존댓말 규칙을 `SOUL.md`에만 두고 `AGENTS.md ## Red Lines`엔 안 박았던 적 있음. 긴 대화 후 post-compaction 재주입에서 Red Lines만 살아남고 SOUL.md 말투 규칙은 요약되며 희석 → 첫 턴에 반말로 답한 사고.

→ **말투는 반드시 AGENTS.md `## Red Lines`에 박기** (01 가이드 STEP 1 원칙 그대로). 2마리 운영의 페르소나 혼동은 대부분 여기서 발생.

### 글로벌 `~/.claude/CLAUDE.md` 충돌

01 Advanced 섹션의 "CLAUDE.md 체인 로딩 함정" 그대로 적용. 글로벌 CLAUDE.md에 한쪽 말투 규칙 있으면 두 워크스페이스 다 오염될 수 있으니:

- 방어 1: 글로벌 CLAUDE.md를 정리 (페르소나·말투 빼기)
- 방어 2: 각 AGENTS.md `## Red Lines`에 "글로벌 X 규칙 무시" 명시

2마리 운영이라고 **CLAUDE.md를 새로 만들 필요는 없다**. Red Lines로 해결 가능.

---

## STEP 3 · `openclaw.json` 수정

### 3-1. agents.list에 뽀짝이 추가 (뽀야 항목은 그대로)

```json
{
  "id": "bboya",
  "default": true,
  "name": "뽀야",
  "workspace": "/Users/dahtmad/.openclaw/workspace-bboya",
  "model": { "primary": "claude-cli/claude-opus-4-7", "fallbacks": [] },
  "heartbeat": { "every": "0" },
  "groupChat": { "mentionPatterns": ["뽀야", "bboya"] },
  "tools": { "exec": { "security": "full" } },
  "subagents": { "allowAgents": ["bbojjak"] }
},
{
  "id": "bbojjak",
  "name": "뽀짝이",
  "workspace": "/Users/dahtmad/.openclaw/workspace-bbojjak",
  "model": { "primary": "claude-cli/claude-opus-4-7", "fallbacks": ["openai-codex/gpt-5.4"] },
  "heartbeat": { "every": "0" },
  "groupChat": { "mentionPatterns": ["뽀짝이", "bbojjak"] },
  "tools": { "exec": { "security": "full" } }
}
```

포인트:
- 뽀야에 **`"default": true`** 유지 (fallback 대상)
- 뽀짝이에 default 없음
- **뽀야는 `fallbacks: []`, 뽀짝이는 `["openai-codex/gpt-5.4"]`로 차등** — 뽀야는 집사 판단에 직접 쓰이는 팀장급이라 codex 톤 뒤틀림이 더 위험하니 침묵 우선. 뽀짝이는 AI스터디 발송·운영 실무 전담이라 멈추면 수강생 피해 큼 → 성능 떨어져도 폴백으로 작업 이어가기
- (선택) 뽀야에 `subagents.allowAgents: ["bbojjak"]` — 뽀야가 뽀짝이에게 작업 위임 가능하게

### 3-2. channels.slack.accounts에 뽀짝이 추가

```json
"accounts": {
  "default": {
    "name": "뽀야 (default)",
    "botToken": "xoxb-...",
    "appToken": "xapp-...",
    ...
  },
  "bbojjak": {
    "name": "뽀짝이",
    "botToken": "xoxb-...",
    "appToken": "xapp-...",
    "dmPolicy": "allowlist",
    "allowFrom": ["U06BNH5R26T"],
    "groupPolicy": "allowlist",
    "channels": {
      "C0AGTTF23DZ": { "allowBots": true },
      "C04Q9BL0HE3": { "allowBots": true }
    },
    "streaming": { "mode": "partial", "nativeTransport": true },
    "thread": { "historyScope": "thread", "inheritParent": false, "initialHistoryLimit": 10 }
  }
}
```

### 3-3. bindings에 route 추가

```json
{ "type": "route", "agentId": "bboya",   "match": { "channel": "slack",    "accountId": "default" }},
{ "type": "route", "agentId": "bboya",   "match": { "channel": "slack",    "accountId": "dajidongsan" }},
{ "type": "route", "agentId": "bboya",   "match": { "channel": "slack",    "accountId": "hbscom" }},
{ "type": "route", "agentId": "bboya",   "match": { "channel": "telegram", "accountId": "bboya" }},
{ "type": "route", "agentId": "bbojjak", "match": { "channel": "slack",    "accountId": "bbojjak" }},
{ "type": "route", "agentId": "bbojjak", "match": { "channel": "telegram", "accountId": "bbojjak" }}
```

⚠️ **모든 바인딩 `type: "route"`**. `peer` 필드 빼고 `accountId`만 매칭하는 게 기본형 (뽀피터스 실제 스택).

한 에이전트가 여러 account 받기(뽀야가 default/dajidongsan/hbscom 전부): 바인딩만 3줄 추가하면 됨. 같은 cwd/페르소나로 처리.

### bindings가 페르소나 격리의 열쇠

이 route 바인딩이 실제로 하는 일을 풀어쓰면:

```
슬랙 메시지 수신 (accountId 자동 인식)
  → bindings에서 accountId → agentId 매핑
  → agents.list에서 agentId → workspace 경로 조회
  → cli-backend가 그 workspace를 cwd로 Claude CLI spawn
  → OpenClaw가 그 cwd의 페르소나 파일(IDENTITY/SOUL/AGENTS/...) 자동 주입
  → 에이전트 답변
```

즉 bindings 한 줄 = accountId와 agentId 짝짓는 한 번의 스위치. 여기가 잘못 박히면 뽀짝이 아이콘에 뽀야가 답하는 사고 발생 (아래 "함정 2" 참조).

---

## STEP 4 · 뽀짝이 OAuth 로그인

```bash
cd /Users/dahtmad/.openclaw/workspace-bbojjak
CLAUDE_CONFIG_DIR=/Users/dahtmad/.openclaw/agents/bbojjak/agent claude /login
```

각 에이전트의 `auth-profiles.json`은 독립. 뽀야·뽀짝이가 각자 Claude Pro/Max 한도를 따로 쓸 수 있음 (계정 1개로 로그인해도 상관없고, 별도 계정으로 분리해도 됨).

### slack-thread-rehydrate hook — 뽀짝이에도 자동 적용

01에서 글로벌 `~/.claude/settings.json`에 설치한 hook은 **Claude CLI가 어떤 cwd에서 실행되든 공통으로 걸림**. 즉 뽀짝이 세션에도 자동 적용되며, 2마리째 추가하면서 hook을 새로 설치할 필요 없다.

그럼 뽀짝이 스레드에서 hook이 "뽀짝이 account"로 슬랙 히스토리를 긁어오는 건 어떻게 보장되나? — **account 자동 추론** 덕분:

```
뽀짝이 스레드 메시지 수신
  → cli-backend가 cwd=workspace-bbojjak로 Claude CLI spawn
  → UserPromptSubmit hook 발동 (글로벌)
  → hook이 cwd에서 "workspace-bbojjak" 패턴 추출 → candidate="bbojjak"
  → openclaw.json의 accounts.bbojjak 존재 확인 (STEP 3-2에서 추가함)
  → hook이 bbojjak 봇 토큰으로 conversations.replies 호출 → 뽀짝이 스레드 히스토리 주입
```

이 체인이 먹히려면 **`workspace-bbojjak` 폴더명과 `accounts.bbojjak` key가 정확히 일치**해야 한다 (01 STEP 4 account 자동 추론 규칙). STEP 3-2에서 이 규칙 지켰기 때문에 hook이 뽀야/뽀짝이 스레드를 각각의 account로 자동 분기 처리함.

→ 1마리 땐 `accounts.default`라 hook이 항상 `default`로 폴백 매칭 → 작동. 2마리부턴 account key 따로 쪼개야 hook이 각 봇 토큰으로 정확한 스레드 히스토리 가져옴.

---

## STEP 5 · 게이트웨이 재시작 + 양쪽 검증

```bash
launchctl kickstart -k gui/$(id -u)/ai.openclaw.gateway
sleep 7
```

슬랙에서 각각 멘션:
- 뽀야 채널: `@뽀야 ping`
- 뽀짝이 채널: `@뽀짝이 ping`

로그 확인:
```bash
tail -f /Users/dahtmad/.openclaw/logs/gateway.log | \
  grep -E "matchedBy|cli-backend.*live session"
```

기대:
```
[routing] match: matchedBy=binding.account agentId=bboya
[routing] match: matchedBy=binding.account agentId=bbojjak
[agent/cli-backend] claude live session start: activeSessions=2
```

`activeSessions=2`가 나오면 두 에이전트가 각자의 warm stdio session으로 돌고 있다는 뜻.

### hook 로그도 확인

양쪽에 스레드 답변 한 번씩 보낸 뒤:

```bash
tail -20 /tmp/slack-thread-rehydrate.log
```

기대 출력:
```
[HH:MM:SS] using account=default     ← 뽀야 스레드 (workspace-bboya)
[HH:MM:SS] using account=bbojjak     ← 뽀짝이 스레드 (workspace-bbojjak)
```

양쪽 다 `injecting additionalContext (N bytes)` 찍히면 hook이 각 봇 토큰으로 정확히 히스토리 가져오고 있다는 뜻. `empty context, skip`만 찍히면 STEP 3-2의 토큰·account key 확인 필요.

---

## 2마리 운영에서 새로 생기는 함정

### 함정 1: 페르소나 혼동 (뽀짝이가 뽀야 톤으로 답함)

**원인 후보 (확률 순)**:
1. 말투 규칙을 SOUL.md에만 두고 **AGENTS.md `## Red Lines`엔 안 박음** → post-compaction 재주입에서 희석 (STEP 2 뽀짝이 사례)
2. 글로벌 `~/.claude/CLAUDE.md`에 반말 규칙이 있어 두 워크스페이스 다 오염
3. bindings route가 잘못 박혀서 뽀짝이 accountId가 뽀야 agentId로 라우팅 (이건 아이콘부터 틀어짐 → 함정 2)

**해결**:
- 각 워크스페이스 AGENTS.md `## Red Lines`에 말투 박기 (01 가이드 원칙)
- 글로벌 CLAUDE.md 정리 or Red Lines에 "글로벌 X 규칙 무시" 명시
- bindings 로그로 `matchedBy=binding.account agentId=...` 확인

### 함정 2: 한쪽이 default fallback에 빨려들어감

**원인**: 새 에이전트 추가했는데 route 바인딩 안 박음 → accountId 매칭 실패 → default(뽀야)로 fallback → **뽀짝이 봇 아이콘인데 뽀야가 답함**.

**해결**: 신규 에이전트마다 route 바인딩 필수. 기존에 `type:"acp"`로 박혀있으면 `type:"route"`로 교체.

### 함정 3: 봇끼리 끝없이 대화

**원인**: 두 봇이 같은 채널에서 서로 멘션하면 무한 루프 가능.

**해결**:
- `groupChat.mentionPatterns`로 자기 이름 멘션에만 반응하게 설정
- 채널별 `allowBots: false`로 봇 메시지 무시 (봇 대화 불필요한 채널)
- 봇끼리 연속 대화 최대 3턴 룰 (페르소나 파일에 명시)

### 함정 4: subagent 위임 안 됨

**원인**: 뽀야가 뽀짝이에게 작업 위임하려는데 `allowAgents` 설정 안 함.

**해결**: `agents.list[bboya].subagents.allowAgents: ["bbojjak"]` 추가. 뽀야 세션 안에서 뽀짝이를 subagent로 호출 가능 (별도 세션, 별도 메시지 스레드).

---

## 체크리스트

- [ ] 2번째 Slack 앱 생성 + 별도 Bot/App Token
- [ ] `workspace-<id2>/` 디렉토리 + 페르소나 파일 6개 (말투는 AGENTS.md `## Red Lines`에, 01 가이드 원칙 그대로)
- [ ] `openclaw.json` agents.list에 추가 (default는 1명만)
- [ ] `openclaw.json` channels.slack.accounts에 신규 account (**key 이름 = `workspace-<id>` 폴더명과 동일하게** — hook 자동 추론을 위해)
- [ ] `openclaw.json` bindings route 추가 (기존 에이전트도 route로 유지)
- [ ] 신규 에이전트 OAuth 로그인
- [ ] 양쪽 멘션 검증 + 로그에 `activeSessions=2` + hook 로그에 `using account=<신규id>` 확인

---

## N마리로 확장

같은 패턴을 N번 반복하면 같은 머신에서 N마리까지 돌릴 수 있음. 제약:
- 슬랙 앱 N개 (무료 워크스페이스도 앱 개수 제한 없음)
- 토큰 N쌍
- 워크스페이스 디렉토리 N개
- route 바인딩 N줄
- **`default: true`는 여전히 1명만**

실질적 상한은 맥미니 메모리·CPU. 각 에이전트 warm stdio session이 claude CLI 프로세스 1개씩 유지하므로, 활성 에이전트 × ~500MB 정도 메모리 감안.

---

## 다음 단계

물리 머신을 여러 대로 분산하고 싶으면 → [03-multi-hosts.md](./03-multi-hosts.md)
