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

## 🔄 메시지 → 응답 흐름 (Pro/Max 구독으로만 굴리는 방식)

집사가 슬랙에 `@뽀야야 ~` 한 줄 보냈을 때 백엔드에서 *진짜로* 일어나는 일을 친절하게 풀어볼게. 각 단계에 어떤 파일이 어떤 역할 하는지도 같이.

### 1. 슬랙 메시지 도착
뽀야 봇 슬랙 앱이 OpenClaw 게이트웨이로 이벤트를 push.

### 2. 라우팅 — 누가 받을지 결정
게이트웨이가 **`~/.openclaw/openclaw.json`**의 `bindings` 룰을 조회:

```json
{
  "bindings": [
    {
      "type": "route",
      "agentId": "bboya",
      "match": { "channel": "slack", "accountId": "default" }
    }
  ]
}
```

→ "default 슬랙 봇으로 들어온 메시지는 bboya 에이전트가 받는다"는 라우트가 결정됨.

### 3. cwd(working directory) 잡기 ⭐ 멀티에이전트의 핵심

**cwd = "current working directory" = 클로드 CLI가 *어느 폴더에서 실행되는지* 가리키는 절대경로.**

터미널에서 사람이 `cd ~/myproject && claude` 라고 치면 그 `~/myproject`이 cwd야. claude는 그 폴더 기준으로 깨어나서 그 안의 파일들을 본다.

OpenClaw도 똑같이 cwd 지정해서 클로드 CLI를 spawn함. **봇마다 cwd가 다른 게 멀티에이전트의 진짜 트릭이야:**

```bash
# 뽀야 메시지 처리 시
cd /Users/dahtmad/.openclaw/workspace-bboya && claude

# 뽀짝이 메시지 처리 시
cd /Users/dahtmad/.openclaw/workspace-bbojjak && claude
#                                ↑ cwd만 다르게 줌
```

같은 `claude` 바이너리인데 *어느 폴더에서 깨어났느냐*가 페르소나를 만들어. 이번 케이스엔 `workspace-bboya/`.

### 4. ⭐ 페르소나 파일 자동 임베드

OpenClaw가 `workspace-bboya/` 안의 페르소나 파일들을 *내용 통째로* 읽어 시스템 프롬프트로 조립:

```
~/.openclaw/workspace-bboya/
├── SOUL.md       — 성격, 말투, 가치관
├── IDENTITY.md   — 이름, 외형, 정체성
├── USER.md       — 집사(사용자) 이해
├── MEMORY.md     — 장기 기억
├── AGENTS.md     — 워크스페이스 운영 가이드
├── TOOLS.md      — 도구 사용법
└── HEARTBEAT.md  — 주기적 자가 점검 가이드
```

**OpenClaw가 매 호출마다 이 파일들 *content*를 시스템 프롬프트에 직접 박아넣어 클로드 CLI한테 넘김.** 이게 *같은 클로드 모델인데 봇마다 페르소나가 다른 진짜 이유*야.

### 5. 인증 — 집사 Pro/Max 구독으로 호출

뽀야가 모델을 *어떤 자격으로* 호출하는지. 두 곳을 봐야 해.

**5-1. OpenClaw 쪽 인증 프로필 정의** — `~/.openclaw/openclaw.json`:

```json
{
  "auth": {
    "profiles": {
      "anthropic:claude-cli": {
        "provider": "claude-cli",
        "mode": "oauth"
      }
    },
    "order": {
      "anthropic": ["anthropic:claude-cli"]
    }
  }
}
```

→ "anthropic은 claude-cli 프로필로, OAuth 방식으로 인증한다" 선언.

**5-2. 실제 토큰은 에이전트별 디렉토리에 분리 저장** — `~/.openclaw/agents/bboya/agent/`:

```
~/.openclaw/agents/bboya/agent/
├── auth.json                  — 활성 인증 메타
├── auth-state.json            — 프로필별 마지막 사용 시각/에러 카운트
├── auth-profiles.json         — OAuth 토큰 본체 (절대 공유 X)
└── models.json                — 모델 사용 설정
```

클로드 CLI는 이 디렉토리를 `CLAUDE_CONFIG_DIR` 환경변수로 받아서 자기 인증 정보로 활용:

```bash
CLAUDE_CONFIG_DIR=~/.openclaw/agents/bboya/agent claude /login
#                  ↑ 이 dir의 자격증명으로 Pro/Max 로그인
```

→ **즉 모델 호출 비용은 집사 Claude Pro/Max 구독에서 차감되는 거**야. API 키 빌링 X.

> ⚠️ `auth-profiles.json`엔 진짜 토큰이 박혀있어 — 외부 공유 절대 금지. 분리 저장은 *봇마다 토큰 격리*하기 위함.

### 6. 모델 호출 — 폴백 *없음* (의도적 결정)

OpenClaw가 클로드 CLI를 띄울 때 어떤 모델 쓸지 알려주는 설정 — `~/.openclaw/openclaw.json` 안의 에이전트 정의:

```json
{
  "agents": {
    "list": [
      {
        "id": "bboya",
        "workspace": "/Users/dahtmad/.openclaw/workspace-bboya",
        "model": {
          "primary": "claude-cli/claude-opus-4-7",
          "fallbacks": []
        }
      }
    ]
  }
}
```

