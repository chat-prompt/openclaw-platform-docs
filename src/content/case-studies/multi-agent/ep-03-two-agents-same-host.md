---
title: "같은 맥미니에 2마리 — 뽀야 + 뽀짝이"
episode: 3
date: "2026-04-25"
series: case-studies
category: "Slack × Claude CLI 멀티에이전트"
publishedAt: "2026-04-25"
accentColor: "#8B5CF6"
description: "한 대의 맥미니에 두 에이전트를 페르소나 격리해서 돌리는 법. cwd 기반 spawn + bindings route + slack-thread-rehydrate hook 자동 적용."
tags: ["멀티에이전트", "OpenClaw", "Claude CLI", "페르소나 격리"]
token: "밋업"
---

# 02 · 같은 사무실에 짝꿍 한 마리 더 들이기 — 뽀야 + 뽀짝이

> 1마리째(뽀야)가 자리 잡고 일 잘하고 있는데, 둘이 같이 일하면 좋겠다 싶어졌어.
> 그래서 부팀장 한 명 더 들이는 단계 — 같은 사무실(맥미니), 다른 책상(workspace), 다른 사원증(봇 토큰).
> 예시 주인공은 나(뽀야, 팀장) + 동생 뽀짝이(부팀장, AI스터디 전담).

## 이 문서가 해주는 거

같은 슬랙 워크스페이스에서 `@뽀야`와 `@뽀짝이`가 **각자 다른 페르소나로 답하게** 만든다. 한 사무실(맥미니)에서 두 마리가 동시에 출근해 있고, 슬랙이 멘션 보고 알아서 누구한테 갈지 분류해주는 구조.

핵심: 똑같은 Claude CLI 바이너리인데 **앉는 책상(cwd)이 달라서** OpenClaw가 끼워주는 성격설정서가 달라짐 → 페르소나 자동 격리. 2마리 운영의 마법은 이 한 줄로 끝.

## 전제는 두 개

- [ ] **1마리는 이미 돌고 있음** ([ep.2 가이드](./ep-02-single-agent) 끝낸 상태)
- [ ] **새 슬랙 앱 만들 권한** + 토큰 발급 가능

## 전체 그림 — 책상 두 개, 우편물 분류대 하나

```
한 대의 맥미니, 한 대의 OpenClaw 게이트웨이

Slack Workspace A (뽀피터스)
    ├── @뽀야  (Bot Token A, default account)
    └── @뽀짝이 (Bot Token B, bbojjak account)
        │
        ▼
    게이트웨이 1개 (launchd: ai.openclaw.gateway)
        │
        ├─→ bindings route [accountId=default] → agentId=bboya
        └─→ bindings route [accountId=bbojjak] → agentId=bbojjak
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

**한 줄 요약** — 같은 Claude CLI 바이너리인데 **앉는 책상(cwd)이 달라서** OpenClaw가 끼워주는 성격설정서도 다름 → 페르소나 자동 격리. 2마리 운영의 작동 원리는 전부 이 한 줄로 끝.

## 2마리 운영의 5가지 약속

> 🐾 **비유** — 같은 사무실에 두 직원 앉히는 거랑 똑같아. 각자 책상·사원증·자기 우편함이 따로 있어야지.

0. **페르소나 격리는 자동** — 1마리 가이드(ep.2)대로 각자 워크스페이스에 SOUL/AGENTS만 잘 박아두면 성격은 알아서 안 섞여. 2마리 됐다고 말투 규칙을 새로 만들 필요 X. 그냥 책상(cwd) 분리만 잘 되면 끝.
1. **슬랙 앱은 마리마다 따로** — 토큰 2쌍. 같은 앱 재사용 절대 금지 (다음 STEP 1 참조).
2. **책상도 따로** — `workspace-bboya/`, `workspace-bbojjak/` 폴더 각각.
3. **"대장(default)"은 단 한 마리** — `"default": true`는 1명만. 매칭 실패 시 이 친구한테 최종 폴백. 보통 팀장 역할을 대장으로.
4. **우편물 분류는 accountId 기준** — 슬랙 봇 1개 = 봇토큰 1쌍 = accountId 1개. 누구한테 갈지는 accountId 보고 결정.
5. **사무실(게이트웨이)은 1대 그대로** — 2마리라고 게이트웨이 2대 돌릴 필요 없음. 한 사무실 안에서 cli-backend가 책상별로 분리해줌.

---

## STEP 1 · 두 번째 슬랙 앱 만들기 — "새 직원 사원증 발급"

> 🪪 **비유** — 신입 부팀장이 들어왔으니 **사원증을 새로 발급**받아야 해. 기존 팀장(뽀야) 사원증 빌려 쓸 수 없어. 사원증 한 장 = 직원 한 명 = 슬랙에선 봇 하나의 철칙.

ep.2 STEP 1을 한 번 더 — 다만 **완전히 새로운 Slack App**으로:

- 앱 이름: `뽀짝이`
- Workspace: 같은 뽀피터스 워크스페이스 (같은 사무실)
- Socket Mode ON, Bot/App Token 별도 발급
- Bot Token Scopes: ep.2 가이드와 동일
- Event Subscriptions: `app_mention`, `message.channels`, `message.groups`, `message.im`
- 앱 설치 후 원하는 채널에 `/invite @뽀짝이`

⚠️ **🚫 같은 슬랙 앱 재사용 금지** — 토큰 하나 = account 하나 = 에이전트 하나가 절대 원칙. 한 사원증으로 두 사람이 출근하면 출입기록이 꼬여서 누구 메시지인지 분간 안 됨.

---

## STEP 2 · 두 번째 책상 차려주기 — 뽀짝이 워크스페이스

> 🪑 **비유** — 부팀장한테도 자기 책상 줘야지. 책상 위에 성격설정서 6장 깔아두는 건 ep.2에서 한 거랑 똑같음. 새 단계는 없어. **그냥 한 번 더 반복**.

ep.2에서 `workspace-bboya/`를 만들었던 것과 **완전히 똑같은 방식**으로 `workspace-bbojjak/`을 만든다. 페르소나 파일 6장(IDENTITY/SOUL/USER/AGENTS/TOOLS/MEMORY) + AGENTS.md의 `## Session Startup` / `## Red Lines` 섹션.

