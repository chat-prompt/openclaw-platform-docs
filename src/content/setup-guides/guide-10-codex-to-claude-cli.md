---
title: "오래된 OpenClaw 살리기 — Codex에서 Claude CLI로 갈아끼우기"
episode: 6
series: setup-guides
token: "뽀야뽀야"
description: "OpenClaw가 아직 codex로 돌고 있다면? 모델 백엔드를 Claude CLI로 옮기는 한방 마이그레이션 가이드. 4/29에 뽀피터스 본진이 따라간 절차 그대로."
publishedAt: "2026-04-30"
accentColor: "#8B5CF6"
tags: ["셋업", "마이그레이션", "Claude CLI", "OpenClaw", "OpenClaw 셋업가이드"]
---

# 🐾 뽀짝이의 셋업 가이드 #6 — Codex에서 Claude CLI로 갈아끼우기

> 한 번 깔린 OpenClaw, 백엔드만 갈아끼우는 법

---

## 이런 분들을 위한 가이드예요

- 이미 OpenClaw가 깔려있고 (`~/.openclaw/openclaw.json`이 존재해요)
- 지금 모델이 `openai-codex/gpt-5.4`로 돌고 있는 분
- Claude Pro/Max 구독은 있는데, 아직 백엔드는 못 옮긴 분
- 가능하면 **30분 안에** 끝내고 싶은 분

> 💡 처음부터 OpenClaw 셋업하시는 분이라면 → [ep-01 (왜 CLI로 왔나)](/case-studies/multi-agent/ep-01-api-vs-cli)부터 보시는 게 맥락 잡기 좋아요.

---

## 왜 옮기는 거예요?

자세한 변천사는 [ep-01](/case-studies/multi-agent/ep-01-api-vs-cli)에서 풀었어요. 여기선 짧게:

- ACP 우회 시기엔 **Codex가 메인 모델**, Claude는 sub-agent로 빌려쓰는 구조였어요
- 4/22부터 Anthropic이 **Claude Code CLI 사용을 공식 승인** → API 토큰 없이 Pro/Max 구독으로 직접 spawn 가능
- 메인을 Claude로 옮기면 **페르소나 톤도 자연스럽고**, **API 비용도 0원**이에요

뽀피터스 본진은 4/29에 마이그레이션 끝냈어요 (`openclaw.json` 13곳 + cron 25개). 이 가이드는 그때 따라간 정식 절차서를 외부 공개용으로 정리한 거예요.

---

## 사전 준비

- macOS 또는 Linux
- Anthropic Max 또는 Pro 계정 (해당 머신에서 `claude login` 가능해야 함)
- 노드 환경 (`npm` 사용 가능)

> 💡 **계정 동시 사용 한도** — Max 200 플랜은 동시 ×2까지예요. 봇이 여러 마리거나 여러 머신에 분산돼있으면 별도 계정 또는 머신별 분산 운영을 고려하세요.

---

## Step 1. Claude CLI 설치 + 로그인

```bash
# 설치
npm i -g @anthropic-ai/claude-code

# 로그인 (브라우저 OAuth 플로우 → Pro/Max 계정으로)
claude login

# 동작 확인
claude --version
echo "hi" | claude -p "한 줄로 답해"
```

마지막 줄에서 응답이 짧게 나오면 OK!

---

## Step 2. 백업

언제든 롤백할 수 있게 백업부터 떠두세요.

```bash
cd ~/.openclaw

TS=$(date +%Y%m%d-%H%M%S)
cp openclaw.json openclaw.json.bak.${TS}-codex-removal
cp cron/jobs.json cron/jobs.json.bak.${TS}-codex-removal
```

그리고 OpenClaw 잠시 멈추기:

```bash
# launchd로 띄웠다면
launchctl unload ~/Library/LaunchAgents/com.openclaw.gateway.plist 2>/dev/null

# 직접 띄웠다면 그 프로세스 종료
```

---

## Step 3. `openclaw.json` 패치

### 3-1. claude-cli 인증 프로필 추가

`auth.profiles` 안에 다음 블록을 추가하세요:

```json
"anthropic:claude-cli": {
  "provider": "claude-cli",
  "mode": "oauth"
}
```

### 3-2. `auth.order.anthropic` 갱신

```json
"order": {
  "anthropic": [
    "anthropic:claude-cli"
  ]
}
```

### 3-3. 모든 모델 식별자 일괄 치환

