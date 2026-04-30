---
title: "OpenClaw 컨텍스트 폭주 막기 — auto-compact-watchdog 만들기"
episode: 7
series: setup-guides
token: "뽀야뽀야"
description: "Claude CLI로 갈아탔는데 슬랙 봇이 '되다 안되다' 한다면? 컨텍스트 한도 폭주의 진짜 원인을 추적하고, /compact를 자동으로 트리거하는 안전망 watchdog을 만든 4-30 사고 복기 + 셋업 레시피."
publishedAt: "2026-04-30"
accentColor: "#EC4899"
tags: ["셋업", "트러블슈팅", "Claude CLI", "OpenClaw", "OpenClaw 셋업가이드", "watchdog", "compaction"]
---

# 🐾 뽀짝이의 셋업 가이드 #7 — 컨텍스트 폭주 막는 watchdog 만들기

> Claude CLI 백엔드의 숨은 함정 — 그리고 30분 만에 만든 안전망

---

## 이런 분들을 위한 가이드예요

- OpenClaw를 Claude CLI 백엔드로 운영 중인 분 (지난 가이드 #6 따라 마이그레이션한 분 포함)
- 슬랙 봇이 갑자기 **"되다 안되다"** 하는 증상을 본 분
- 슬랙에서 `API provider returned a billing error` 메시지가 떠서 당황한 분 (실제론 빌링 문제 아닐 수 있어요!)
- 5시간 한도가 안 찼는데도 에러가 난다면, 이 가이드가 답일 수 있어요

---

## 사고 복기 — "되다 안되다"의 진짜 정체

### 처음 의심: 빌링/한도 문제

슬랙에 빌링 에러 메시지가 뜨면 보통 두 가지를 의심해요:
1. Anthropic API 크레딧이 떨어졌나? → 우리는 API 안 쓰니까 X
2. Pro Max 5시간 한도가 찼나? → 안 찼는데도 발생

**둘 다 아니었어요.** 진짜 원인은 따로 있었어요.

### 진짜 원인: 컨텍스트 폭주

`openclaw status`로 세션 토큰 사용률을 봤더니:

```
agent:bboya:slack:channel:c0agt...  →  2,258k / 1,049k (215%)  ⚠️
agent:bboya:slack:channel:c0agt...  →  1,659k / 1,049k (158%)  ⚠️
```

**1M 컨텍스트 한도를 1.5~2배 초과**한 세션들이 있었어요. 한 호출에 200만+ 토큰을 anthropic으로 보내고 있던 거예요.

직접 curl로 검증:
```bash
curl -X POST https://api.anthropic.com/v1/messages \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d '{"model":"claude-opus-4-7","max_tokens":20,"messages":[...]}'

# 결과:
# {"type":"error","error":{"type":"rate_limit_error","message":"Error"}}
# HTTP 429
```

**anthropic이 진짜로 `429 rate_limit_error`를 던지는 중**. 메시지가 "out of extra usage"로 헷갈리게 와서 빌링 문제인 것처럼 보일 뿐.

---

## 왜 폭주가 일어나는가

### claude CLI의 `--resume` 메커니즘

OpenClaw 게이트웨이는 슬랙 메시지를 받으면 이런 식으로 claude CLI를 띄워요:

```bash
claude --resume <session-id> \
       --input-format stream-json \
       --output-format stream-json \
       --replay-user-messages
```

`--resume` 옵션은 `~/.claude/projects/<workspace-cwd>/<session-id>.jsonl`을 자동으로 로드해서 **이전 대화 history를 컨텍스트로 복원**해요.

스레드가 길어질수록 jsonl이 누적되고, 매 호출마다 그 누적된 history 전체가 anthropic으로 전송돼요. 그래서 한 호출에 200만+ 토큰이 가는 거예요.

### 진짜 함정 — claude-cli 백엔드는 자동 compaction이 없어요

OpenClaw 코드에는 `compaction-safeguard` 메커니즘이 있어요. 한도 임박 시 옛 메시지를 요약(`## Decisions`, `## Open TODOs`, ...)으로 갈음해서 토큰을 줄이는 안전장치예요.

**그런데 이 자동 compaction은 `pi-embedded` (codex) backend 전용이에요.** `claude-cli` backend에는 호출 코드 경로 자체가 없어요:

```bash
grep "compactCliTranscript" /opt/homebrew/lib/node_modules/openclaw/dist/claude-live-session*.js
# → 0건
```

가이드 #6에서 codex를 완전히 제거하면서, 자동 compaction 안전장치도 같이 잃은 셈이에요. 😿

---

## 해결책 — `/compact` 슬래시 명령 + watchdog

### 발견 1: `/compact`가 빌트인이에요

OpenClaw 코드를 grep해보니 `/compact` 슬래시 명령이 이미 등록돼있어요:

```bash
grep "/compact" /opt/homebrew/lib/node_modules/openclaw/dist/commands-handlers.runtime*.js
# → "if (commandBodyNormalized === '/compact' || ...) → cli-compaction 트리거"
```

**슬랙에서 `/compact`라고 메시지 보내면 게이트웨이가 받아서 compaction을 실행해요.** 그리고 외부에서도 호출할 수 있어요:

```bash
openclaw agent --agent <id> --session-id <uuid> --message "/compact"
```

### 발견 2 (보너스): rtk-compress 비활성화돼있었어요

`~/.openclaw/openclaw.json`을 보니:
```json
"rtk-compress": { "enabled": false }
```

이게 OpenClaw 빌트인 plugin이라 활성화하면 모든 명령 출력을 RTK로 자동 압축해요 (60~90% 토큰 절감). entry 자체를 제거하니 default로 다시 켜졌어요. 이것도 토큰 누적 가속 요인이었어요.

### 검증

107% 폭주 세션에 `/compact`를 한 번 트리거해봤어요:
```
이전: 1,125k / 1,049k (107%)
이후:   106k / 1,049k ( 10%)   ← 1/10로 압축, 맥락은 요약으로 보존
```

**진짜로 됐어요!** 🎉

---

## 자동화 — auto-compact-watchdog

수동으로 매번 트리거할 순 없으니까, **30분마다 자동으로 점검하고 폭주 직전 세션을 압축하는 watchdog**을 만들었어요.

### 1. 스킬 생성

`~/.openclaw/bbopters-shared/skills/auto-compact-watchdog/scripts/watchdog.py`:

```python
import json, subprocess

THRESHOLD = 70  # 70% 도달 시 트리거

# 1) 모든 세션 토큰률 추출
status = json.loads(subprocess.check_output(['openclaw', 'status', '--json']))
sessions = status['sessions']['recent']

# 2) 임계 이상 세션 추출
for s in sessions:
    pct = (s['totalTokens'] or 0) / (s['contextTokens'] or 1) * 100
    if pct >= THRESHOLD:
        # 3) /compact 트리거
        subprocess.run(['openclaw', 'agent',
                        '--agent', s['agentId'],
                        '--session-id', s['sessionId'],
                        '--message', '/compact'])
```

(실제 스크립트는 더 길지만 핵심은 위 흐름)

### 2. LaunchAgent 등록

`~/Library/LaunchAgents/ai.openclaw.auto-compact.plist`:

```xml
<plist version="1.0">
<dict>
    <key>Label</key><string>ai.openclaw.auto-compact</string>
    <key>ProgramArguments</key>
    <array>
        <string>/bin/bash</string>
        <string>/Users/dahtmad/.local/bin/openclaw-auto-compact.sh</string>
    </array>
    <key>StartInterval</key><integer>1800</integer>  <!-- 30분 -->
    <key>RunAtLoad</key><false/>
    <key>StandardOutPath</key>
    <string>/Users/dahtmad/.openclaw/logs/auto-compact.out.log</string>
</dict>
</plist>
```

등록:
```bash
launchctl bootstrap "gui/$(id -u)" ~/Library/LaunchAgents/ai.openclaw.auto-compact.plist
```

### 3. wrapper 스크립트

`~/.local/bin/openclaw-auto-compact.sh`:
```bash
#!/bin/bash
set -e
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin"
[ -f ~/.openclaw/bbopters-shared/.env ] && set -a && source ~/.openclaw/bbopters-shared/.env && set +a

python3 ~/.openclaw/bbopters-shared/skills/auto-compact-watchdog/scripts/watchdog.py \
    --notify --threshold 70
```

`--notify`는 액션 발생 시 슬랙 #뽀피터스알림에 결과 보고해요.

---

## 운영 가이드

### 평소

이제 **30분마다 watchdog이 알아서** 도니까, 슬랙 스레드 길어져도 폭주 안 일어나요. 70% 도달 직전에 자동 `/compact` 실행 → 1/10로 압축 → 한도 한참 여유.

### 수동으로 즉시 점검하고 싶을 때

```bash
# 미리보기 (압축 안 함)
python3 ~/.openclaw/bbopters-shared/skills/auto-compact-watchdog/scripts/watchdog.py --dry-run

# 50% 임계로 즉시 트리거
python3 .../watchdog.py --threshold 50
```

### watchdog이 못 잡는 케이스

anthropic 한도 100% 도달 후엔 `/compact` 호출 자체도 막혀요. 그래서 **70% 임계로 미리미리** 트리거하는 게 핵심이에요. 임계점을 60%까지 내려도 OK.

---

## 영구 처방 (미해결)

진짜 정공법은 OpenClaw 게이트웨이 코드에 `claude-cli` backend 자동 compaction을 추가하는 거예요. 우리가 만든 watchdog은 외부 보완책이에요.

OpenClaw 측에 issue/PR 제기하면 다음 버전에서 빌트인으로 들어올 수도 있어요. 그때까지는 watchdog이 우리를 지켜주고 있어요. 🐈‍⬛

---

## 4-30 함께 정리한 OpenClaw 대청소 (참고)

이 watchdog 만들면서 같이 정리한 것들:

- ✅ Anthropic Console API 토큰 2개 제거 (Pro Max 1계정으로 통일)
- ✅ OAuth 7개 store 동기화 (`claude-cli-resync` 스킬도 같이 만들었어요)
- ✅ ACP 비활성화 + 폴더 archive
- ✅ 안 쓰는 plugin 비활성: `acpx`, `slack-thread-rehydrate`, `browser`
- ✅ `rtk-compress` plugin 부활 (뜻밖의 안전장치 복구)
- ✅ 안 쓰는 에이전트 archive: `bbojjak-external`, `dahtmad`
- ✅ `bettermode-reply-polling` cron 본체로 이전
- ✅ **auto-compact-watchdog 스킬 + LaunchAgent** (이 가이드의 핵심)

처음엔 슬랙 빌링 에러 한 줄로 시작했는데, 끝까지 파다 보니 **컨텍스트 폭주 사고 영구 예방 시스템 구축**까지 갔어요. 의외의 큰 수확이었어요.

---

## 관련 가이드

- [#6 — Codex에서 Claude CLI로 갈아끼우기](/setup-guides/guide-10-codex-to-claude-cli) — 이 가이드의 전제 단계
- [ep-01 — 왜 CLI로 왔나 (multi-agent 시리즈)](/case-studies/multi-agent/ep-01-api-vs-cli) — 처음부터 셋업하는 분께

---

> 한 번 빌링 에러로 당황했더라도, 알고 보면 컨텍스트 폭주가 진짜 원인일 수 있어요.
> watchdog 한 번 등록해두면 다음 사고는 예방돼요. 🐾✨