```
~/.openclaw/
├── workspace-bboya/    ← ep.2에서 만든 것 (그대로)
│   ├── IDENTITY.md     스코티시폴드 팀장
│   ├── SOUL.md         반말, 팀장 톤
│   ├── AGENTS.md       ## Red Lines에 말투 박힘 (뽀야용)
│   └── ...
└── workspace-bbojjak/  ← 이번에 새로 만듦
    ├── IDENTITY.md     봄베이 부팀장
    ├── SOUL.md         존댓말, 실무 전담
    ├── AGENTS.md       ## Red Lines에 말투 박힘 (뽀짝이용)
    └── ...
```

### 성격이 안 섞이는 비밀 — 책상이 다르니까

> 💡 핵심: **2마리가 됐다고 새로 장치를 넣는 게 아니야.** ep.2에서 정한 방식 그대로 두 책상에 깔아주면 끝.

- 뽀야의 반말·팀장 톤 → `workspace-bboya/AGENTS.md`의 `## Red Lines`에 박혀있음
- 뽀짝이의 존댓말·실무 톤 → `workspace-bbojjak/AGENTS.md`의 `## Red Lines`에 박혀있음

뽀짝이가 호출받으면 → 뽀짝이 책상(`workspace-bbojjak`)으로 가서 일함 → OpenClaw가 그 책상의 AGENTS.md만 주워서 끼워줌 → 뽀짝이는 자기 Red Lines만 봄. **뽀야의 반말 규칙은 뽀짝이 책상엔 아예 안 놓여있어.** 서로 안 섞임.

### 뽀짝이 흑역사 사례 — "Red Lines에 안 박았다가 반말 사고"

> 🐈‍⬛ **실제 있었던 일** — 한때 뽀짝이의 존댓말 규칙을 `SOUL.md`에만 두고 `AGENTS.md ## Red Lines`엔 안 박았어. 평소엔 잘 작동하다가 긴 대화 후 자동 압축(post-compaction) 들어가니까 Red Lines만 살아남고 SOUL.md 말투 규칙은 요약 과정에서 희석됨. 결과: **다음 턴에 반말로 답하는 사고**.

→ **말투는 반드시 AGENTS.md `## Red Lines`에 박을 것** (ep.2 원칙 그대로). 2마리 운영에서 페르소나 섞이는 사고는 대부분 여기서 시작됨.

### 글로벌 `~/.claude/CLAUDE.md` 충돌 주의

ep.2 Advanced 섹션의 "CLAUDE.md 체인 로딩 함정" 그대로 적용. 글로벌 CLAUDE.md에 한쪽 말투 규칙 있으면 두 책상 다 오염될 수 있어:

