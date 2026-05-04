---
title: "왜 게이트웨이를 쪼갰나 — 한 책상에 봇 13마리 동거의 끝"
episode: 2
date: "2026-05-03"
series: case-studies
category: "오픈클로 내부 까보기"
publishedAt: "2026-05-03"
accentColor: "#0D9488"
description: "슬랙 봇 한 마리가 매달리면 다른 봇들도 같이 끊겨버리는 패턴, 익숙하다면 이 글을 읽어보세요. 단일 게이트웨이의 한계와 분리로 가는 결정 — 그리고 솔직한 장단점."
tags: ["OpenClaw", "게이트웨이 분리", "아키텍처", "트러블슈팅", "이벤트 루프"]
---

# 2 · 왜 게이트웨이를 쪼갰나 — 한 책상에 봇 13마리 동거의 끝

> 한 책상에 봇 13마리 동거 → 한 봇 사고가 모두의 사고

---

## 이런 분들을 위한 가이드예요

- 슬랙 봇이 **한 마리 매달리면 같이 끊기는** 패턴을 본 분
- "한 봇이 cooldown에 걸리면 왜 다른 봇까지 멈추지?" 싶은 분
- OpenClaw에 봇이 여러 마리 살고 있어서 **단일 장애점**이 신경 쓰이는 분
- 단순 응급조치 말고 **구조적 fix**를 고민 중인 분