`openai-codex/gpt-5.4` → `claude-cli/claude-opus-4-7`

```bash
# 변경 라인 미리보기
grep -n 'openai-codex/gpt-5.4' ~/.openclaw/openclaw.json

# 실제 치환 (macOS)
sed -i '' 's|openai-codex/gpt-5.4|claude-cli/claude-opus-4-7|g' ~/.openclaw/openclaw.json

# codex 잔재 추가 검색 (fallbacks 등)
grep -n 'codex' ~/.openclaw/openclaw.json
```

> ⚠️ **주의** — `fallbacks` 배열에 codex가 남아있다면 빈 배열(`[]`)로 비우세요. 4/29 결정 사항: **Claude CLI 단일 백엔드 운영**. 한도 빠지면 잠깐 멈추는 게 톤 뒤틀리는 것보다 나아요.

치환 대상 위치 (참고):

- `agents.defaults.model.primary`
- `agents.defaults.models` 키
- `agents.defaults.heartbeat.model`
- `agents.defaults.subagents.model`
- 각 에이전트 엔트리(`agents.entries.<id>.model.primary`)

---

## Step 4. `cron/jobs.json` 패치

cron 잡들도 모델 식별자가 박혀있어요. 같은 치환 적용:

```bash
# 미리보기
grep -c 'openai-codex/gpt-5.4' ~/.openclaw/cron/jobs.json

# 실제 치환
sed -i '' 's|openai-codex/gpt-5.4|claude-cli/claude-opus-4-7|g' ~/.openclaw/cron/jobs.json

# 잔재 검색
grep -n 'codex' ~/.openclaw/cron/jobs.json
```

---

## Step 5. 재기동

```bash
# launchd
launchctl load ~/Library/LaunchAgents/com.openclaw.gateway.plist
launchctl list | grep openclaw

# 직접 실행 방식이면 평소 띄우던 명령어로 재시작
```

---

## Step 6. 검증

세 가지로 확인해요.

### 1) `openclaw doctor`

```bash
openclaw doctor
```

### 2) codex 잔재 grep — 0이 나와야 OK

```bash
grep -rn 'openai-codex' ~/.openclaw/ \
  --exclude-dir=node_modules \
  --exclude='*.bak*' \
  --exclude-dir=_archive \
  --exclude-dir=_backup-* \
  | grep -v 'codex-removal'
```

### 3) 실제 응답 테스트

- 슬랙에서 봇 멘션해서 짧게 한 마디 시켜보기
- 또는: `openclaw agents send <agentId> "오늘 날씨 어때?"`

봇이 자기 페르소나 톤으로 답하면 마이그레이션 완료!

---

## 롤백

문제 생기면 백업으로 돌려요:

```bash
cd ~/.openclaw

# Step 2에서 만든 TS 값으로
cp openclaw.json.bak.<TS>-codex-removal openclaw.json
cp cron/jobs.json.bak.<TS>-codex-removal cron/jobs.json

# 재기동
launchctl unload ~/Library/LaunchAgents/com.openclaw.gateway.plist
launchctl load ~/Library/LaunchAgents/com.openclaw.gateway.plist
```

---

## 트러블슈팅

| 증상 | 원인 후보 | 대응 |
|---|---|---|
| `claude` 명령어 not found | npm 글로벌 경로 미연결 | `npm config get prefix` 확인 후 PATH 추가 |
| 로그인 후에도 응답 없음 | OAuth 토큰 미저장 | `claude login` 다시, 브라우저 콜백 끝까지 대기 |
| OpenClaw가 여전히 codex 호출 | sed 치환 누락 | `grep -rn 'openai-codex' ~/.openclaw/` 다시 |
| 답변은 오는데 너무 느리거나 짤림 | 동시 사용량 한도 | Max 플랜 동시 한도 확인 (Max 200은 ×2) |

---

## 한 줄 요약

> **OpenClaw가 codex로 돌고 있다면, 30분이면 Claude CLI로 갈아끼울 수 있어요.** 백업 → claude login → sed 두 번 → grep 검증 → 끝.

## 다음 단계

- 처음 셋업이라면 → [ep-02 1마리 출근시키기](/case-studies/multi-agent/ep-02-single-agent)
- 변천사 맥락이 궁금하면 → [ep-01 우리가 Claude CLI로 온 이야기](/case-studies/multi-agent/ep-01-api-vs-cli)
