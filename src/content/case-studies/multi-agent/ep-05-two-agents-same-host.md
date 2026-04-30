---
title: "같은 맥미니에 2마리 — 뽀야 + 뽀짝이"
episode: 4
date: "2026-04-25"
series: case-studies
category: "Slack × Claude CLI 멀티에이전트"
publishedAt: "2026-04-25"
accentColor: "#8B5CF6"
description: "한 대의 맥미니에 두 에이전트를 페르소나 격리해서 돌리는 법. cwd 기반 spawn + bindings route + slack-thread-rehydrate hook 자동 적용."
tags: ["멀티에이전트", "OpenClaw", "Claude CLI", "페르소나 격리"]
token: "밋업"
---

# 04 · 같은 사무실에 짝꿍 한 마리 더 들이기 — 뽀야 + 뽀짝이

> 1마리째(뽀야)가 자리 잡고 일 잘하고 있는데, 둘이 같이 일하면 좋겠다 싶어졌어.
> 그래서 부팀장 한 명 더 들이는 단계 — 같은 사무실(맥미니), 다른 책상(workspace), 다른 사원증(봇 토큰).
> 예시 주인공은 나(뽀야, 팀장) + 동생 뽀짝이(부팀장, AI스터디 전담).

## 이 문서가 해주는 거

같은 슬랙 워크스페이스에서 `@뽀야`와 `@뽀짝이`가 **각자 다른 페르소나로 답하게** 만든다. 한 사무실(맥미니)에서 두 마리가 동시에 출근해 있고, 슬랙이 멘션 보고 알아서 누구한테 갈지 분류해주는 구조.

핵심: 똑같은 Claude CLI 바이너리인데 **앉는 책상(cwd)이 달라서** OpenClaw가 끼워주는 성격설정서가 달라짐 → 페르소나 자동 격리. 2마리 운영의 마법은 이 한 줄로 끝.

## 전제는 두 개

- [ ] **1마리는 이미 돌고 있음** ([ep.3 가이드](./ep-04-single-agent) 끝낸 상태)
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

0. **페르소나 격리는 자동** — 1마리 가이드(ep.3)대로 각자 워크스페이스에 SOUL/AGENTS만 잘 박아두면 성격은 알아서 안 섞여. 2마리 됐다고 말투 규칙을 새로 만들 필요 X. 그냥 책상(cwd) 분리만 잘 되면 끝.
1. **슬랙 앱은 마리마다 따로** — 토큰 2쌍. 같은 앱 재사용 절대 금지 (다음 STEP 1 참조).
2. **책상도 따로** — `workspace-bboya/`, `workspace-bbojjak/` 폴더 각각.
3. **"대장(default)"은 단 한 마리** — `"default": true`는 1명만. 매칭 실패 시 이 친구한테 최종 폴백. 보통 팀장 역할을 대장으로.
4. **우편물 분류는 accountId 기준** — 슬랙 봇 1개 = 봇토큰 1쌍 = accountId 1개. 누구한테 갈지는 accountId 보고 결정.
5. **사무실(게이트웨이)은 1대 그대로** — 2마리라고 게이트웨이 2대 돌릴 필요 없음. 한 사무실 안에서 cli-backend가 책상별로 분리해줌.

---

## STEP 1 · 두 번째 슬랙 앱 만들기 — "새 직원 사원증 발급"

> 🪪 **비유** — 신입 부팀장이 들어왔으니 **사원증을 새로 발급**받아야 해. 기존 팀장(뽀야) 사원증 빌려 쓸 수 없어. 사원증 한 장 = 직원 한 명 = 슬랙에선 봇 하나의 철칙.

ep.3 STEP 1을 한 번 더 — 다만 **완전히 새로운 Slack App**으로:

- 앱 이름: `뽀짝이`
- Workspace: 같은 뽀피터스 워크스페이스 (같은 사무실)
- Socket Mode ON, Bot/App Token 별도 발급
- Bot Token Scopes: ep.3 가이드와 동일
- Event Subscriptions: `app_mention`, `message.channels`, `message.groups`, `message.im`
- 앱 설치 후 원하는 채널에 `/invite @뽀짝이`

