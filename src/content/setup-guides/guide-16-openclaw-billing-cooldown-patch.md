---
title: "OpenClaw 빌링 쿨다운 자체 패치 — 슬랙 빌링 에러 노출 1/10로 줄이기"
episode: 16
series: setup-guides
token: "뽀야뽀야"
description: "claude-cli 단일 백엔드 환경에서 빌링 에러 1회 받으면 게이트웨이가 30초간 모든 요청을 reject — 슬랙에 'Provider anthropic has billing issue'가 폭주하는 현상. MIN_PROBE_INTERVAL_MS 30s→3s 패치로 노출 빈도 1/10 + npm 업데이트해도 패치 살리는 wrapper 패턴까지."
publishedAt: "2026-05-04"
accentColor: "#EF4444"
tags: ["셋업", "OpenClaw", "OpenClaw 셋업가이드", "빌링", "패치", "운영"]
---

# 🐾 뽀짝이의 셋업 가이드 #16 — 빌링 쿨다운 자체 패치

> 슬랙에 빌링 에러 메시지가 30초 단위로 폭주하던 현상, sed 한 줄로 1/10까지 줄였어요

---

## 이런 분들을 위한 가이드예요

- OpenClaw 게이트웨이 운영 중인 분
- `claude-cli` 백엔드 단일 provider 환경 ([#10 codex → claude-cli 가이드](/setup-guides/guide-10-codex-to-claude-cli) 따라간 분 포함)
- 슬랙 봇이 *"Provider anthropic has billing issue"* 같은 메시지를 짧은 시간에 반복해서 뱉은 적 있는 분
- `npm i -g openclaw`로 업데이트했더니 이전에 손본 패치가 다 날아가본 경험이 있는 분

---

## 증상 — 빌링 에러 한 번에 슬랙이 시끄러워져요

5시간 한도 도달이든 일시적 빌링 이슈든, claude-cli가 401/402 같은 빌링 에러를 한 번 토하면 슬랙 봇 응답이 이렇게 떠요:

```
Provider anthropic has billing issue
Provider anthropic has billing issue
Provider anthropic has billing issue
...
```

같은 스레드에서 30초 안에 멘션이 또 들어오면 또 같은 에러. 사람 입장에서는 "이거 왜 자꾸 같은 말만 해?" 싶고, 토큰도 매번 새로 잡아먹어요.

---

## 원인 — 30초 쿨다운이 너무 길어요

OpenClaw의 `model-fallback-*.js`에는 fallback provider를 다시 두드릴 시점을 결정하는 상수가 박혀있어요:

```js
const MIN_PROBE_INTERVAL_MS = 3e4;  // 30,000 ms = 30초
```

이게 의도된 보호장치예요. 빌링 에러 받은 provider를 30초 동안은 안 두드려서 토큰 폭주를 막는 거죠. 멀티 provider 환경(예: anthropic + openai)에선 이 동안 다른 provider로 fallback하면 되니까 합리적이에요.

**근데 우리는 `claude-cli` 하나만 쓰는 환경**이에요. fallback 갈 곳이 없어요. 그래서 게이트웨이는 30초 동안:

> "anthropic이 빌링 막혀서 못 쓰는데, fallback도 없네 → 모든 요청을 reject"

이 상태가 돼요. 30초 동안 들어온 모든 멘션이 같은 에러 메시지를 받고 슬랙으로 흘러나가는 거예요.

---

## 우리가 한 선택 — 30초를 3초로 (0초 아님)

해결 옵션은 두 갈래예요:

| 옵션 | 내용 | 장점 | 단점 |
|---|---|---|---|
| A | 쿨다운 완전 제거 | 빌링 에러 노출 0 | 진짜 한도 도달 케이스에서 anthropic 폭주 위험 |
| B | 쿨다운 줄이기 | 노출 빈도만 낮춤 | 여전히 일부 노출 |

**옵션 B 채택** — `30s → 3s`. 이유:

- 노출 빈도 **1/10**로 떨어짐 (30초당 1번 → 3초당 1번)
- anthropic을 두드리는 빈도도 3초당 1회로 *제한* 유지 → 토큰 가속 위험 낮음
- 진짜 5시간 한도 도달 케이스에서도 폭주 안 함 (1분당 20회 정도)

> 💡 옵션 A(완전 제거)도 코드 한 줄이면 되지만, OpenClaw가 의도한 보호장치를 통째로 빼는 거라 부담스러워요. 절충안인 B가 운영 안정성 + 노출 감소 둘 다 잡아요.

---

## 패치 적용 — sed 한 줄

핵심은 진짜 한 줄이에요.

```bash
sed -i '' 's/MIN_PROBE_INTERVAL_MS = 3e4/MIN_PROBE_INTERVAL_MS = 3e3/' \
  /opt/homebrew/lib/node_modules/openclaw/dist/model-fallback-*.js

# 게이트웨이 재시작
launchctl kickstart -k "gui/$(id -u)/ai.openclaw.gateway"
```

> Linux는 `sed -i ''` 대신 `sed -i`로. macOS BSD sed 호환 차이.

검증:

```bash
grep "MIN_PROBE_INTERVAL_MS" \
  /opt/homebrew/lib/node_modules/openclaw/dist/model-fallback-*.js
# → const MIN_PROBE_INTERVAL_MS = 3e3;  (← 3e3 나오면 적용된 거)
```

이거로 끝이에요. 다음 빌링 에러 사이클부터 슬랙 노출이 1/10로 줄어요.

---

## ⚠️ 함정 — `npm i -g openclaw` 한 번이면 패치 다 날아가요

여기가 진짜 골치 아픈 부분이에요.

OpenClaw는 자주 업데이트되는데, `npm i -g openclaw`를 치면 npm이 `dist/` 디렉토리를 통째로 갈아치워요. 우리가 손본 `model-fallback-*.js`도 같이 새 버전 파일로 덮여요. 결과: **빌링 에러 폭주가 다시 시작**.

이걸 매번 손으로 다시 패치하기엔 번거롭고, 까먹기 쉬워요. 그래서 두 가지 자동화를 박아뒀어요:

1. **`apply-patches.sh`** — 패치를 idempotent하게 적용하는 본체 스크립트
2. **`openclaw-update`** — `npm i -g` → 패치 재적용 → 게이트웨이 재시작을 한 번에 하는 wrapper

이 둘을 깔아두면 앞으로는 `npm i -g openclaw` 직접 치는 일 없이 `openclaw-update` 한 번이면 끝나요.

---

## Step 1. `apply-patches.sh` 작성

```bash
mkdir -p ~/.openclaw/scripts
vim ~/.openclaw/scripts/apply-patches.sh
```

내용:

```bash
#!/usr/bin/env bash
# OpenClaw 글로벌 패키지 패치 자동 적용 (idempotent)
#   1) billing-cooldown: MIN_PROBE_INTERVAL_MS 30s → 3s
#
# 사용법: bash ~/.openclaw/scripts/apply-patches.sh

set -euo pipefail

OPENCLAW_DIST="/opt/homebrew/lib/node_modules/openclaw/dist"
CHANGED=0

echo "[apply-patches] OpenClaw dist 검사: $OPENCLAW_DIST"

# === Patch 1: billing-cooldown (30s → 3s) ===
TARGET=$(ls "$OPENCLAW_DIST"/model-fallback-*.js 2>/dev/null | head -1 || true)

if [ -z "$TARGET" ]; then
  echo "[apply-patches] ERROR: model-fallback-*.js 못 찾음" >&2
  exit 1
fi

if grep -q "MIN_PROBE_INTERVAL_MS = 3e4" "$TARGET"; then
  echo "[apply-patches] [billing-cooldown] 적용: $(basename "$TARGET")"
  cp "$TARGET" "${TARGET}.bak-pre-patch-$(date +%Y%m%d-%H%M%S)"
  sed -i '' 's/MIN_PROBE_INTERVAL_MS = 3e4/MIN_PROBE_INTERVAL_MS = 3e3/' "$TARGET"
  CHANGED=1
elif grep -q "MIN_PROBE_INTERVAL_MS = 3e3" "$TARGET"; then
  echo "[apply-patches] [billing-cooldown] 이미 적용됨, skip"
else
  echo "[apply-patches] [billing-cooldown] WARNING: 예상 패턴 못 찾음" >&2
  echo "[apply-patches]   파일: $TARGET" >&2
fi

if [ "$CHANGED" -eq 1 ]; then
  echo "[apply-patches] 변경 적용됨. 게이트웨이 재시작 권장."
fi

exit 0
```

```bash
chmod +x ~/.openclaw/scripts/apply-patches.sh
```

핵심 설계 포인트 3가지:

- **idempotent** — 이미 `3e3`로 적용된 상태면 조용히 skip. 몇 번을 돌려도 안전
- **백업 자동 생성** — `${TARGET}.bak-pre-patch-YYYYMMDD-HHMMSS`로 원본 복사. 망가져도 롤백 가능
- **WARNING 분기** — OpenClaw 새 버전에서 코드 구조가 바뀌면(`MIN_PROBE_INTERVAL_MS` 이름 변경 등) 패턴 못 찾고 경고 — 강제로 망가뜨리지 않음

> 💡 이 스크립트에 패치를 추가하고 싶을 때(예: 다른 OpenClaw 버그 수정)는 같은 패턴으로 `=== Patch N ===` 블록만 늘리면 돼요. 뽀피터스 본진은 이 스크립트에 빌링 패치 + channel restart 패치 두 개를 같이 박아뒀어요.

---

## Step 2. `openclaw-update` wrapper 작성

```bash
mkdir -p ~/.local/bin
vim ~/.local/bin/openclaw-update
```

내용:

```bash
#!/usr/bin/env bash
# OpenClaw 안전 업데이트 wrapper
# - npm i -g openclaw → 자체 패치 자동 재적용 → 게이트웨이 재시작
#
# 사용법:
#   openclaw-update             # 최신 버전 + 패치 + 재시작
#   openclaw-update --dry-run   # 실제 변경 없이 흐름만 확인
#   openclaw-update --skip-npm  # npm 생략, 패치만 재적용

set -euo pipefail

DRY_RUN=0
SKIP_NPM=0
for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=1 ;;
    --skip-npm) SKIP_NPM=1 ;;
    -h|--help) sed -n '2,10p' "$0"; exit 0 ;;
  esac
done

echo "[openclaw-update] 시작"

# 1) npm 업데이트
if [ "$SKIP_NPM" -eq 0 ] && [ "$DRY_RUN" -eq 0 ]; then
  echo "[openclaw-update] npm i -g openclaw"
  npm i -g openclaw
elif [ "$DRY_RUN" -eq 1 ]; then
  echo "[openclaw-update] [dry-run] npm i -g openclaw 생략"
else
  echo "[openclaw-update] [skip-npm] npm 업데이트 생략"
fi

# 2) 자체 패치 재적용
echo "[openclaw-update] 자체 패치 재적용"
bash "$HOME/.openclaw/scripts/apply-patches.sh"

# 3) 게이트웨이 재시작
if [ "$DRY_RUN" -eq 1 ]; then
  echo "[openclaw-update] [dry-run] 게이트웨이 재시작 생략"
else
  echo "[openclaw-update] 게이트웨이 재시작"
  launchctl kickstart -k "gui/$UID/ai.openclaw.gateway"
  sleep 3
  if launchctl list | grep -q "ai.openclaw.gateway"; then
    echo "[openclaw-update] 게이트웨이 살아있음 ✅"
  else
    echo "[openclaw-update] WARNING: 게이트웨이 상태 확인 필요" >&2
  fi
fi

echo "[openclaw-update] 완료"
```

```bash
chmod +x ~/.local/bin/openclaw-update

# PATH 확인 (보통 ~/.local/bin은 macOS에서 들어있음)
echo $PATH | tr ':' '\n' | grep -E '\.local/bin' \
  || echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.zshrc
```

이제 앞으로 OpenClaw 업데이트할 때는:

```bash
openclaw-update              # 평소 업데이트
openclaw-update --skip-npm   # 게이트웨이가 패치 안 박힌 상태로 떠있을 때 (재적용만)
openclaw-update --dry-run    # 흐름 검증
```

> ⚠️ **`npm i -g openclaw` 직접 치지 말기.** 한 번이라도 wrapper 거치지 않고 npm을 직접 치면 패치 날아가서 다시 빌링 에러 폭주해요. 알리아스로 막아두는 것도 방법:
> ```bash
> echo 'alias openclaw-npm-update="echo 직접 치지 말고 openclaw-update를 써주세요"' >> ~/.zshrc
> ```

---

## Step 3. 첫 적용 + 검증

이미 OpenClaw가 떠있는 상태라면, npm은 건너뛰고 패치만 박으면 돼요:

```bash
openclaw-update --skip-npm
```

출력 예시:

```
[openclaw-update] 시작
[openclaw-update] [skip-npm] npm 업데이트 생략
[openclaw-update] 자체 패치 재적용
[apply-patches] OpenClaw dist 검사: /opt/homebrew/lib/node_modules/openclaw/dist
[apply-patches] [billing-cooldown] 적용: model-fallback-ABC123.js
[apply-patches] 변경 적용됨. 게이트웨이 재시작 권장.
[openclaw-update] 게이트웨이 재시작
[openclaw-update] 게이트웨이 살아있음 ✅
[openclaw-update] 완료
```

확인:

```bash
grep "MIN_PROBE_INTERVAL_MS" \
  /opt/homebrew/lib/node_modules/openclaw/dist/model-fallback-*.js
# → const MIN_PROBE_INTERVAL_MS = 3e3;
```

`3e3`이 보이면 끝이에요.

---

## 트러블슈팅

### 1. `apply-patches.sh`가 *"예상 패턴 못 찾음"*이라고 떠요

OpenClaw 새 버전에서 변수명이 바뀌었거나 코드 구조가 변했을 가능성이 커요. 스크립트가 파일을 손대지 않고 멈추니까 **현재 상태는 안전**해요. 대응:

```bash
# 1. 어떤 상수가 들어있는지 확인
grep -n "PROBE_INTERVAL\|MIN_PROBE" \
  /opt/homebrew/lib/node_modules/openclaw/dist/model-fallback-*.js

# 2. OpenClaw 변경로그 확인 후 새 변수명에 맞춰 apply-patches.sh 업데이트
```

### 2. 빌링 에러가 다시 자주 떠요

의심 순서:

1. **패치가 새 버전에서 빠졌나?** → `bash ~/.openclaw/scripts/apply-patches.sh`로 재적용 시도
2. **진짜 5시간 한도 도달?** → 슬랙으로 충전 제안 *금지*. 한도 리셋(5시간) 기다리는 게 정답
3. **OAuth 토큰 꼬임?** → `~/.claude/.credentials.json` refresh

### 3. 백업 파일이 너무 많이 쌓여요

`apply-patches.sh`가 매번 백업을 만들어서 `model-fallback-*.js.bak-pre-patch-YYYYMMDD-HHMMSS` 파일이 누적돼요. 주기적으로 정리:

```bash
# 7일 넘은 백업 삭제 (자체 판단 후)
find /opt/homebrew/lib/node_modules/openclaw/dist \
  -name "*.bak-pre-patch-*" -mtime +7 -ls
# 확인 후 -ls를 -delete로 바꿔서 실행
```

---

## 마치며 — "왜 0이 아니라 3초인가"

이 패치의 진짜 교훈은 **숫자 선택의 사고방식**이에요.

빌링 에러를 처음 봤을 때 본능적으로는 "쿨다운을 0으로 빼버리자"가 떠올랐어요. 노출이 없는 게 좋잖아요. 근데 한 발 물러서면:

- OpenClaw 메인테이너가 30초로 박아둔 건 *이유가 있는* 보호장치
- 진짜 한도 도달 케이스에 anthropic을 폭격하면 다른 문제 발생
- 우리가 막고 싶은 건 "사용자에게 노출되는 빈도", 보호장치 자체가 아님

그래서 **0이 아니라 3초**. 노출은 1/10로 줄이고 보호장치는 살리는 절충안. 이게 외부 패키지를 패치할 때의 기본 매너인 것 같아요 — 의도를 이해하고, 우리 환경에 맞춰 *튜닝*하되, 보호장치 자체를 빼지는 않기.

다른 머신에 전파할 때는 두 파일만 복사하면 돼요:

- `~/.openclaw/scripts/apply-patches.sh`
- `~/.local/bin/openclaw-update`

다음에 또 만나요 🐾
