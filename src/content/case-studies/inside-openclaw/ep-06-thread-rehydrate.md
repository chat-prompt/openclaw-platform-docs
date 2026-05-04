---
title: "13만 토큰이 매번 따라간다고? — 슬랙 스레드를 봇이 기억하는 진짜 방식"
episode: 6
date: "2026-05-04"
series: case-studies
category: "오픈클로 내부 까보기"
publishedAt: "2026-05-04"
accentColor: "#0D9488"
description: "어느 오후 '세션종료' 한 마디에 빌링 에러가 떴는데 다음 답변은 멀쩡했다. 같이 봇 머릿속을 끝까지 까봤더니 매 호출 13만 토큰이 따라가고 있었고, 슬랙 스레드 위쪽 대화는 자동으로 안 따라온다는 진실이 드러났다. 누적 컨텍스트, prompt cache, slack-thread-rehydrate v2 hook까지 코드 라인 박는다."
tags: ["OpenClaw", "claude-cli", "prompt-cache", "slack-thread", "rehydrate", "hook"]
---

# 6 · 13만 토큰이 매번 따라간다고? — 슬랙 스레드를 봇이 기억하는 진짜 방식

> 🛣️ **이 편의 핵심** — "세션종료 했는데 빌링 에러가 떴어. 근데 그 다음 답변은 멀쩡해. 왜?"라는 질문 한 줄로 시작했다. 답을 찾아 봇 머릿속을 끝까지 까봤더니 *매 호출에 통째로 따라가는 13만 토큰의 정체*, *prompt cache가 그걸 1/10 가격으로 만드는 마법*, 그리고 **슬랙 스레드 위쪽 대화는 자동으로 안 따라온다는 함정**까지 드러났다. 그 함정을 메우려고 진화한 *v0 룰 → v1 자동 prefix → v2 LLM 요약 hook* 3단계를 코드 라인까지 박는다.
>
> 📜 *inside-openclaw 시리즈* ep.6. 운영 중 부딪힌 질문 하나를 OpenClaw 코드와 jsonl 로그까지 까서 답하는 자리.

---

## 어느 날 집사가 물었다

5/4 오후. 슬랙에서 집사가 뽀짝이한테 "세션종료" 한 마디 보냈다. 화면에 이렇게 떴다.

```
⚠️ API provider returned a billing error — your API key has run out of credits...
```

근데 그 *직후에* 멀쩡한 답변이 또 떴다. ✅ 세션 정리 완료, 메모리 기록 + 아카이브 21개 정리.

> 👩 **집사**: "어? 빌링 에러 떴는데 또 잘 답하는데? 왜 그래?"

이 질문 한 줄에서 토끼굴이 시작됐다. 답을 따라가다 보니 **봇이 매 호출에 들고 가는 컨텍스트의 진짜 모습**이 풀렸다.

---

## 1. 봇은 매 호출에 *공책 한 권*을 통째로 들고 간다

먼저 비유부터.

봇이 한 마디 답할 때마다, 머릿속에 **공책 한 권**을 통째로 편다. 그 공책에는:

- *첫 페이지*: 자기가 누군지 (시스템 프롬프트 — AGENTS.md, SOUL.md, IDENTITY.md, MEMORY.md 등 8파일)
- *두 번째 페이지부터*: 지금까지 나눈 대화 전부
- *마지막 페이지*: 방금 받은 새 메시지

이걸 *통째로* 모델한테 넘기고 — "다 읽었지? 답해줘" 한다.

근데 일반적으로 OpenClaw 게이트웨이 로그에 찍히는 `promptChars` 값을 보면 *호출당 800~1500 chars* 수준이다. 1KB 안팎. *공책 한 권* 비유랑 안 맞는다. 처음 봤을 때 나는 "어, 컨텍스트 누적 안 되네?"로 잘못 결론냈다.

이게 함정이었다.

```
2026-05-04T16:54:47 [agent/cli-backend] cli exec promptChars=1082
2026-05-04T16:58:29 [agent/cli-backend] cli exec promptChars=793
2026-05-04T16:59:31 [agent/cli-backend] cli exec promptChars=1063  ← 사고 시작
2026-05-04T17:00:20 [agent/cli-backend] cli exec promptChars=805
```

`promptChars`는 OpenClaw가 claude-cli에 *추가로 던지는 신규 입력*만 보여준다. **이전 대화 누적은 claude-cli 내부 jsonl이 자체 관리해서, 게이트웨이 레벨에선 안 보인다.**

claude-cli가 디스크에 직접 jsonl로 기록을 남긴다. 위치는 `~/.claude/projects/-Users-dahtmad--openclaw-workspace-bbojjak/4fe3c634-*.jsonl`. 이걸 까보니 진실이 드러났다.

---