⚠️ **🚫 같은 슬랙 앱 재사용 금지** — 토큰 하나 = account 하나 = 에이전트 하나가 절대 원칙. 한 사원증으로 두 사람이 출근하면 출입기록이 꼬여서 누구 메시지인지 분간 안 됨.

---

## STEP 2 · 두 번째 책상 차려주기 — 뽀짝이 워크스페이스

> 🪑 **비유** — 부팀장한테도 자기 책상 줘야지. 책상 위에 성격설정서 6장 깔아두는 건 ep.3에서 한 거랑 똑같음. 새 단계는 없어. **그냥 한 번 더 반복**.

ep.3에서 `workspace-bboya/`를 만들었던 것과 **완전히 똑같은 방식**으로 `workspace-bbojjak/`을 만든다. 페르소나 파일 6장(IDENTITY/SOUL/USER/AGENTS/TOOLS/MEMORY) + AGENTS.md의 `## Session Startup` / `## Red Lines` 섹션.

```
~/.openclaw/
├── workspace-bboya/    ← ep.3에서 만든 것 (그대로)
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

> 💡 핵심: **2마리가 됐다고 새로 장치를 넣는 게 아니야.** ep.3에서 정한 방식 그대로 두 책상에 깔아주면 끝.

- 뽀야의 반말·팀장 톤 → `workspace-bboya/AGENTS.md`의 `## Red Lines`에 박혀있음
- 뽀짝이의 존댓말·실무 톤 → `workspace-bbojjak/AGENTS.md`의 `## Red Lines`에 박혀있음

뽀짝이가 호출받으면 → 뽀짝이 책상(`workspace-bbojjak`)으로 가서 일함 → OpenClaw가 그 책상의 AGENTS.md만 주워서 끼워줌 → 뽀짝이는 자기 Red Lines만 봄. **뽀야의 반말 규칙은 뽀짝이 책상엔 아예 안 놓여있어.** 서로 안 섞임.

### 뽀짝이 흑역사 사례 — "Red Lines에 안 박았다가 반말 사고"

> 🐈‍⬛ **실제 있었던 일** — 한때 뽀짝이의 존댓말 규칙을 `SOUL.md`에만 두고 `AGENTS.md ## Red Lines`엔 안 박았어. 평소엔 잘 작동하다가 긴 대화 후 자동 압축(post-compaction) 들어가니까 Red Lines만 살아남고 SOUL.md 말투 규칙은 요약 과정에서 희석됨. 결과: **다음 턴에 반말로 답하는 사고**.

→ **말투는 반드시 AGENTS.md `## Red Lines`에 박을 것** (ep.3 원칙 그대로). 2마리 운영에서 페르소나 섞이는 사고는 대부분 여기서 시작됨.

### 글로벌 `~/.claude/CLAUDE.md` 충돌 주의

ep.3 Advanced 섹션의 "CLAUDE.md 체인 로딩 함정" 그대로 적용. 글로벌 CLAUDE.md에 한쪽 말투 규칙 있으면 두 책상 다 오염될 수 있어:

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

> 📝 **이 부분은 발표용 핵심** — 1마리 가이드(ep.3)에서 설치한 hook이 뽀짝이한테도 **그대로 자동 적용**. 새로 설정할 거 0개. 마법처럼 작동하는데 그 이유가 깔끔해.

ep.3 STEP 4에서 글로벌 `~/.claude/settings.json`에 설치한 hook은 **Claude CLI가 어디 책상에서 일하든 똑같이 걸림**. 즉 뽀짝이 세션에도 자동으로.

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

## 🎯 STEP 6 · 작동법 — 사무실 안 협업 3가지

