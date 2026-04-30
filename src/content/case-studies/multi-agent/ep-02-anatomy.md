---
title: "OpenClaw 해부 — 게이트웨이부터 OAuth까지 등장인물 8명"
episode: 2
date: "2026-04-25"
series: case-studies
category: "Slack × Claude CLI 멀티에이전트"
publishedAt: "2026-04-25"
accentColor: "#8B5CF6"
description: "1마리 셋업 들어가기 전, OpenClaw가 어떻게 짜여있는지 한 호흡에 잡고 가는 편. 게이트웨이·CLI·바인딩·cwd·페르소나 파일·OAuth·default·공용 레포 8가지 단어만 이해하면 셋업 흐름이 다 풀려."
tags: ["멀티에이전트", "OpenClaw", "아키텍처", "멘탈 모델", "OAuth", "cwd"]
token: "밋업"
---

# 01 · OpenClaw 해부 — 등장인물 8명

> 🧱 **이 편의 핵심** — 1마리 셋업 들어가기 전, OpenClaw가 어떻게 짜여있는지 한 호흡에 잡고 가는 편. 8가지 단어만 이해하면 [ep.3](./ep-03-single-agent) ~ [ep.5](./ep-05-multi-hosts)의 셋업 단계가 다 풀려.
>
> 비개발자도 따라올 수 있게 비유로 한 줄씩.

---

## 🧱 먼저 알아야 할 등장인물 8명

### 1. **OpenClaw 게이트웨이** = 사무실 안내데스크

슬랙·텔레그램·웹훅에서 메시지가 오면 가장 먼저 받는 프로그램. "어느 봇한테 갈 메시지인지" 분류해서 적절한 봇한테 넘겨줌. 맥미니 같은 컴퓨터에서 24시간 돌아가는 백그라운드 서비스.

```
슬랙 메시지 도착 → 🏢 OpenClaw 게이트웨이 → 적절한 봇한테 분배
```

### 2. **Claude Code CLI** = 봇의 뇌

원래는 사람이 터미널 열고 `claude` 치면 실행되는 AI 코딩 도구. 우리 시리즈에선 **OpenClaw가 사람 대신 이걸 실행**해서 봇의 뇌로 씀.

```
봇한테 일이 들어오면 → OpenClaw가 백그라운드에서 `claude` 실행 →
"이 메시지에 어떻게 답할까?" 묻고 → 답 받아서 슬랙으로 전송
```

> 💡 즉 봇이 멘션받을 때마다 OpenClaw가 **컴퓨터 뒤에서 `claude` 명령을 자동으로 실행**한다고 생각하면 돼. 사람이 직접 타이핑하는 거랑 똑같은 일을 자동으로.

### 3. **바인딩(bindings)** = 우편물 분류표

"슬랙 'A 계정'으로 온 메시지는 → 뽀야한테" / "슬랙 'B 계정'으로 온 메시지는 → 뽀짝이한테" 같은 매핑 규칙. `openclaw.json` 파일에 적어둠. 게이트웨이는 이 표를 보고 분배해.

```json
{ "type": "route", "agentId": "bboya", "match": { "channel": "slack", "accountId": "default" }}
//   ↑ 분류 규칙 한 줄                ↑ 누구한테?              ↑ 어떤 메시지를?
```

### 4. **cwd / 워크스페이스** = 봇의 자기 책상

**`cwd` = current working directory = `claude` 명령이 실행되는 그 순간의 현재 디렉토리.**

터미널에서 사람이 직접 쓸 때:
```bash
cd ~/myproject && claude
#  ↑ 이 폴더가 cwd. claude는 여기서 깨어나서 이 폴더의 파일들을 자동으로 봄
```

OpenClaw가 봇 호출받을 때도 똑같이 `cwd` 지정해서 spawn함:
```bash
# 뽀야한테 메시지 오면
cd /Users/dahtmad/.openclaw/workspace-bboya && claude

# 뽀짝이한테 메시지 오면
cd /Users/dahtmad/.openclaw/workspace-bbojjak && claude
#                                ↑ cwd만 다르게 줌
```

봇마다 자기 폴더가 따로 있어:
```
~/.openclaw/
├── workspace-bboya/      ← 뽀야 책상
├── workspace-bbojjak/    ← 뽀짝이 책상
└── workspace-arongi/     ← 아롱이 책상
```

`claude`는 시작할 때 **자기 cwd 폴더의 파일들을 자동으로 둘러봄** (CLAUDE.md 등). OpenClaw는 거기에 추가로 SOUL/IDENTITY/AGENTS 같은 페르소나 파일도 주입해줌.

> 🪑 **그래서 "책상" 비유**: cwd = "claude가 깨어났을 때 자기가 앉은 자리". 책상 위에 깔린 파일(성격설정서)이 자기 페르소나가 됨. **같은 `claude` 바이너리인데 어느 책상에서 실행되냐에 따라 완전히 다른 봇이 되는 게 멀티에이전트의 핵심 트릭.**

### 5. **페르소나 파일 6장** = 책상에 깔리는 성격설정서

각 워크스페이스 책상 위에 깔리는 6장의 마크다운 파일. OpenClaw가 매 호출마다 자동으로 읽어서 Claude한테 끼워줌:

| 파일 | 역할 |
|---|---|
| `IDENTITY.md` | 정체성 (이름, 종, 외형) |
| `SOUL.md` | 성격·말투·가치관 |
| `USER.md` | 사용자(집사) 이해 |
| `AGENTS.md` | 운영 매뉴얼 (⭐ Red Lines 섹션은 긴 대화에도 재주입) |
| `TOOLS.md` | 도구·API 사용법 |
| `MEMORY.md` | 장기 기억 |

> 🪶 멀티에이전트에서 **봇 성격이 안 섞이는 비밀**이 여기 있어 — 각자 자기 책상 파일만 읽으니까.

### 6. **OAuth 토큰** = 봇별 Claude 사원증

봇마다 자기 Claude Pro/Max 구독 사원증을 따로 발급받음. `~/.openclaw/agents/<봇이름>/agent/auth-profiles.json`에 저장. **봇·머신별 완전 격리** — 절대 공유 금지 (Anthropic 차단 위험).

```bash
CLAUDE_CONFIG_DIR=~/.openclaw/agents/bboya/agent claude /login
```

### 7. **default 에이전트** = 대장 봇

`"default": true`가 붙은 봇 1마리. 바인딩 매칭 실패 시 폴백으로 받음. **시스템에 단 1명만**. 보통 팀장 역할(뽀야)을 대장으로.

### 8. **bbopters-shared** = 팀 공용 git 자료실 (멀티 머신일 때만)

여러 맥미니에서 같이 봐야 하는 **스킬·hook 스크립트·팀 문서·페르소나 템플릿**을 모아둔 git 레포. 각 머신에서 clone → `git pull/push`로 동기화. 1·2마리만 한 머신에서 돌리면 굳이 안 써도 됨.

---

## 🐱 한 줄 요약

> 게이트웨이가 우편물 분류표(bindings)를 보고 봇한테 분배 → 봇 책상(cwd)에서 Claude CLI가 깨어남 → 책상 위 페르소나 파일 6장을 읽어 자기 정체성 잡음 → 자기 사원증(OAuth)으로 Pro/Max 구독으로 답함.
>
> 책상이 다르면 같은 `claude` 바이너리도 완전히 다른 봇이 되는 게 멀티에이전트의 핵심 트릭이야.

## 다음 단계

이제 등장인물 다 파악했으니 1마리 출근시키러 가자 → [ep.3 1마리 셋업](./ep-03-single-agent)