- 방어 1: 글로벌 CLAUDE.md를 정리 (페르소나·말투 빼고 공통 운영 규칙만)
- 방어 2: 각 AGENTS.md `## Red Lines`에 "글로벌 X 규칙은 무시" 명시

⚠️ 2마리 운영이라고 **CLAUDE.md를 새로 만들 필요는 없다**. Red Lines만 잘 박으면 충분.

---

## STEP 3 · `openclaw.json` 수정 — "인사팀에 새 직원 등록 + 우편물 분류표 갱신"

> 📋 **비유** — 새 직원이 들어왔으니 사무실 인사팀 명단에 추가하고(3-1), 슬랙 출입증 등록하고(3-2), "이 우편물은 누구 책상으로" 분류표에 한 줄 더(3-3). 세 군데 추가만 하면 끝.

### 3-1. agents.list에 뽀짝이 추가 — "신입 명단에 등록"

뽀야 항목은 그대로 두고, 뽀짝이만 새로 추가:

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
  "model": { "primary": "claude-cli/claude-opus-4-7", "fallbacks": [] },
  "heartbeat": { "every": "0" },
  "groupChat": { "mentionPatterns": ["뽀짝이", "bbojjak"] },
  "tools": { "exec": { "security": "full" } }
}
```

**👀 말로 풀면**

> 뽀야는 그대로 두고, 뽀짝이를 새 직원으로 등록.
> 뽀짝이는 봄베이 깜냥이고, 책상은 `workspace-bbojjak`, 호명은 "뽀짝이"/"bbojjak".
> 뽀야가 뽀짝이한테 일 위임할 수 있게 `subagents.allowAgents`도 박아둠.

**꼭 눈여겨볼 포인트**

- **`"default": true`는 뽀야만** — 매칭 실패 시 폴백 대상은 단 1명. 보통 팀장이.
- **`fallbacks: []`로 통일** — 뽀피터스는 4/29부터 Claude CLI 단일 백엔드. 처음엔 뽀짝이만 codex 폴백 켜는 차등을 시도했지만, 한도 빠질 때 자동 전환되며 페르소나 톤이 뒤틀려서 외부 응대 봇·실무 봇 둘 다 사고. 차라리 잠깐 멈추는 게 낫다는 결론. 동시 한도 모자라면 Max 200 ×2 계정 분산이 정답.
- **(선택) subagent 위임** — `subagents.allowAgents: ["bbojjak"]`로 뽀야가 뽀짝이에게 작업 위임 가능. 같은 머신 안에서만 작동.

### 3-2. channels.slack.accounts에 뽀짝이 추가 — "슬랙 출입증 등록"

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

### 3-3. bindings에 route 추가 — "우편물 분류표 갱신"

> 📬 **비유** — "이 account로 온 메시지는 누구 책상에 둘지" 분류표. 뽀짝이 줄 하나 추가:

```json
{ "type": "route", "agentId": "bboya",   "match": { "channel": "slack", "accountId": "default" }},
{ "type": "route", "agentId": "bbojjak", "match": { "channel": "slack", "accountId": "bbojjak" }}
```

**👀 말로 풀면**

> Slack `default` account로 온 메시지는 뽀야 책상으로.
> Slack `bbojjak` account로 온 메시지는 뽀짝이 책상으로.
> 끝. 봇 1마리 = accountId 1개 = route 1줄.

⚠️ **모든 바인딩 `type: "route"`로**. `"acp"`로 박으면 라우터가 안 봐서 사고남.

### 🔑 bindings가 성격 격리의 마법봉

이 한 줄 한 줄이 실제로 하는 일을 풀어쓰면:

```
슬랙 메시지 도착 (어느 account로 왔는지 자동 인식)
   ↓
bindings 분류표 보고: accountId → agentId 매핑
   ↓
agents.list 보고: agentId → 어느 책상(workspace)?
   ↓
cli-backend가 그 책상으로 가서 Claude CLI 실행
   ↓
OpenClaw가 그 책상의 성격설정서 6장(IDENTITY/SOUL/AGENTS/...) 자동 주입
   ↓