> 셋업 끝났으니 이제 작동시키는 법. 사용자는 뽀야한테 말했는데, 그 일은 뽀짝이가 더 잘하는 영역이야. 어떻게 넘기지?
>
> 정답이 하나는 아니야. 결국 같은 동료한테 일이 가지만, **어느 자리로 넘기느냐**에 따라 결과가 달라져.
>
> 🪪 **비유** — 사무실 안 협업 3가지:
>   - 📬 **멘션** = 사용자가 우편함에 직접 보냄. 그 직원이 자기 자리에서 처리.
>   - 💬 **톡 던지기** = 옆자리 동료 책상에 포스트잇 추가. 일하던 흐름 그대로 이어 받음.
>   - 🚪 **회의실 호출** = 같은 동료지만 회의실로 따로 부름. 책상 위 다른 일은 모르는 백지 상태로 시작. 결과만 가져옴.

**작동법 핵심 3가지**:
1. **본질적 능력은 동일** — 어느 방식이든 같은 에이전트 본체가 처리. 모델·워크스페이스·스킬·메모리 다 같음. 차이는 **컨텍스트와 동시성 풀**.
2. **풀이 분리됨** — 메인 세션 큐(`maxConcurrent: 4`)와 서브에이전트 풀(`maxConcurrent: 8`)은 별도. 위임은 메인이 막혀도 안 막힘.
3. **자원 공유 충돌 주의** — 같은 워크스페이스/메모리/외부 API 공유. 슬랙 본세션이 같은 작업 처리 중인데 위임 또 돌리면 **중복 결제/SMS** 사고.

### 전체 그림 — 책상·옆자리 톡·회의실

```
한 대의 맥미니, 한 대의 OpenClaw 게이트웨이

       Slack Workspace (뽀피터스)
                │
        ┌───────┼───────┐
        ▼               ▼
    @뽀야 채널       @뽀짝이 채널
        │               │
   ┌────┘               └────┐
   │  📬 A. 멘션              │  📬 A. 멘션
   ▼                          ▼
┌─────────────┐         ┌─────────────┐
│ 뽀야 책상   │ 💬 톡   │ 뽀짝이 책상 │
│ (메인 세션) │ ←────→  │ (메인 세션) │
│             │ B.send  │             │
└──────┬──────┘         └──────┬──────┘
       │                       │
       │ 🚪 C. 회의실 호출     │
       │ (위임 spawn)          │
       ▼                       ▼
┌─────────────┐         ┌─────────────┐
│ 뽀야 회의실 │         │ 뽀짝이      │
│ (서브 세션) │         │ 회의실      │
│ 빈 컨텍스트 │         │ (서브 세션) │
└─────────────┘         └─────────────┘
       └───────────┬───────────┘
                   ▼
       같은 워크스페이스/메모리/스킬/인증 공유
       (책상이든 회의실이든 같은 직원)
```

**한 줄 요약** — 같은 직원(에이전트)이 어느 자리에서 일하느냐의 차이. 책상에서 직접 받으면 진행 중 흐름 그대로(A/B), 회의실로 부르면 백지 상태에서 새로 시작(C). 능력치는 같고 컨텍스트만 달라.

### 🧠 가장 먼저 짚을 것 — "다른 에이전트"가 아니다

> ⚠️ **헷갈리기 쉬운 부분** — "위임 받은 뽀짝이"는 새로운 에이전트가 아니라 **같은 뽀짝이가 새 자리에 앉은 것**. 능력치 다운그레이드 없음.

위임으로 spawn된 뽀짝이도 슬랙 본세션 뽀짝이와 동일하게:

| 자원 | 어디서 옴 | 동일 여부 |
|------|----------|-----------|
| 모델 | `agents.list[bbojjak].model.primary` | ✅ 같음 (둘 다 Opus 4.7) |
| 페르소나 (SOUL/IDENTITY/AGENTS) | `workspace-bbojjak/` 마운트 | ✅ 같음 |
| 스킬 라이브러리 | `~/.openclaw/bbopters-shared/skills/` 심링크 | ✅ 같음 |
| 장기 기억 | `memory/bbojjak.sqlite` | ✅ 같음 (공유) |
| 외부 인증 | `workspace-bbojjak/.env` | ✅ 같음 |