- **`primary`**: `claude-cli/claude-opus-4-7` — 항상 이 모델만 사용
- **`fallbacks: []`**: *비어있음. 의도적*

**왜 폴백을 안 두냐:**
1. **빌링 예측 가능성** — 폴백 켜두면 Pro/Max 한도 초과 시 API 키로 자동 전환 → 예상 못한 비용 폭주 위험. 우린 *구독 안에서만* 살자고 결정.
2. **페르소나 일관성** — 폴백 모델이 답하면 톤·문체 미묘하게 다르게 나옴. 뽀야 답이 갑자기 GPT 톤이 되는 거 방지.

→ Pro/Max 한도 다 쓰면 그냥 *응답 실패*. 그게 의도된 안전장치야.

### 7. 응답 스트리밍
모델이 토큰 만들 때마다 슬랙 메시지를 *수정*하며 채워짐. 한 번에 통째로 답 나오는 게 아니라 *한 글자씩 늘어나는* 효과.

### 8. 세션 저장
대화 기록은 자동으로:
```
~/.openclaw/agents/bboya/sessions/{sessionId}.jsonl
```
같은 슬랙 스레드의 다음 메시지는 *같은 sessionId*로 이어붙여서 클로드가 이전 대화 다 보고 답함. (이어붙이는 메커니즘은 다음 섹션의 `--resume` 참조)

---

## 🔄 스레드에서 이어가면 어떻게 기억해? — `--resume` 개념

같은 슬랙 스레드에 추가 메시지 보내면 클로드가 *아까 한 얘기* 기억하고 답해. 그 메커니즘 핵심이 `--resume` 플래그야.

### 첫 메시지 — 새 세션 발급
OpenClaw가 새 sessionId 생성. 클로드 CLI를 *새로* 띄우면서 모든 컨텍스트(시스템 프롬프트, 사용자 메시지)를 처음부터 보냄. 대화 기록은 `agents/bboya/sessions/{sessionId}.jsonl`에 저장 시작.

### 두 번째 메시지 (같은 스레드) — `--resume`으로 이어붙임
OpenClaw가 *같은 sessionId*를 재사용. 클로드 CLI 띄울 때 `--resume` 플래그를 줘서 이전 세션 기록을 같이 끌어옴:

```bash
claude -p "사용자 새 메시지" --resume {sessionId}
#                               ↑ 이 플래그가 핵심
```

클로드 CLI는 내부적으로:
1. `{sessionId}.jsonl`에서 *이전 대화 전체*를 읽어옴
2. 그 위에 새 사용자 메시지를 추가
3. 모든 걸 합쳐 Anthropic API에 *다시* 전송
4. 답 받고 새 메시지를 다시 jsonl에 추가

→ 즉 *클로드 모델의 메모리는 매번 처음부터 다시 빌드*되는데, **jsonl 파일이 그 메모리의 영구 저장소 역할**을 함. 클로드는 매번 "처음 만난 사람"인데 OpenClaw가 메모를 같이 들고 가서 보여주는 거.

### 세션이 새로 시작되는 트리거
- 슬랙에서 **새 스레드** 멘션 → OpenClaw가 새 sessionId 발급
- **다른 채널** 첫 메시지 → 새 세션
- **DM 첫 메시지** → 새 세션

### ⚠️ 클로드 CLI는 자동 압축 안 함 (운영 주의)

진짜 중요한 부분. **클로드 CLI 백엔드(우리가 쓰는 거)는 자동 compaction이 없음.**
세션이 길어져도 jsonl이 무한 누적됨 → `--resume` 시 그 모든 history가 매번 Anthropic으로 전송 → 결국 1M 토큰 한도 부딪힘 → 빌링 폭주 위험까지.

**대처법:**
- 길어진 스레드는 끊고 **새 스레드로 새 세션 시작** (가장 단순)
- 영구 기억하고 싶은 건 `MEMORY.md`에 옮겨 적기

### 세션 vs 메모리 — 두 종류의 기억

| 종류 | 어디에 | 어떻게 살아남나 |
|------|------|------------|
| **단기 (세션)** | `agents/{id}/sessions/{sessionId}.jsonl` | 같은 슬랙 스레드 안에서만. 새 스레드 = 리셋 |
| **장기 (메모리)** | `MEMORY.md` (워크스페이스 안) | 매번 시스템 프롬프트에 임베드돼서 *영구* |

> ⭐ 핵심: **`--resume`이 스레드 기억의 엔진**. 단 자동 압축이 없으니 길어지면 직접 끊어주고, 영구 기억은 MEMORY.md로.

---

## 🐱 한 줄 요약

> 게이트웨이가 우편물 분류표(bindings)를 보고 봇한테 분배 → 봇 책상(cwd)에서 Claude CLI가 깨어남 → 책상 위 페르소나 파일 6장을 읽어 자기 정체성 잡음 → 자기 사원증(OAuth)으로 Pro/Max 구독으로 답함.
>
> 책상이 다르면 같은 `claude` 바이너리도 완전히 다른 봇이 되는 게 멀티에이전트의 핵심 트릭이야.

## 다음 단계

이제 등장인물 다 파악했으니 1마리 출근시키러 가자 → [ep.3 1마리 셋업](./ep-03-single-agent)
