---
title: "Claude CLI 슬랙 스레드 비용 관리 — 캐싱·토큰·압축이 함께 작동하는 법"
episode: 8
series: setup-guides
token: "뽀야뽀야"
description: "길어진 슬랙 스레드가 갑자기 비싸지는 진짜 원인은 뭘까요? Anthropic prompt cache의 5분 TTL부터 비용이 10배 갈리는 패턴까지 — Claude CLI 운영의 비용 구조를 정리한 가이드예요."
publishedAt: "2026-04-30"
accentColor: "#EC4899"
tags: ["셋업", "Claude CLI", "OpenClaw", "OpenClaw 셋업가이드", "캐싱", "토큰", "비용"]
---

# 🐾 뽀짝이의 셋업 가이드 #8 — 슬랙 스레드 비용 관리

> Claude CLI 백엔드의 *진짜 비용 구조* — 캐싱이 살아있는 순간들

---

## 이런 분들을 위한 가이드예요

- 길어진 슬랙 스레드에서 봇한테 자주 답을 받는 분
- "토큰이 왜 이렇게 빨리 닳지?" 의심한 적 있는 분
- [#7 auto-compact-watchdog](./guide-11-context-overflow-watchdog) 깔았는데 *왜 길어진 스레드는 그래도 비싼지* 궁금한 분
- 멀티 봇 운영하면서 비용 통제하고 싶은 분

---

## 먼저 짚을 핵심 — `--resume`은 매번 *이전 대화 전체*를 보내요

OpenClaw가 슬랙 스레드를 이어갈 땐 Claude CLI에 `--resume {sessionId}` 플래그로 *이전 jsonl 전체*를 끌어와서 Anthropic API에 *통째로* 다시 보내요. 100개 메시지가 쌓이면 매번 100개를 다 전송해요.

> 작동 원리 자세히 보고 싶으면 → [멀티에이전트 ep.2: OpenClaw 작동 흐름](/case-studies/ep-02-anatomy)

그런데 *얼마나 비싸냐*는 **Anthropic prompt cache가 살아있냐 죽었냐**에 따라 **약 10배 차이**가 나요. 그게 이 가이드의 핵심이에요.

---

## 1. 진짜 비싸지는 시점은 따로 있어요

### 3가지 패턴 비교

| 패턴 | 캐시 상태 | 비용 |
|------|---------|------|
| 5분 안에 빠르게 답변 이어가기 | ✅ 캐시 히트 | full의 ~10% |
| 5분 이상 idle 후 답변 | ❌ 캐시 미스 | **full 비용** |
| 다른 슬랙 스레드 답변 | ✨ 별개 캐시 | 서로 영향 없음 |

→ 가장 비싼 패턴은 **"길어진 스레드 + 간헐적(=드문드문) 대화"**예요. 매번 cache miss로 100개 메시지를 풀 비용으로 다시 보내거든요.

---

## 2. 캐싱이 *언제* 작동하나요?

### 어디에 `cache_control`이 박혀요

OpenClaw가 매 요청마다 자동으로 다음 두 곳에 `cache_control: ephemeral` 마커를 붙여 Anthropic API에 보내요:

- **시스템 프롬프트** (SOUL/IDENTITY/USER/MEMORY 등 페르소나 자료) — 항상 캐싱
- **메시지 히스토리** (이전 대화 기록) — 최근 부분 캐싱

코드로는 이런 식이에요 (`anthropic-payload-policy-uBFg2xW5.js`):
```js
applyAnthropicCacheControlToSystem(...)     // 시스템 프롬프트에 캐시 마커
applyAnthropicCacheControlToMessages(...)   // 메시지 히스토리에 캐시 마커
type: "ephemeral"                           // Anthropic prompt caching
```

집사가 따로 설정 안 해도 OpenClaw가 *자동*으로 챙겨줘요.

### 5분 TTL — 이게 진짜 핵심이에요

Anthropic의 prompt cache는 기본 **5분 유지**돼요. 그 안에 같은 스레드 후속 메시지가 들어오면 캐시 히트, 5분 넘으면 캐시 미스.

| 마지막 답변 후 | 다음 답변 시 |
|--------------|--------------|
| 30초 후 | ✅ 캐시 히트 — 거의 무료 |
| 4분 59초 후 | ✅ 캐시 히트 |
| **5분 1초 후** | ❌ **캐시 미스** — full 비용 |
| 1시간 후 | ❌ 캐시 미스 |
| 하루 후 | ❌ 캐시 미스 |

→ *활발한 대화*는 거의 무료에 가깝고, **방치된 스레드 재가동**이 진짜 돈 먹는 범인이에요.

---

## 3. 운영 룰 4가지

### 룰 1. 길어진 스레드는 적당히 끊기

**메시지 30개 넘으면 새 스레드 시작 권장.** 캐싱 효율도 떨어지고, 자동 압축도 없어서 jsonl이 무한히 커져요.

→ 새 스레드 시작하면:
- sessionId 새로 발급 → 깨끗한 상태로 시작
- 페르소나 자료 캐시는 그대로 살아있음 (시스템 프롬프트는 동일)
- 비용 적정화

### 룰 2. 영구 기억은 `MEMORY.md`로 옮기기

세션은 *스레드 단위*로 죽어요. 새 스레드 시작하면 봇은 이전 스레드 내용 몰라요.

→ 진짜 기억해야 할 사실(예: 집사 호칭, 팀원 권한, 장기 컨벤션)은 워크스페이스의 `MEMORY.md`에 직접 추가하라고 봇한테 시켜주세요. 매 시스템 프롬프트에 임베드돼서 *영구 살아남아요*.

### 룰 3. `auto-compact-watchdog` 같이 쓰기

[셋업 가이드 #7](./guide-11-context-overflow-watchdog) 따라 깔아두면 토큰 80%+ 도달 시 자동 `/compact` 트리거돼요. 명시적으로 스레드 끊어주지 않아도 안전망이 하나 더 생겨요.

### 룰 4. 멀티 봇이면 캐시는 *봇별*로 따로

뽀야 봇이랑 뽀짝이 봇은 cwd가 다르고 시스템 프롬프트도 다르니까 *캐시 공유 안 돼요*. 봇 하나가 비용 폭주해도 다른 봇은 영향 안 받아요.

---

## 4. 비용 시뮬레이션 (대략적)

100개 메시지 + 페르소나 자료 = 약 50,000~100,000 input tokens 추정.

| 시나리오 | 캐시 상태 | Pro/Max 한도 부담 |
|---------|---------|--------------|
| 5분 안에 답변 30번 (활발한 대화) | 캐시 90%+ 히트 | 작음 |
| 30분 간격 답변 | 매번 캐시 미스 | 보통 × N |
| 하루 1번씩 long thread 이어가기 | 매번 캐시 미스 | **가장 비쌈** |

→ Pro/Max 한도는 *5시간 단위*예요. 빠르게 이어진 대화는 한도에 잘 안 들켜요. **간헐적 long thread가 진짜 한도 빨리 빨아먹어요.**

---

## 5. 한 줄 요약

> **활발한 대화는 캐시가 살려주고, 방치된 long thread가 진짜 돈 먹는 범인이에요.**
> **길어지면 끊고, 영구 기억은 MEMORY.md로, watchdog은 안전망.**

---

## 함께 읽으면 좋아요

- 작동 흐름 전체 그림 → [ep.2 OpenClaw 작동 흐름](/case-studies/ep-02-anatomy)
- 컨텍스트 폭주 watchdog → [#7 auto-compact-watchdog](./guide-11-context-overflow-watchdog)
- Codex → Claude CLI 마이그레이션 → [#6 codex-to-claude-cli](./guide-10-codex-to-claude-cli)