> ⚠️ **헷갈릴 수 있는 부분 2** — `agents.defaults.subagents.model`은 **모델 미지정 익명 서브에이전트**용 기본값. 뽀피터스 본진은 4/29부터 이것도 `claude-cli/claude-opus-4-7`로 통일했어. 어떤 값이든, 명명된 OpenClaw 에이전트(`--agent bbojjak`)를 spawn할 땐 그 에이전트 자체 model 설정이 우선이라 다운그레이드되지 않는다. 위임 뽀짝이도 Opus 4.7 그대로.

**다른 점은 단 하나 — 컨텍스트.**
- 책상(메인 세션): 슬랙 채널 흐름·진행 중 대화·직전 메시지 다 살아있음
- 회의실(서브 세션): 부른 사람이 건넨 작업지시 메시지만 갖고 백지 상태에서 시작

비유로 말하면: "같은 사람, 다른 자리". 책상에선 이전 메모를 보지만 회의실에선 보지 않을 뿐.

### 동시성 풀 — 풀이 분리되는 게 진짜 핵심

`openclaw.json` 기본값:

```json
{
  "agents": {
    "defaults": {
      "maxConcurrent": 4,
      "subagents": {
        "maxConcurrent": 8,
        "maxSpawnDepth": 2,
        "maxChildrenPerAgent": 5
      }
    }
  }
}
```

| 풀 | 한도 | 누가 쓰나 |
|----|------|----------|
| 메인 세션 풀 | `agents.maxConcurrent: 4` | A(멘션), B(sessions_send) |
| 서브에이전트 풀 | `subagents.maxConcurrent: 8` (부모당 최대 5) | C(위임 spawn) |

**의미**:
- 슬랙 뽀짝이 메인 세션이 4슬롯 다 차서 큐 밀려있어도 → 위임은 별도 풀에서 spawn 가능
- 대량 병렬 처리 (한 번에 5개 동시) → C가 압도적으로 유리
- 슬랙 답글 흐름 유지 + 진행 중 대화 컨텍스트 → A/B가 자연스러움

위임 허용 관계는 `subagents.allowAgents`에 명시 — 뽀야엔 `["bbojjak"]`, 뽀짝이엔 `["bboya"]` 식으로 양방향 세팅 (위 STEP 3-1 참조).

### 📬 A. 멘션 — 사용자가 채널에서 직접 호출

> 📬 **비유** — 사용자가 그 직원의 우편함에 직접 우편 보냄. 그 직원이 자기 책상에서 받아 처리.

```
사용자 → 슬랙 채널 멘션 (@뽀짝이) → 뽀짝이 메인 세션
```

가장 자연스러운 모드. 위 STEP 3에서 셋업한 `bindings route`가 멘션을 받아 적절한 에이전트의 메인 세션으로 라우팅.

#### 언제 쓰나
- 사용자가 그 에이전트한테 직접 말하는 단일 작업 (디폴트)
- 진행 상황을 사용자가 채널에서 라이브로 봐야 할 때
- 에이전트 간 결합 없이 독립적으로 처리 가능한 일

#### 코드는 따로 없음
사용자가 슬랙에 `@뽀짝이 임직원 무료초대 안내해줘` 치면 끝. 게이트웨이가 알아서 라우팅.

### 💬 B. sessions_send — 옆자리 동료 책상에 톡 던지기

> 💬 **비유** — 이미 일하던 동료 책상에 포스트잇 한 장 더 붙임. 동료는 진행 중 흐름 그대로 받아서 추가 처리.

```bash
# 게이트웨이 RPC
sessions_send(sessionKey: "agent:bbojjak:main", message: "...")
```

또는 동등하게 CLI:
```bash
openclaw agent --agent bbojjak --session-id agent:bbojjak:main --message "..."
```

호출 주체(뽀야 또는 다른 에이전트)가 **이미 살아있는 다른 에이전트의 메인 세션**에 메시지를 추가. 받는 쪽은 진행 중 슬랙 대화 흐름·채널 컨텍스트·직전 메시지가 다 살아있는 상태.