## 2. 진실 — 매 호출 13만 토큰이 따라가고 있었다

jsonl의 `usage` 필드 추적. 사고 세션 토큰 흐름.

| 호출 시각 | input | cache_read | cache_create | 모델 입력 합계 |
|----------|-------|------------|--------------|---------------|
| 07:55:02 (첫 호출) | 6 | 16,344 | **85,646** | ~102K *(공책 첫 발급)* |
| 07:55:10 | 1 | 101,990 | 837 | ~103K |
| 07:59:25 | 1 | 115,272 | 326 | ~115K |
| 08:03:04 | 1 | 123,743 | 751 | ~125K |
| **08:04:15 (마지막)** | 1 | **130,191** | 584 | **~131K** |

마지막 호출 — *13만 토큰이 통째로 모델에 들어간다.* 새로 추가된 부분(`input=1`, `cache_create=584`)은 한 줌이고, 나머지는 **이전 대화 전부**가 매번 따라간다.

claude-cli backend는 *호출별 stateless*가 아니다. **세션 jsonl을 자체 관리하면서 매번 누적 컨텍스트를 통째로 모델에 보내준다.**

---

## 3. "그러면 매번 13만 토큰 보내면 비싸지 않나?"

여기서 **prompt cache**가 등장한다.

표의 `cache_read_input_tokens` 가 *그것*. 같은 머릿속(컨텍스트) 다시 들고 오면 Anthropic이 이전 계산 결과를 재활용해준다. 비용은 정상가의 **1/10**, 응답 속도도 빠르다.

> ❗ *흔한 오해*: 캐시 = "안 보낸다"가 아니다. **매번 통째로 다 보낸다.** 단지 서버가 *이전에 본 거 같은데*하고 빠르게 처리해줄 뿐.

claude-cli는 모든 메시지에 `cache_control: { type: "ephemeral" }` breakpoint를 자동으로 박아 보낸다. OpenClaw는 wrapper일 뿐이라 *caching은 claude-cli 레이어에서 알아서 처리*된다. 따로 켤 게 없다.

⏰ **TTL 5분**. 5분 안에 다음 호출 안 들어오면 캐시 만료 → 다음 첫 호출은 *비싼 cache_create부터 다시*. 위 표 첫 줄(`cache_create=85,646`)이 정확히 그 케이스다.

---

## 4. 그런데 슬랙 스레드는 *좀 다르다*

여기까지가 봇이 자기 답변을 누적하는 얘기였다. 그런데 슬랙엔 **사람들끼리 나눈 대화**도 있다.

예시:

```
👤 닿: 22기 결제 대시보드 어떻게 보지?
👩 타타: 어 그거 ai-study-dashboard에 있어
👤 닿: 음 근데 결제 추이가 좀 이상한데
🐈‍⬛ 뽀짝아  ← 여기서 처음 멘션 받음
```

뽀짝이가 처음 멘션 받았을 때, *위쪽 대화 3줄을 자동으로 읽을까?*

까봤더니 — **안 읽는다.**

OpenClaw가 봇한테 던지는 user 메시지는 이렇다.

```json
System: [2026-05-04 16:54] Slack message in #업무방 from 송다혜:
        뽀짝아 22기 결제 대시보드 어떻게 보지?

Conversation info:
{
  "history_count": 1,
  "topic_id": "...",
  ...
}
```

**`history_count: 1`. 정확히 이번에 받은 1건만** 들어온다. 위쪽 대화는?

- ❌ *사람들끼리 나눈 부분*: 안 읽는다. 진짜 0
- ✅ *봇 본인이 이전에 답한 적 있는 부분*: claude-cli jsonl에 누적되어 있어서 자동으로 챙김

그래서 봇이 *처음 들어가는 스레드*는 위쪽 맥락을 진짜 모르는 채로 답한다. "넵! 불렀어요?" 같은 헛소리가 그래서 나온다.

---

## 5. 그 빈틈을 메우는 도구의 진화 — v0 → v1 → v2

집사가 이 빈틈을 시간차로 여러 번 막았다. 진화 단계가 있다.

### 🥚 v0: 룰로 막기

`~/.openclaw/CLAUDE.md`에 박힌 룰.

> "스레드 안에서 멘션받았을 때, 자기 답변 이력이 없거나 스레드 맥락이 비어있다고 느끼면 답하기 전에 반드시 `conversations.replies`로 스레드 전체를 먼저 읽고 답할 것."

봇 본인이 알아서 슬랙 API 호출해서 위쪽 끌어오는 방식. **`limit=80` cap**. 80개 넘는 스레드면 일부 잘림.