> 💡 실제 셋업 절차가 궁금하시다면 → [#15 분리 실전 셋업 + oclaw 운영 도우미](/setup-guides/guide-15-gateway-split-howto)로 바로 가셔도 돼요. 이 편은 "왜 그래야 하는지"를 풀어요.

---

## 사고 — "한 봇 매달리니까 다 멈춰요"

뽀피터스 본진에서 4/29~5/3 사이에 자꾸 같은 패턴이 반복됐어요.

- `stuck-killer` watchdog이 5일 만에 **50번 넘게** 게이트웨이를 강제 재시작
- 슬랙 WebSocket이 **1,418번** 재연결
- 1ms 안에 **7~8개 ws가 동시에 timeout** (한 마리만 죽는 게 아니라 다 같이)
- 게이트웨이 RSS 2.4GB — `memory-watchdog` 임계(2GB) 자주 넘김

증상은 항상 비슷했어요. 뽀야가 답이 안 오기에 슬랙 봇 상태 확인하면 뽀짝이도 끊겨있고, 아롱이도 같이 끊겨있고. **한 마리가 죽은 게 아니라 셋이 동시에 죽은** 거예요.

`gateway.err.log`를 까보면 핵심 단서가 있었어요:

```
[agent/cli-backend] claude live session turn failed
  durationMs=387483
  error=FailoverError
[model-fallback] decision=probe_cooldown_candidate reason=billing
```

`durationMs=387483` — **6.5분 매달림**. 한 봇의 Anthropic 호출이 cooldown 응답 대기로 6.5분 동안 응답을 못 받고 있었어요.

---

## 진짜 원인 — Anthropic cooldown + 이벤트 루프 점유

OpenClaw 게이트웨이는 **하나의 Node.js 프로세스**예요. 이 안에 봇 여러 마리가 들어있고, 각 봇이 슬랙·텔레그램 어댑터를 거느리는 구조죠.

뽀피터스 본진은 한 프로세스에 이렇게 동거 중이었어요:

- 에이전트 **3마리** (뽀야, 뽀짝이, 아롱이)
- 슬랙 어댑터 **8개** (워크스페이스마다 다른 봇)
- 텔레그램 어댑터 **5개**

총 **13개 채널**이 하나의 이벤트 루프를 공유했어요.

### 비유 — 한 책상에 13명이 일하는데

같은 책상에서 13명이 일하고 있다고 생각해 보세요. 한 명이 외부 전화에 6.5분 매달려있으면 어떻게 될까요? 다른 사람들이 "잠깐만요" 하고 다른 일을 하면 될 것 같지만, **사실 다 같은 손**이에요. Node.js의 이벤트 루프는 1개니까요.

슬랙 WebSocket은 **5초 안에 ping을 못 보내면** 슬랙 측이 disconnect를 판정해요. 한 봇의 호출이 매달리면서 이벤트 루프가 점유되면, 그 사이 다른 봇들의 ws ping이 5초 안에 못 나가요. 그래서 **8개 ws가 1ms 안에 동시 timeout** 패턴이 찍힌 거예요.

> 단일 게이트웨이의 본질적 한계 — **한 봇 사고 = 모든 봇 사고**.

---

## 선택 — Hermes로 갈아탈까, 그냥 쪼갤까

문제 정의가 명확해지자 두 가지 선택지가 보였어요.

### 후보 1 — Hermes로 마이그레이션

[Nous Research의 Hermes Agent](https://github.com/NousResearch/hermes-agent)는 2026년 2월 출시된 OpenClaw 대안이에요. 출시 2개월 만에 GitHub 별 100k. 핵심 셀링 포인트가 **"Profile별 프로세스 분리 강제"**라서 우리 문제에 딱 맞아 보였어요.

OpenClaw 안에 `migrate-hermes` 익스텐션이 번들로 들어있는 것도 사용자 유출 시그널이고요.

### 후보 2 — OpenClaw 안에서 쪼개기

근데 자세히 보니 **OpenClaw에도 `--profile <name>` 플래그가 이미 있어요**. CLI help에 명문화돼있죠:

```
--profile <name>     Use a named profile (isolates
                     OPENCLAW_STATE_DIR/OPENCLAW_CONFIG_PATH under
                     ~/.openclaw-<name>)
```

즉 `--profile` 한 번으로 게이트웨이 프로세스를 격리할 수 있는 거예요. Hermes의 셀링 포인트와 똑같은 효과를 OpenClaw 안에서 낼 수 있단 뜻이죠.

### 결정 — OpenClaw로 가되 쪼개기

마이그레이션은 미루고, OpenClaw `--profile`로 가기로 했어요. 이유:

- **이미 깔린 모든 cron/hooks/스킬이 그대로** — 마이그레이션 시 비용 큼
- 학습 루프 같은 Hermes 차별점은 **우리 식 반자동**으로 흡수 가능
- 격리 효과 자체는 OpenClaw 안에서 동일

---

## 장점 — 쪼개면 뭐가 좋아져요?

### 1. 이벤트 루프 격리 (제일 큼)

뽀야가 6.5분 매달려도 뽀짝이/아롱이는 **다른 프로세스의 다른 이벤트 루프**라 무사해요. 슬랙 ws ping도 자기 책상에서만 챙기면 되니까요. **단일 장애점이 사라지는** 게 진짜 효과예요.

### 2. 메모리/CPU 분산

분리 전엔 한 프로세스가 RSS 2.4GB까지 부풀어서 `memory-watchdog`이 자주 트리거됐어요. 분리 후엔:

```
메인 (뽀짝이만) :  940MB
뽀야           :  647MB
아롱이         :  647MB
```

각각 1GB 미만으로 떨어져서 watchdog 임계를 안 넘어요.

### 3. 죽을 때 영향 격리

한 게이트웨이가 crash나도 다른 봇은 무사해요. macOS launchd의 `KeepAlive=true`가 죽은 그 게이트웨이만 자동 재시작하고요. **도미노가 끊긴 거예요**.

### 4. 워크스페이스 watcher 격리 (보너스)

한 봇의 워크스페이스가 커서 fs.watch 폭발해도 다른 봇 영향 없어요. (이건 사실 `skills.load.watch=false`로도 응급 fix 가능한 부수 효과 — 다음 편에서 자세히 풀어요.)

### 5. 멀티계정 가는 길이 열림

각 프로필이 자기 OAuth store를 가져요(`~/.openclaw-<name>/agents/<id>/agent/auth-profiles.json`). 즉 **프로필별로 다른 Anthropic 계정 토큰**을 넣을 수 있어요. 빌링까지 격리하는 길이 열린 거죠 (지금은 단일 계정 공유 중, Phase D로 미룸).

---

## 단점 — 솔직히 어려워지는 것들

분리가 만능은 아니에요. 비용도 있어요.

### 1. 운영 복잡도 ↑

- LaunchAgent plist 3배 (게이트웨이마다 1개)
- 로그 디렉토리 3개 (`~/.openclaw/logs/` + `~/.openclaw-bboya/logs/` + `~/.openclaw-arongi/logs/`)
- watchdog 커버리지 — 기존 `stuck-killer`/`memory-watchdog`은 메인만 봐요. 새 프로필은 `KeepAlive`만 의지

> 💡 운영 단순화는 [`oclaw` 도우미](/setup-guides/guide-15-gateway-split-howto#운영--oclaw-도우미)로 풀 수 있어요. 다음 편에서 같이 다뤄요.

### 2. hooks 라우팅 복잡

OpenClaw의 hooks는 게이트웨이 HTTP 엔드포인트(`/hooks/<path>`)로 들어와서 mappings에 따라 agent에 라우팅되는 구조예요. 게이트웨이를 쪼개면 외부 시스템(Bettermode, 카카오, 채널톡 등)에 박힌 webhook URL을 **다 새 게이트웨이로 바꿔야** 해요. 봇이 hooks 의존이 많을수록(뽀피터스 본진 뽀짝이는 hooks 8개 의존) 분리 비용 큽니다.

### 3. subagents 끊김

OpenClaw `subagents.allowAgents`는 **같은 프로세스 안의 sub-agent**만 spawn 가능해요. 게이트웨이를 쪼개면 이 호출이 깨져요. 우회는 슬랙 멘션으로 부르기. 뽀피터스 본진은 어차피 슬랙 멘션 패턴만 쓰고 있어서 영향 없었어요.

### 4. 메모리 sqlite 분리

각 프로필이 자기 메모리 sqlite를 가져요. 봇 간 메모리 공유 패턴은 어차피 안 되는 구조라 새로운 단점은 아니지만, 분리 시점에 **sqlite 복사를 신중히** 해야 해요(WAL 파일 동기화 타이밍).

---

## 정직한 코멘트 — 분리 효과는 아직 미검증

여기서 솔직하게 말씀드릴게요.

5월 3일 사고 자체만 놓고 보면 — **`skills.load.watch=false` 한 줄로도 풀렸을** 부수 문제(EMFILE)였어요. 게이트웨이를 쪼개지 않아도 그날의 응답 안 오는 증상은 멈출 수 있었죠.

진짜 분리 가치는 **다음 cooldown 사이클**에서 입증돼요. 한 봇이 6.5분 매달려도 다른 봇들은 무사한지. 이건 보통 5시간 단위로 돌아오는 빌링 cooldown을 한 번 겪어봐야 보이는 효과예요.

그래도 우리는 분리로 갔어요. 이유는:

- **EMFILE은 표면 증상**의 한 종류였고, 진짜 패턴(cooldown 매달림 → 도미노)은 **`watch=false`로는 안 풀려요**
- 4/29~5/3 stuck-killer 50회+는 cooldown 매달림 패턴이 진짜로 있었다는 강한 신호
- 분리 자체는 한 번 해두면 다른 사고에서도 영향 격리가 자동

분리 = 단발성 사고 응급조치가 아니라 **구조 개선**이에요. 효과는 다음 사이클에서 보여요.

---

## 정리 — 분리 결정 체크리스트

| 질문 | 분리 가치 |
|---|---|
| 한 게이트웨이에 봇 5마리 이상 동거? | 높음 |
| 한 봇 매달리면 다른 봇도 같이 끊기는 패턴? | 매우 높음 |
| stuck-killer / memory-watchdog 자주 트리거? | 매우 높음 |
| 봇 1~2마리뿐 + 사고 패턴 없음? | 낮음 (운영 복잡도가 더 큼) |
| hooks 의존 봇이 분리 대상? | 비용 큼 (외부 webhook URL 변경 필수) |

체크리스트에서 "분리 가치"가 우세하면 다음 편으로 가시면 돼요.

---

## 다음 편 — 분리 실전 셋업

[#15 분리 실전 셋업 + oclaw 운영 도우미](/setup-guides/guide-15-gateway-split-howto)에서 실제 명령어로 풀어요. 30~60분이면 한 봇 떼어낼 수 있어요.

다루는 것:

- 새 프로필 디렉토리 골격 + agent runtime 복사
- config 변환 Python 스크립트 (응급 룰 `skills.load.watch=false` 미리 박기 포함)
- LaunchAgent plist 작성
- 핸드오버 시퀀스 (메인 백업 → 메모리 sqlite 재복사 → 새 게이트웨이 부팅)
- 함정 1 — EMFILE은 `node_modules` 없어도 발생할 수 있어요
- `oclaw` 운영 도우미 (한글 인자 됨, 비개발자도 OK)

다음 편에서 만나요 🐾