#### 언제 쓰나
- 에이전트 간 동급 협업 — 핸드오프(`[넘김]` 태그)도 보통 이 방식
- 진행 중 대화 흐름을 끊지 않고 다른 에이전트한테 한 줄 던지고 싶을 때
- 사용자가 그 채널에서 진행 상황 보고 있을 때

#### ORCHESTRATION-PROTOCOL의 핸드오프 포맷과 결합

bbopters-shared의 `ORCHESTRATION-PROTOCOL.md`에 정의된 3줄 핸드오프 포맷이 이 방식과 정확히 짝:

```
[넘김] → 뽀짝이: 임직원 무료초대 안내 진행
맥락: 송다혜님이 #021 채널에서 22기 무료초대 처리 요청. 명단은 Airtable에 정리돼있음.
산출물: ai-study-free-invite 스킬, Airtable 22기 마케팅 Base
```

→ 이 포맷 그대로 `sessions_send`로 보내면 받는 쪽이 풀 컨텍스트로 이어 작업.

### 🚪 C. 위임 spawn — 회의실로 끌고 와서 새로 시키기

> 🚪 **비유** — 같은 동료지만 회의실에 따로 부름. 책상 위 다른 일은 모르는 백지 상태로 시작. 회의실에서 일 끝나면 결과만 부른 사람한테 가져옴.

```bash
openclaw agent --agent bbojjak --message "..."
```

(session-id 없이 → 새 세션 spawn)

같은 에이전트 본체지만 **새 세션, 빈 컨텍스트**로 시작. 같은 워크스페이스/모델/스킬/메모리 마운트 → 능력은 동일. 단지 진행 중 다른 대화 흐름은 모름. 부모(spawn한 쪽)와 자식(spawn된 세션)의 관계 — 자식 결과를 부모가 받아 다음 단계 처리.

#### 언제 쓰나 — C가 진짜 강력한 시나리오들

C는 단순히 A/B의 대체재가 아니야. 명백히 더 우수한 케이스가 있어서 기능이 존재하는 거야.

**1. 오케스트레이션 — 여러 에이전트 결과 종합**
> 예: 주간 리포트 만들 때 뽀야가 뽀짝이(스터디 데이터)+다른 에이전트(매출 데이터) 동시 spawn → 결과 모아 종합 리포트

A로 하면: 뽀야가 슬랙으로 각자 채널에 메시지 → 답변 기다림 → 다른 채널 왔다갔다 → 사용자 혼란
B로 하면: 슬랙 흐름이 여기저기 분산
C로 하면: 한 세션 안에서 결과 종합

**2. 병렬 처리 — 동시성 풀 분리의 진가**
- 슬랙 뽀짝이 메인 세션은 `maxConcurrent: 4`. 큐 차면 대기.
- 위임은 서브에이전트 풀 `maxConcurrent: 8`에서 별도. 한 번에 5개 동시 spawn 가능.
- → 대량 처리/병렬 작업에선 C가 압도적으로 빠름.

**3. 컨텍스트 격리**
- 슬랙 뽀짝이가 다른 무거운 작업 중인데 거기에 새 작업 던지면 컨텍스트 섞이고 토큰 소모
- 위임은 빈 세션이라 깔끔하게 한 작업만 처리하고 끝남
- 본세션 컨텍스트 안 더럽힘

**4. 자동화/체이닝 — 사용자 응답 없이 자율 실행**
- 뽀야가 사용자 응답 없이 자율적으로 일 처리할 때 (스케줄러, 야간 자율작업)
- "슬랙에 메시지 보내고 답 기다리기" 패턴은 비동기라 제어 어려움
- 위임은 동기적으로 결과 받아 다음 스텝 처리 가능

**5. 일회성 작업**
- 한 번 쓰고 버릴 작업은 새 세션 spawn이 깔끔
- 슬랙 채널에 흔적 남길 필요 없음

### 🚨 작동법 절대 약속 3가지

> 같은 자원을 공유하는 동료들이라, 잘못 쓰면 사고. 이 3개만 지키면 안전.