가장 원시적인 안전망. 룰을 보고 챙기는 거라 *봇이 룰을 안 보면 빈틈은 그대로*. 그리고 슬랙 `conversations.replies`는 오래된 순으로 limit 만큼 반환하니, 100개 스레드면 **첫 80개 가져오고 최근 20개를 놓치는** 사고도 가능하다.

### 🐣 v1: slack-channel 플러그인이 자동 prefix

`bbopters-shared/skills/slack-channel/server.ts:432-456`.

```typescript
if (threadTs) {
  const replies = await slack.conversations.replies({
    channel: channelId,
    ts: threadTs,
    limit: 30,
  });
  const messages = (replies.messages || []).filter(
    (msg: any) => msg.ts !== messageTs // 현재 메시지 제외
  );
  if (messages.length > 0) {
    threadContext = `\n--- 스레드 이전 대화 ---\n${lines.join("\n")}\n--- 여기까지 ---\n`;
  }
}

const fullContent = threadContext
  ? `${threadContext}\n새 메시지 from ${userName}: ${cleanText}`
  : cleanText;
```

새 봇 만들 때 이 플러그인을 깔면 *자동으로 30개 raw prefix*가 박힌다. 봇이 룰을 안 봐도 자동.

근데 **30개 raw**가 함정이다. 100개 넘는 긴 스레드면 잘리고, 매번 30개 풀로 따라가면 토큰 부담도 커진다.

### 🐈‍⬛ v2: LLM 요약 hook (5/3 집사가 만듦)

`~/.openclaw/hooks/slack-thread-rehydrate-v2.sh`.

이게 똑똑하다. **Claude Code의 UserPromptSubmit hook**으로 동작. 흐름:

```
1. 슬랙 멘션 들어옴
2. hook이 UserPromptSubmit 단계에서 가로챔
3. conversations.replies로 스레드 200개까지 가져옴
4. 분기:
   ├─ 짧은 스레드 (≤ summary_threshold): 전체 raw 그대로 prefix
   └─ 긴 스레드: 앞부분 → claude -p로 1500자 LLM 요약
                 뒤 → 최근 20개만 raw
5. 캐시: 같은 prefix(older_count 일치)는 재사용
6. 결과를 additionalContext로 주입 → 봇이 답변 시작
```

비유하자면 — **회의실 들어가기 전에 비서가 "지금까지 흐름 요약" 한 장 준비해서 손에 쥐여주는** 느낌이다. 긴 스레드도 안 잘리고, 토큰 부담도 적고, 같은 스레드 두 번 거치면 캐시로 즉시.

핵심 코드 (Python 일부):

```python
# Case 1: 짧은 스레드 → 전체 raw
if total <= summary_threshold:
    out.append('## 🧵 Slack thread (전체 raw)')
    for m in msgs:
        out.append(fmt_msg(m, cap=600))
    sys.exit(0)

# Case 2: 긴 스레드 → 요약 + 최근 raw
older = msgs[:-recent_keep]
recent = msgs[-recent_keep:]

if cache_valid:
    summary = cache['summary']
else:
    prompt = f'다음은 슬랙 스레드의 오래된 메시지 {len(older)}개야. 핵심 결정·맥락·언급된 인물/날짜/작업·미해결 이슈 위주로 한국어 1500자 이내로 요약해...'
    r = subprocess.run(['claude', '-p', '--model', summary_model, prompt], ...)
    summary = r.stdout.strip()
```

`claude -p`로 *Claude CLI Max 구독을 그대로 활용*해서 요약을 만든다. 별도 API 키도 안 든다. *집사가 진짜 똑똑하게 박았다.*

---

## 6. 그래서 그날 사고는 진짜 뭐였냐면

집사 질문으로 돌아간다. **"빌링 에러 떴는데 왜 다음 답변은 멀쩡했지?"**

같이 분해해본 결론.

1. **claude-cli backend 일시 튕김**: 5시간 사용량 윈도우 임계 근처에서 한 번 transient billing error
2. **OpenClaw billing-cooldown 패치 (3초)**: 30초였던 기본을 *집사가 3초로 낮춰둔 게 살아있었음*
3. **3초 후 자동 재시도 → 캐시 살아있는 상태로 즉시 회복**

사람 눈엔 거의 끊김 없이 다음 답변이 이어진 것처럼 보인 게 그래서다.

> 👩 **집사**: "근데 v2 hook은 그때 발동 안 했어?"

발동했다. 100% 매번. router 로그 vs cli exec 매핑.

| 시각 | router 발동 | cli exec |
|------|-------------|----------|
| 16:54:52 | route=v2 | 16:54:47 ✅ |
| 16:58:29 | route=v2 | 16:58:29 ✅ |
| **16:59:35** | **route=v2** | **16:59:31** ✅ *(사고 시점)* |
| 17:00:20 | route=v2 | 17:00:20 ✅ |

다만 **v2.log에서 그날 호출은 모두 `empty context, skip`**.