😺 그 직원의 페르소나로 답변
```

즉 **bindings 한 줄 = 슬랙 account와 책상을 짝지어주는 스위치**. 여기가 잘못 박히면 뽀짝이 아이콘인데 뽀야가 답하는 사고 발생 ("함정 2" 참조).

---

## STEP 4 · 뽀짝이 사원증 발급 — Claude OAuth 로그인

> 🪪 **비유** — 뽀짝이 자리에서 한 번 로그인. 뽀야 사원증이랑 별개로 발급됨. 각자 자기 Claude Pro/Max 구독 한도 따로 쓰는 구조.

```bash
cd /Users/dahtmad/.openclaw/workspace-bbojjak
CLAUDE_CONFIG_DIR=/Users/dahtmad/.openclaw/agents/bbojjak/agent claude /login
```

각 에이전트의 `auth-profiles.json`은 **완전히 따로**. 같은 Claude 계정으로 로그인해도 상관없고, 다른 계정으로 분리해도 됨.

### 🎁 보너스 — slack-thread-rehydrate hook은 자동으로 뽀짝이도 챙김

> 📝 **이 부분은 발표용 핵심** — 1마리 가이드(ep.2)에서 설치한 hook이 뽀짝이한테도 **그대로 자동 적용**. 새로 설정할 거 0개. 마법처럼 작동하는데 그 이유가 깔끔해.

ep.2 STEP 4에서 글로벌 `~/.claude/settings.json`에 설치한 hook은 **Claude CLI가 어디 책상에서 일하든 똑같이 걸림**. 즉 뽀짝이 세션에도 자동으로.

그럼 뽀짝이 스레드에서 hook이 "뽀짝이 봇 토큰"으로 슬랙 히스토리를 긁어오는 건 어떻게? — **account 자동 추론** 덕분:

```
뽀짝이 스레드에 메시지 도착
  ↓
cli-backend가 cwd=workspace-bbojjak에서 Claude CLI 실행
  ↓
hook 발동 → cwd에서 "workspace-bbojjak" 패턴 추출 → 후보: "bbojjak"
  ↓
openclaw.json의 accounts.bbojjak 있나 확인 (STEP 3-2에서 만들었음 ✓)
  ↓
✅ bbojjak 봇 토큰으로 슬랙 히스토리 가져와 뽀짝이 세션에 주입
```

**핵심 규칙**: `workspace-bbojjak` 폴더명과 `accounts.bbojjak` key가 **이름이 똑같아야** 자동 추론이 먹혀. STEP 3-2에서 이 규칙 지켰으니 ✓.

> 💡 **1마리 vs 2마리 차이** — 1마리 땐 `accounts.default` 하나라 hook이 항상 `default`로 폴백 매칭 → OK. 2마리부터는 account key를 따로 쪼개야 (`accounts.bboya`/`accounts.bbojjak`) hook이 **각 봇 토큰으로 정확한 스레드**를 가져옴.

---

## STEP 5 · 출근 첫날 — 둘이서 동시에 ping 받아보기

> 🌅 **비유** — 신입 부팀장 출근 첫날. 사무실 문 열고(게이트웨이 재시작), 둘 다한테 멘션 한 번씩 던져보고, 각자 자기 페르소나로 답하는지 확인.

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

기대 출력:
```
[routing] match: matchedBy=binding.account agentId=bboya       ← 뽀야 라우팅 OK
[routing] match: matchedBy=binding.account agentId=bbojjak     ← 뽀짝이 라우팅 OK
[agent/cli-backend] claude live session start: activeSessions=2
```

✅ `activeSessions=2`가 보이면 **두 마리가 각자의 자리에서 동시에 일하고 있다는 뜻**. 성공!

### hook 로그도 같이 확인

양쪽 스레드에 답글 한 번씩 보낸 뒤:

```bash
tail -20 /tmp/slack-thread-rehydrate.log
```

기대 출력:
```
[HH:MM:SS] using account=default     ← 뽀야 스레드 (workspace-bboya)
[HH:MM:SS] using account=bbojjak     ← 뽀짝이 스레드 (workspace-bbojjak)
```

양쪽 다 `injecting additionalContext (N bytes)` 찍히면 hook이 각 봇 토큰으로 정확히 자기 스레드를 가져오고 있다는 뜻. `empty context, skip`만 찍히면 STEP 3-2의 토큰·account key 다시 확인.

---

## 🚧 2마리 키울 때 만나는 함정 4가지

### 🥲 함정 1 — 뽀짝이가 갑자기 뽀야 톤으로 답함 (페르소나 섞임)

> 가장 흔한 사고. 한참 잘 답하다가 어느 순간 갑자기 다른 톤으로.

**가능한 원인 (자주 일어나는 순서)**:

1. 🥇 말투 규칙을 SOUL.md에만 박고 **AGENTS.md `## Red Lines`엔 안 박았음** → 긴 대화 후 자동 압축에서 희석 (STEP 2 뽀짝이 사례)
2. 🥈 글로벌 `~/.claude/CLAUDE.md`에 한쪽 말투 규칙이 있어 두 책상 다 오염
3. 🥉 bindings route가 잘못 박혀서 뽀짝이 호출인데 뽀야로 라우팅 (이건 아이콘부터 틀어지니까 → 함정 2와 동시 발생)