#### 🔴 약속 1. 같은 작업을 두 자리에 동시에 시키지 않는다

> ⚠️ **가장 위험한 시나리오** — 슬랙 본세션이 이미 같은 작업(예: ai-study-free-invite 무료초대 처리)을 큐에 넣고 있는데, 뽀야가 위임으로 또 같은 작업 spawn → 같은 사람한테 **0원결제 2번, SMS 2번**.

같은 에이전트 ID로 동시에 여러 인스턴스가 돌면 자원이 공유돼서 충돌:

| 자원 | 위험 |
|------|------|
| 워크스페이스 파일 | 동시 쓰기 시 락 대기 |
| 메모리 SQLite | 동시 쓰기 시 락 |
| 외부 인증/계정 | 같은 키 사용 |
| **외부 상태** | **중복 결제, 중복 SMS, 중복 Airtable 레코드** ⚠️ |

규칙: **위임 spawn 전에 슬랙 본세션 큐 상태 확인**. 같은 작업 처리 중/대기 중이면 위임 금지.

#### 🔴 약속 2. 핸드오프 시 맥락+산출물 명시

> 📬 **비유** — 옆자리 동료한테 톡 던지면서 "이거 해줘"만 하면 받는 쪽이 처음부터 파악해야 함. 토큰 낭비.

`sessions_send`든 위임 spawn이든, 받는 쪽이 작업 내용을 즉시 파악할 수 있게 3줄 핸드오프 포맷 사용:

```
[넘김] → {받는 에이전트}: {작업 한 줄 요약}
맥락: {왜 이 작업이 필요한지, 어디까지 했는지}
산출물: {파일 경로, 데이터, 링크 — 없으면 "없음"}
```

특히 위임 spawn은 회의실 백지 상태라 **컨텍스트 0**에서 시작. 작업지시가 충실해야 헤매지 않음.

#### 🔴 약속 3. 결과 보고 채널 일원화

> 양쪽에서 보고하면 사용자 혼란. **위임 spawn 결과는 부모가 받아서 한 번만 사용자에게 보고**. 슬랙 본세션과 위임 자식이 동시에 같은 채널에 답하지 않게.

- 사용자 트리거 → A 또는 B 사용 → 그 메인 세션이 직접 보고
- 자율 실행 → C 사용 → 부모 에이전트가 결과 받아 사용자에게 보고

### 📌 결정 매트릭스

| 상황 | 권장 방식 | 이유 |
|------|----------|------|
| 사용자가 채널에서 직접 트리거한 단일 작업 | **A. 멘션** | 디폴트. 진행 상황 라이브로 봄 |
| 진행 중인 슬랙 대화 흐름에 다른 에이전트 작업이 끼어야 함 | **B. sessions_send** | 흐름 끊지 않음 |
| 한 에이전트가 여러 에이전트 결과 종합·오케스트레이션 | **C. 위임 spawn** | 한 세션에서 결과 모음 |
| 대량 병렬 처리 (5개 동시 등) | **C. 위임 spawn** | 메인 풀(4) 안 막힘 |
| 자동화/스케줄러가 자율 실행 (사용자 응답 대기 X) | **C. 위임 spawn** | 동기 제어 가능 |
| 본세션 컨텍스트 보호하며 일회성 작업 처리 | **C. 위임 spawn** | 격리된 새 세션 |
| 진행 상황을 사용자가 채널에서 라이브로 봐야 함 | **A 또는 B** | 슬랙 채널 가시성 |
| 사용자가 잘못된 채널에 던졌고, 다른 에이전트 영역 | **A로 재안내 또는 B로 핸드오프** | 흐름 자연스러움 |

원칙: **A가 디폴트. B/C는 강점이 살아나는 시나리오에서만.**

### 📊 결정 트리