```
[16:58:30] empty context, skip
[17:00:20] v2 rehydrating channel=C0AGTTF23DZ thread_ts=1777881566.791119
[17:00:21] empty context, skip
[17:00:32] v2 rehydrating ...
```

이유는 v2.sh 코드 134줄에 박혀 있다.

```python
msgs = [m for m in d.get('messages', []) if (m.get('text') or '').strip()]
if len(msgs) <= 1:
    sys.exit(0)   # 빈 출력 후 종료
```

이번 사고 케이스들은 모두 *짧은 스레드*(`messages ≤ 1`)라 v2가 *일부러 skip*했다. v2는 긴 스레드만 가로채는 게 설계라 정상 동작.

stats 통계도 까봤다.

```
발동: 166회 (긴 스레드 요약 모드: 166)
캐시 hit: 0 / 신규 요약 성공: 0 / 실패→fallback: 0
```

표기는 *긴 스레드 요약 모드 166*인데, 실제로는 156회가 `empty context, skip`. **5/4 활성화 첫날 LLM `claude -p` 호출은 0번 진짜 발생.** 아직 dogfooding이 진짜 케이스를 안 잡은 상태다.

정리하면:
- v2 hook 활성화 ✅ — 사고 시점 발동 ✅
- 다만 *이번 스레드는 짧아서 v2 손길 안 닿음*
- **안정성의 진짜 메커니즘** = claude-cli가 누적한 130K가 prompt cache로 부드럽게 처리 + 3초 cooldown 패치가 transient 에러 흡수

---

## 7. 한 장으로 — 봇이 답하기까지의 컨텍스트 흐름

```
[슬랙 멘션 도착]
       ↓
┌──────────────────────────────────────┐
│ 1. v2 hook (UserPromptSubmit)        │
│    - 짧은 스레드 → skip               │
│    - 긴 스레드 → claude -p로 LLM 요약   │
│    - 결과를 additionalContext로 주입   │
└──────────────────────────────────────┘
       ↓
┌──────────────────────────────────────┐
│ 2. OpenClaw 게이트웨이                 │
│    - user 메시지 1건 + metadata        │
│    - history_count: 1                │
└──────────────────────────────────────┘
       ↓
┌──────────────────────────────────────┐
│ 3. claude-cli backend                │
│    - jsonl 누적 (봇 본인 대화)         │
│    - 시스템 프롬프트 통째 (~50K)        │
│    - 합쳐서 ~130K 토큰 전송            │
└──────────────────────────────────────┘
       ↓
┌──────────────────────────────────────┐
│ 4. Anthropic API                     │
│    - prompt cache hit → 1/10 가격     │
│    - TTL 5분 (호출 뜸하면 다시 비쌈)    │
└──────────────────────────────────────┘
       ↓
   ✨ 답변 ✨
```

---

## 8. 핵심 요점

- 봇은 매 호출에 **공책 한 권 통째로** 모델에 보낸다. 마지막 메시지만 보내는 게 아니다.
- `promptChars`는 *신규 입력*만, 진짜 모델 입력은 *jsonl 누적*까지 합쳐 130K 수준.
- prompt cache가 비용을 1/10로 떨어뜨리지만, **보내는 데이터 자체는 매번 통째**다.
- 슬랙 스레드 위쪽 대화는 *자동으로 안 따라온다*. `history_count: 1`. 봇이 답한 부분만 jsonl이 챙겨준다.
- 그 빈틈을 v0(룰) → v1(자동 prefix) → v2(LLM 요약 hook)로 점점 똑똑하게 메웠다.
- v2 hook은 발동 100%지만 짧은 스레드는 일부러 skip. 5/4 dogfooding 첫날 진짜 LLM 요약은 0번.
- 그날 빌링 에러는 5시간 윈도우 일시 튕김. **3초 cooldown 패치**가 사람 눈에 안 보이게 자동 회복시켰다.

---

## 9. 다음 회차 예고

v2 hook이 *활성화는* 됐는데 5/4 첫날엔 LLM 요약이 한 번도 진짜 발동을 안 했다(짧은 스레드만 들어와서). **진짜 긴 스레드가 들어왔을 때** 어떻게 동작하는지 — 캐시 hit/miss, 요약 품질, 가끔 일어나는 fallback까지 — dogfooding 며칠 더 쌓이면 ep.7로 가져올게.

그리고 5분 TTL 만료 후 첫 호출 비용 폭증 문제, jsonl이 무한 누적되면 1M 한계 가까이 가는 문제도 — 이어지는 회차에 다룰 거리다.

봇이 잘 답한다고 다 똑같이 답하는 게 아니야. *머릿속에 누가 어떤 공책을 챙겨 넣어주냐*가 다 다르다. 🐾
