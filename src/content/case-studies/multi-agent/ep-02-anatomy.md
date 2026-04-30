---
title: "OpenClaw 작동 흐름 — 메시지 한 줄이 페르소나 입은 답이 될 때까지"
episode: 2
date: "2026-04-25"
series: case-studies
category: "Slack × Claude CLI 멀티에이전트"
publishedAt: "2026-04-25"
accentColor: "#8B5CF6"
description: "OpenClaw + Claude CLI 방식으로 한 봇이 메시지에 답하는 백엔드 흐름을 친절히 풀어보는 편. cwd 잡기, 페르소나 자료 임베드, --resume 기억 잇기까지."
tags: ["멀티에이전트", "OpenClaw", "아키텍처", "작동 원리", "cwd", "--resume"]
token: "밋업"
---

# 01 · OpenClaw 작동 흐름 — 메시지 한 줄이 페르소나 입은 답이 될 때까지

> 🐱 **이 편의 핵심** — 한 봇이 메시지에 답하는 *백엔드 흐름이 어떻게 굴러가나*를 8단계로 친절히 풀어볼게. 끝까지 읽으면 **cwd 잡기 + 페르소나 자료 임베드 + --resume 기억 잇기**, 이 3종 세트가 OpenClaw + Claude CLI 방식의 핵심임이 잡혀.

---

## 🤔 한 봇이 메시지에 답하는 흐름은 어떻게 굴러가나?

OpenClaw에서 에이전트를 *분리해 만들면* 그 자체로 다른 봇이야 — 자기 워크스페이스, 자기 메모리, 자기 페르소나 자료가 따로 있으니까. 우린 그 봇의 *두뇌(모델 호출)*를 **Claude CLI 방식**으로 굴리는 길을 택했어.

그럼 슬랙에서 `@뽀야야` 한 줄을 보냈을 때, OpenClaw + Claude CLI 백엔드가 *진짜 어떻게* 의뢰를 받아 답을 만들어내는지 8단계로 따라가보자.

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

폴백을 코덱스(GPT) 같은 *다른 모델*로 두면, Pro/Max 한도 초과 시 *전혀 다른 모델이 페르소나 흉내내며* 답함. 톤·문체 미묘하게 흐트러져서 뽀야 답이 갑자기 GPT 톤이 되는 거. **차라리 그냥 에러로 응답 실패하는 게 낫다**고 결정. 그래서 폴백 비워둠.

→ Pro/Max 한도 다 쓰면 그냥 *응답 실패*. 그게 의도된 안전장치야.

### 7. 응답 스트리밍 — 답이 한 글자씩 채워지는 이유

슬랙에서 봇이 답할 때, 답변이 한 번에 통째로 나오는 게 아니라 *한 글자씩 늘어나며 채워지는* 효과를 본 적 있을 거야. 메커니즘은 이래:

1. 클로드 모델은 답을 *한 번에* 안 만들어. 단어 조각(=*토큰*)을 *순서대로 하나씩* 생성함
2. Anthropic API가 토큰 만들어질 때마다 OpenClaw로 실시간 흘려보냄 (= 스트리밍)
3. OpenClaw는 토큰 받을 때마다 슬랙 `chat.update` API로 *기존 답변 메시지를 수정*해서 끝에 추가
4. → 사용자 눈엔 *한 메시지가 점점 길어지는* 효과

→ **새 메시지 여러 개가 아니라 *하나의 메시지가 계속 업데이트되는* 게 핵심.** 그래서 슬랙에 답변 1개만 떠있고 글자가 점점 추가되는 것처럼 보임.

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

> 한 봇이 답하는 흐름의 핵심은 **cwd 잡기 + 페르소나 자료 자동 임베드 + `--resume` 기억 잇기**. OpenClaw가 매 요청마다 *워크스페이스 자료를 시스템 프롬프트에 통째로 박아* 클로드 CLI에 넘기고, 같은 슬랙 스레드의 다음 메시지는 **`--resume`**으로 이전 대화를 이어붙여. 폴백 없이 Pro/Max 구독 안에서만 답하는 게 빌링 안전장치야.

## 다음 단계

이제 작동 원리 잡혔으니 *직접 1마리 출근시키러* 가자 → [ep.3 1마리 셋업](./ep-03-single-agent)

---

## 📎 부록: Slack 스트리밍 모드 4가지

7번에서 본 "답이 한 글자씩 채워지는 효과"는 *설정 한 줄*로 결정돼. 이 한 줄을 다른 값으로 바꾸면 슬랙에서 보는 답변 UX가 완전히 달라져.

### 어디에 박혀있냐

`~/.openclaw/openclaw.json`의 슬랙 계정 안:

```json
"channels": {
  "slack": {
    "accounts": {
      "default": {
        "streaming": {
          "mode": "partial",       ← 4가지 중 하나
          "nativeTransport": true
        }
      }
    }
  }
}
```

### `streaming.mode` 4가지 모드 비교

| 모드 | 동작 | 사용자 체감 | API 부담 |
|------|------|------------|---------|
| `"off"` | 응답 *완성된 후* 한 번에 전송 | 답이 갑자기 *툭* 뜸 (긴 답일수록 한참 기다림) | 가장 적음 |
| `"partial"` ⭐ | 토큰 단위로 *기존 메시지를 수정*해 채움 | 한 글자씩 늘어나는 효과 (ChatGPT 같은 느낌) | 가장 많음 |
| `"block"` | 토큰 여러 개를 *블록 단위*로 묶어 갱신 | 짧은 끊어짐 있지만 부드럽게 채워짐 | 중간 |
| `"progress"` | 콘텐츠 대신 *진행률 표시* | "답하는 중..." 같은 인디케이터 | 가장 적음 |

### 우리는 왜 `"partial"`을 쓸까?

가장 ChatGPT스러운 UX. 실시간 채워지는 답을 보면 *대화하는 느낌*이 살아남. 봇이 "응답 중"이라는 시각 신호가 의외로 중요해 — 멍 때리는 순간 사용자가 "얘 죽었나?" 의심하기 전에 글자가 채워지기 시작하니까. 슬랙 API 부담은 늘어나지만 그만한 가치가 있어.

### `nativeTransport: true`는 뭐야?

Slack에 *native streaming API*가 있어 (`chat.startStream` / `chat.appendStream` / `chat.stopStream`). 이걸 쓰면:

- 일반 `chat.update` 반복 호출보다 *훨씬 효율적*
- Slack rate limit 부담 줄어듦
- 단점: *스레드 답변*에서만 작동. *DM 최상위 메시지*는 fallback으로 일반 `chat.update` 사용

→ `nativeTransport: true`면 슬랙이 알아서 *native vs fallback*을 골라줘. 기본 켜두는 게 권장.

### `chunkMode` 옵션 (block / partial 모드에서)

청크 끊는 기준:
- `"length"` (기본): 글자 수 일정 단위로 끊음
- `"newline"`: 줄바꿈마다 끊음

긴 글에서 *줄 단위*로 자연스럽게 끊고 싶으면 `"newline"` 추천.

> 💡 즉 7번 응답 스트리밍에서 본 "한 글자씩 채워지는 효과"는 `streaming.mode = "partial"` + `nativeTransport = true`의 조합. 다른 모드 조합으로 바꾸면 *완전히 다른 UX*가 나와.