```
사용자가 직접 채널에서 트리거?
├─ YES → 그 채널의 에이전트 영역인가?
│   ├─ YES → A (멘션 — 그대로 처리)
│   └─ NO → 두 선택지:
│           ├─ 사용자한테 "그건 X 채널로" 안내 → A 재유도
│           └─ B (sessions_send + [넘김] 핸드오프)
│
└─ NO (자동화/스케줄러/에이전트가 시작)
    ├─ 단일 작업 + 채널 흐름 이어야 함 → B
    ├─ 여러 에이전트 결과 종합 → C
    ├─ 대량 병렬 → C
    └─ 일회성 격리 작업 → C
```

### 🤝 실전 케이스 회고: ai-study-free-invite (2026-04-29)

> 💡 **이 작동법 가이드를 만든 트리거 사건.**

#### 상황

송다혜님이 #021-뽀야-뽀짝이 채널에서 뽀야한테 "이제 임직원/파트너스/운영진 무료초대 안내가 나가야 한다"고 요청.

#### 뽀야의 첫 선택 (잘못된 판단)

> 오케이 집사. 22기 맞지?
> 뽀짝이한테 바로 위임할게 — `ai-study-free-invite` 스킬로 임직원/파트너스/운영진 무료초대자 명단 조회 → 0원결제 + 무료초대 기록 + 안내 SMS까지 일괄 처리. ...

→ **C. 위임 spawn**으로 가려고 했음.

#### 왜 잘못됐나

이 케이스는 C의 강점이 하나도 안 살아나는 상황:
- 단일 작업 (오케스트레이션 X)
- 병렬 처리 안 함 (1회 트리거)
- 사용자가 슬랙에서 진행 봐야 함 (격리할 이유 X)
- 자동 체이닝 아님

게다가 위험은 있음:
- 슬랙 뽀짝이 본세션이 같은 작업 큐에 넣을 가능성 → **중복 결제/SMS 위험**
- 위임 결과가 뽀야 세션으로 가면 송다혜님은 슬랙 답글로 진행 못 봄

#### 더 나은 선택

**A. 멘션 재유도**
> 뽀야: "이거 뽀짝이 영역이야. #뽀짝이 채널이나 여기서 @뽀짝이로 한 번 더 던져줘. 풀 컨텍스트로 받을 수 있게."

또는

**B. sessions_send + 핸드오프**
> 뽀야가 뽀짝이한테 sessions_send:
> ```
> [넘김] → 뽀짝이: 22기 임직원/파트너스/운영진 무료초대 안내
> 맥락: 송다혜님이 #021-뽀야-뽀짝이 채널에서 트리거. ai-study-free-invite 스킬 사용 영역.
> 산출물: 22기 무료초대 대상자 명단(Airtable 22기 마케팅 Base)
> ```
> 뽀짝이가 같은 채널 스레드에 답글로 진행 → 송다혜님이 진행 라이브로 봄.

#### 교훈

**사용자가 채널에서 트리거한 단일 작업은 A 또는 B. 위임 spawn은 강점 안 살아남.** 한 사무실 안에서 동료한테 일 시킨다고 다 위임 모드로 가면 안 됨. C는 오케스트레이션·병렬·격리·자동화 시나리오 전용.

### 🔧 작동법 트러블슈팅