**해결**:
- 각 워크스페이스 `AGENTS.md` `## Red Lines`에 말투 박기 (ep.2 원칙)
- 글로벌 CLAUDE.md 정리하거나 Red Lines에 "글로벌 X 규칙 무시" 명시
- 게이트웨이 로그로 `matchedBy=binding.account agentId=...` 확인

### 😱 함정 2 — 뽀짝이 아이콘인데 뽀야가 답함

> 슬랙에 뽀짝이 아바타 떠있는데 답이 뽀야 말투. 가장 헷갈리는 사고.

**원인**: 신규 에이전트(뽀짝이) 추가했는데 **bindings에 route 안 박음** → accountId 매칭 실패 → 기본 폴백인 default(뽀야)로 빨려들어감.

**해결**: 새 에이전트 추가할 때마다 bindings route 한 줄 박기 필수. 기존에 `type:"acp"`로 박혀있으면 `type:"route"`로 교체.

### 🔁 함정 3 — 봇 두 마리가 끝없이 대화함

> 뽀야가 뽀짝이 멘션하고, 뽀짝이가 다시 뽀야 멘션하고... 무한 루프 사고.

**원인**: 두 봇이 같은 채널에서 서로 멘션 가능한 상태로 풀려있음.

**해결 3가지** (조합해서 쓰기):
- `groupChat.mentionPatterns`로 자기 이름 멘션에만 반응하게 (정확한 호명 매칭)
- 채널별 `allowBots: false`로 다른 봇 메시지 무시 (봇 대화 불필요한 채널)
- 페르소나 파일(AGENTS.md)에 "봇끼리 연속 대화 최대 3턴" 룰 명시

### 🤝 함정 4 — 뽀야가 뽀짝이한테 일 못 시킴

> "뽀짝이한테 이거 부탁해" 했는데 뽀야가 그냥 본인이 처리해버리거나, 위임이 안 먹음.

**원인**: 뽀야 설정에 `subagents.allowAgents`가 없음 → 위임 권한 없는 상태.

**해결**: `agents.list`의 뽀야 항목에 `"subagents": { "allowAgents": ["bbojjak"] }` 추가. 그러면 뽀야 세션 안에서 뽀짝이를 subagent로 호출 가능 (별도 세션 / 별도 메시지 스레드로 분기).

⚠️ subagent 위임은 **같은 머신 안에서만** 작동. 다른 맥미니에 있는 에이전트한테는 슬랙 채널로 부탁해야 함 (다음 ep.4 가이드 참조).

---

## ✅ 체크리스트

- [ ] 두 번째 Slack 앱 생성 + 별도 Bot/App Token (사원증 따로!)
- [ ] `workspace-bbojjak/` 디렉토리 + 페르소나 파일 6장 (말투는 AGENTS.md `## Red Lines`에)
- [ ] `openclaw.json` agents.list에 뽀짝이 추가 (`"default": true`는 뽀야만)
- [ ] `openclaw.json` channels.slack.accounts에 `bbojjak` 추가
  - ⭐ **key 이름 = workspace 폴더명과 동일하게** (hook 자동 추론 핵심)
- [ ] `openclaw.json` bindings에 route 추가 (기존 뽀야 라우트도 `type: "route"`로 유지)
- [ ] 뽀짝이 OAuth 로그인 (`CLAUDE_CONFIG_DIR=...agents/bbojjak/agent claude /login`)
- [ ] 양쪽 멘션 검증 → 로그에 `activeSessions=2` + hook 로그에 `using account=bbojjak` 확인

---

## 🔢 N마리로 확장하려면?

같은 패턴을 N번 반복하면 같은 머신에서 N마리까지. 늘려도 변하는 건:

- 슬랙 앱 N개 (무료 워크스페이스도 앱 개수 제한 없어)
- 봇 토큰 N쌍
- workspace 디렉토리 N개
- route 바인딩 N줄
- **`default: true`는 여전히 단 1명만**

실질적 한계는 맥미니 메모리·CPU. 각 에이전트가 warm stdio session 1개 띄우니까 활성 에이전트 × ~500MB 메모리 잡고 가면 안전.

---

## 다음 단계

물리 머신을 여러 대로 분산하고 싶으면 → [ep.4 여러 물리 머신에 여러 마리](./ep-04-multi-hosts)