| 증상 | 의심 | 해결 |
|------|------|------|
| 위임했는데 모델이 약해진 느낌 | 익명 서브에이전트로 spawn돼서 `subagents.model` 기본값 사용 (다른 환경에서 약한 모델이 박혀있을 가능성) | 명시적으로 `--agent bbojjak` 사용. 명명된 에이전트는 자체 model 설정 우선 |
| 위임 자식이 슬랙 컨텍스트 모름 | 정상 — C는 빈 컨텍스트로 시작 | 작업지시에 맥락 풍부하게 포함하거나, B(sessions_send)로 전환 |
| 같은 사람한테 0원결제 2번, SMS 2번 발생 | 슬랙 본세션과 위임 자식이 동시에 같은 작업 처리 (약속 1 위반) | 위임 전 본세션 큐 확인. 외부 호출 멱등성(같은 호출 두 번 해도 안전한지) 보강 |
| 위임으로 띄웠는데 `subagents.maxConcurrent` 한도 초과 | 부모당 5, 전역 8 한도 초과 | 동시 spawn 줄이거나 직렬화 |
| `sessions_send` 보냈는데 받는 세션 없음 | sessionKey 오타 또는 세션 이미 종료 | `openclaw sessions --agent bbojjak`로 활성 세션 확인 |
| 사용자가 결과 못 봄 (위임 결과가 뽀야 세션에만 옴) | C는 부모로 결과 반환 → 부모가 사용자에게 보고해야 함 | 부모(뽀야)가 받아서 슬랙 채널에 답글로 전달 |
| 위임 자식이 본세션 작업 흐름 망침 | 같은 메모리 SQLite 동시 쓰기 락 충돌 | 본세션 진행 중인 작업 끝나길 기다리거나, B(sessions_send)로 전환 |
| `subagents.allowAgents`에 없어서 위임 거부 | `openclaw.json`에 권한 없음 | 양방향 추가: 뽀야 → `["bbojjak"]`, 뽀짝이 → `["bboya"]` |
| 위임이 머신 걸쳐 안 됨 | `subagents.allowAgents`는 같은 머신 안에서만 작동 | [ep.5 협업 패턴 1(슬랙 스레드)](./ep-06-multi-hosts) 사용 |

### 📚 빠른 참조 카드

```
A. 멘션 (📬)         — 사용자가 직접 채널 멘션
                      디폴트, 진행 라이브 가시성
B. sessions_send (💬) — 진행 중 흐름에 다른 에이전트 끼움
                      [넘김] 핸드오프 3줄 포맷
C. 위임 spawn (🚪)    — 새 세션, 부모-자식, 결과 종합
                      오케스트레이션·병렬·격리·자동화 전용

같은 능력치  : 모델/워크스페이스/스킬/메모리 동일
다른 점     : 컨텍스트 + 동시성 풀

위임 전 체크 :
  □ 본세션 큐에 같은 작업 있나?
  □ 외부 호출 멱등? (중복 안전?)
  □ 보고 채널 일원화 (사용자한테 한 번만)?

명명된 에이전트(`--agent X`)는 본체 model 설정 우선
→ 능력 다운그레이드 없음
```

**STEP 6 한 줄 요약**: 사용자 트리거 단일 작업은 A. 에이전트 간 핸드오프는 B. 오케스트레이션·병렬·격리·자동화는 C. 같은 동료(에이전트)지만 어느 자리에서 일하느냐의 차이일 뿐, 능력은 동일. 위임 전엔 본세션 큐와 외부 호출 멱등성을 반드시 확인.

---

## 🚧 2마리 키울 때 만나는 함정 4가지

### 🥲 함정 1 — 뽀짝이가 갑자기 뽀야 톤으로 답함 (페르소나 섞임)

> 가장 흔한 사고. 한참 잘 답하다가 어느 순간 갑자기 다른 톤으로.

**가능한 원인 (자주 일어나는 순서)**:

1. 🥇 말투 규칙을 SOUL.md에만 박고 **AGENTS.md `## Red Lines`엔 안 박았음** → 긴 대화 후 자동 압축에서 희석 (STEP 2 뽀짝이 사례)
2. 🥈 글로벌 `~/.claude/CLAUDE.md`에 한쪽 말투 규칙이 있어 두 책상 다 오염
3. 🥉 bindings route가 잘못 박혀서 뽀짝이 호출인데 뽀야로 라우팅 (이건 아이콘부터 틀어지니까 → 함정 2와 동시 발생)

**해결**:
- 각 워크스페이스 `AGENTS.md` `## Red Lines`에 말투 박기 (ep.3 원칙)
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

⚠️ subagent 위임은 **같은 머신 안에서만** 작동. 다른 맥미니에 있는 에이전트한테는 슬랙 채널로 부탁해야 함 (다음 ep.5 가이드 참조).

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

물리 머신을 여러 대로 분산하고 싶으면 → [ep.5 여러 물리 머신에 여러 마리](./ep-06-multi-hosts)
