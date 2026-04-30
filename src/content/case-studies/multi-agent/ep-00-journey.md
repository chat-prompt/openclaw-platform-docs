---
title: "OpenClaw 변천사 — 토큰 빌려쓰기, ACP 우회, 그리고 Claude CLI 정식"
episode: 0
date: "2026-04-30"
series: case-studies
category: "Slack × Claude CLI 멀티에이전트"
publishedAt: "2026-04-30"
accentColor: "#8B5CF6"
description: "2026년 4월, 뽀피터스는 두 번 갈아탔다 — 토큰 빌려쓰기 차단 → ACP 우회 → Claude CLI 정식. 본격 셋업 들어가기 전, 어쩌다 지금 모습이 됐는지 시간순으로 풀어보는 프롤로그."
tags: ["멀티에이전트", "OpenClaw", "Claude CLI", "ACP", "변천사"]
token: "밋업"
---

# Prologue · OpenClaw 변천사 — 어쩌다 우리가 Claude CLI로 왔나

> 🛣️ **이 편의 핵심** — 본격 셋업 들어가기 전, OpenClaw가 **어쩌다 지금 모습이 됐는지** 시간순으로 푸는 프롤로그. 2026년 4월에만 두 번 갈아탔어 — 토큰 빌려쓰기 → ACP 우회 → Claude CLI 정식.
> "지금 권장하는 셋업이 왜 이거인지" 맥락이 궁금한 분만. 그냥 셋업부터 들어가고 싶다면 [ep.1 (왜 OpenClaw인가)](./ep-01-api-vs-cli)부터 봐도 OK.

---

## 🕰️ 한 장으로 보는 변천사

```
[~2026.04.03]  ✅ OpenClaw가 Claude Code Max 구독을 직접 사용
                  (서드파티 도구가 OAuth 토큰을 빌려서 Claude API 호출)

[2026.04.04]   🚨 Anthropic이 완전 차단
                  "구독 인증 토큰은 공식 앱에서만 쓸 수 있다"
                  → 서드파티 도구로는 구독 쿼터 사용 불가

[~2026.04.21]  🔀 ACP 우회 시기
                  - 메인 모델: Codex CLI (Codex 구독)
                  - 무거운 작업: ACP로 Claude Code를 sub-agent처럼 borrow
                  - "토큰을 안 빌린다, 프로그램 자체를 실행한다" → 차단 안 됨
                  - 한계: ACP는 single-backend, multi-agent 운영에서 페르소나 혼동·cwd 충돌

[2026.04.22+]  🟢 Anthropic이 Claude Code CLI 사용을 공식 sanctioned
                  → OpenClaw에 `claude-cli/...` provider 정식 추가
                  → API 토큰 없이 Pro/Max 구독으로 직접 spawn (= "지갑 교체")
                  → 멀티에이전트도 cwd 격리로 깔끔
                  → ACP 우회는 한계로 폐기 → `type: "route"` 바인딩으로 정착

[지금]         🐱 뽀피터스 표준 = Claude CLI bridge + route 바인딩 (ACP 빠짐)
```

---

## 📖 시기별 상세 — 우리가 거쳐온 길

### 🍞 첫 시기 — Claude Code Max 구독으로 OpenClaw 돌리기 (~4월 초)

### 어떻게 했나

Claude Code는 월 $200짜리 Max 구독이 있어. 사람이 터미널에서 `claude` 치고 일을 시키는 게 본래 사용법인데, 우리는 거기서 **OAuth 토큰을 뽑아서** OpenClaw가 직접 Anthropic API에 요청 보내는 방식으로 썼어. 즉:

```
사람 → 터미널에서 `claude` 명령
                   ↑ 같은 토큰
OpenClaw → OAuth 토큰 빌려서 → Anthropic API 직접 호출
```

집사 입장에선 $200 정액제 안에서 봇이 무제한 일함. 매력적이었지.

### 왜 막혔나

근데 $200 월정액으로 $3,000~$5,000 어치 일을 돌리는 사람들이 너무 많았어. Anthropic 입장에선 수익 구조가 안 맞아. 그래서:

- **2026.01.09** — 비공식 우회 도구들 대상으로 기술적 제한 시작
- **2026.02.19** — 이용약관 업데이트: "구독 인증 토큰은 공식 앱에서만 사용 가능"
- **2026.04.04** — 완전 시행. **서드파티 도구의 구독 토큰 사용 완전 차단**

집사도 4월 4일 이후 OpenClaw가 갑자기 안 돌아가는 사태를 겪음. 선택지는 두 개:

1. **API 종량제로 전환** — 쓴 만큼 결제. 한 달 $500~$1,000 폭증 예상
2. **다른 방법 찾기** ← 우리는 여기로

---

### 🔀 두 번째 시기 — ACP 우회 (4월 4일 ~ 4월 21일경)

### ACP가 뭔데?

**ACP = Agent Client Protocol** (Zed가 만든 오픈 프로토콜). 이름은 거창한데 핵심은 한 줄:

> 다른 프로그램이 Claude Code를 **대신 실행**해주는 것.

토큰을 빌리는 게 아니라, **공식 프로그램(Claude Code) 자체를 실행**해. Anthropic이 막은 건 "토큰 빌려쓰기"고, "공식 프로그램 실행"은 안 막힘.

```
🚫 차단된 것: 토큰 뽑아서 → 다른 프로그램이 Anthropic API에 직접 요청
✅ 허용된 것: Claude Code 프로그램 자체를 → 그대로 실행 (토큰은 내부 처리)
```

### 뽀피터스의 ACP 셋업

우리는 이렇게 운영했어:

```
[메인 모델 백엔드]      [무거운 코딩·작업 위임]
    ↓                       ↓
Codex CLI              ACP로 Claude Code 띄움
(GPT-5.4, Codex 구독)  (Claude Max 구독 안에서 작동)
```

- **뽀야 같은 메인 비서**: Codex가 처리 (가볍고 빠름)
- **무거운 작업**(파일 읽기, 코드 수정, 분석): ACP로 Claude Code에 위임
- 비유: 뽀야 = 대화 상대 + 작업 배분자, ACP/Claude Code = 실제 손발

이렇게 하면 Claude Max 구독을 **계속 추가비용 0원으로** 활용 가능했어.

### 한계 — 왜 정식 길이 필요했나

ACP는 작동했지만 한계가 있었어:

1. **OpenClaw acpx 플러그인은 single-backend** — 게이트웨이당 ACP 1개만 등록 가능, default agent의 cwd로 묶임
2. **멀티에이전트 운영에서 페르소나 혼동** — default 외 에이전트(뽀짝이 등)는 ACP 사용 시 뽀야 cwd로 spawn → IDENTITY/SOUL 못 읽음, 반말 사고
3. **DM 라우팅에 `DEFAULT_AGENT_ID` 하드코딩 버그** — 텔레그램 DM 봇이 자기 페르소나 못 잡음
4. **Codex가 메인이라 페르소나 톤 뒤틀림** — Codex 특유의 "사전 거절" 패턴이 자주 나옴

자세한 사고 사례: [봇키우기 교실 #13 — CLI bridge는 지갑 교체, ACP는 OS](/notes/bot-school-13-cli-bridge-vs-acp)

---

### 🟢 세 번째 시기 — Claude CLI 정식 sanctioned (4월 22일~)

### 무슨 일이 있었나

Anthropic이 **Claude Code CLI 사용을 공식적으로 승인**했어. 한 LinkedIn 포스트가 이 변화를 이렇게 표현했지:

> "OpenClaw 게이트웨이에 CLI bridge 꽂으면 **API 토큰 없이** Pro/Max 구독으로 에이전트 플릿 전체를 돌릴 수 있다."

### 어떻게 작동하나

OpenClaw가 `claude-cli/...` provider로 **Claude Code 바이너리를 직접 spawn**해. 그게 끝.

```json
"cliBackends": {
  "claude-cli": {
    "command": "/path/to/claude",
    "args": ["-p", "--output-format", "json"],
    "sessionArg": "--session-id",
    "sessionMode": "existing"
  }
}

"model": { "primary": "claude-cli/claude-opus-4-7" }
```

OpenClaw가 `claude -p "..." --session-id <uuid>`를 shell로 실행하고, JSON 응답을 파싱해서 에이전트 답변으로 씀. **모델 호출에 Anthropic API 안 씀** → API 비용 0. Pro/Max 구독 한도 안에서 돌아감.

### 그럼 ACP는? 뽀피터스에선 빠졌어

이론상 ACP는 "OS 역할(스레드 매핑/멀티에이전트 오케스트레이션)을 하는 별도 층"으로 살려둘 수 있어. 근데 OpenClaw의 실제 구현(`acpx` 플러그인)은 **single-backend, default agent의 cwd로 묶임** — 멀티에이전트 환경엔 한계가 명확했어. (자세한 한계: [봇키우기 교실 #13](/notes/bot-school-13-cli-bridge-vs-acp))

뽀피터스는 ACP 우회 시기를 거치며 한계를 다 겪고, 결국 **ACP를 완전히 빼고 `type: "route"` 바인딩으로 대체**했어.

```
[ACP 우회 시기]                    [현재 — CLI 정식]
Slack                               Slack
  ↓                                   ↓
게이트웨이                          게이트웨이
  ↓                                   ↓
ACP (single-backend)               🚫 ACP 안 씀
  ↓                                   ↓
default agent만                    bindings: type:"route"
  ↓                                   ↓
Codex 메인                         claude-cli/... 직접 spawn
  ↓                                   ↓
ACP로 Claude Code borrow           Claude (Opus 4.7)
```

**현재 뽀피터스 라우팅**: 슬랙 메시지 도착 → 게이트웨이가 `bindings` 보고 `accountId → agentId` 매핑 → cli-backend가 그 워크스페이스 cwd로 Claude CLI spawn → OpenClaw가 페르소나 파일 자동 주입 → 응답.

스레드 매핑·멀티에이전트 라우팅은 ACP 없이도 **route 바인딩 + slack-thread-rehydrate hook + 워크스페이스별 cwd 분리**로 다 처리됨. (자세한 셋업은 [ep.2~ep.5](./ep-02-anatomy))

> 🪝 **참고** — 노트 Part 7 결론: "ACP 바인딩만 박고 '왜 내 에이전트가 뽀야로 답하지?' 하는 순간이 온다. 라우터는 `type: 'route'`만 본다. 새 에이전트 심을 땐 route 바인딩부터." 즉 멀티에이전트 운영의 표준 답안은 ACP가 아니라 **route 바인딩**.

### 그럼 진짜 좋아진 건 뭔가

| | ACP 우회 시기 | CLI 정식 시기 |
|---|---|---|
| 메인 모델 | Codex CLI (GPT-5.4) | Claude Opus 4.7 |
| 페르소나 톤 | Codex 톤 뒤틀림 자주 | Claude 자연스러움 |
| 멀티에이전트 | acpx single-backend 한계 | cwd 격리로 깔끔 (각 워크스페이스 독립) |
| 무거운 작업 위임 | ACP sub-agent 필요 | 메인이 Claude니까 굳이 위임 X |
| 셋업 복잡도 | ACP 바인딩 + cwd 패치 | 그냥 `claude-cli/...` provider |
| Codex 폴백 | (Codex가 메인) | 외부 응대 봇은 폴백 끔, 실무 봇만 켬 |

핵심: **메인 모델이 Claude로 돌아왔다**는 게 가장 큰 변화. ACP 우회 시기엔 페르소나 톤 뒤틀림이 잦았는데, CLI 직접 spawn은 자연스러움.

---

## 🤔 그래서 지금 뭘 골라야 해?

### ✅ Claude CLI 방식 (지금 권장 — 이 가이드 시리즈 ep.3~ep.5 전제)

- 개인·팀 단위로 봇 여러 마리 키우는 환경
- Claude Pro/Max 구독 이미 있음
- 멀티에이전트 운영 (각 봇 cwd 격리 필요)
- Codex 톤 뒤틀림 안 겪고 싶음

### 🔶 ACP 우회는 굳이 필요 없음 (역사적 맥락만)

- ACP 우회 시기에 셋업한 환경이 남아있으면 → `type: "route"`로 바인딩 교체하고 ACP 빼는 게 정답
- "모델 호출 한 칸"만 교체하는 거라 라우팅·페르소나·스레드 매핑은 route + hook + cwd 분리로 충분
- ACP는 single-backend 한계 + DM 라우팅 버그 등 굳이 다시 도입할 이유 없음

### 🔵 API 종량제는 언제?

- 엔터프라이즈급 트래픽 (월 구독 한도 초과)
- 모델 자유 스위칭 필요 (Haiku/Sonnet 혼용)
- Bedrock/Vertex 경유 강제 (※ CLI도 일부 지원)
- Claude 외 모델(GPT, Gemini)을 같은 봇이 번갈아 써야 함

### 🔀 뽀피터스 표준 — Claude CLI 단일 백엔드 (4/29부터)

처음엔 Claude CLI를 메인으로, Codex를 폴백으로 두는 하이브리드를 시도했어. 근데 운영해보니 — Codex 폴백이 살아있으면 Claude 한도 빠질 때 자동으로 Codex로 떨어져서 **페르소나 톤이 갑자기 뒤틀림**. 외부 응대 봇은 물론이고 실무 봇도 톤이 깨지는 게 더 큰 사고였어.

그래서 **2026년 4월 29일** 본진(닿 머신)에서 **Codex 폴백 완전 제거**:

- `openclaw.json` 13곳 (각 에이전트 + heartbeat + subagents + auth.order)
- `cron/jobs.json` 25개 잡 model

지금 뽀피터스 표준은 단일 백엔드:

```json
"model": {
  "primary": "claude-cli/claude-opus-4-7",
  "fallbacks": []
}
```

한도 빠지면 차라리 잠깐 멈추는 게 톤 깨지는 것보다 나아. 동시 한도가 모자라면 **Max 200 ×2 계정**으로 분산 운영하는 게 정답.

> 📦 **실전 절차** — codex로 도는 OpenClaw 인스턴스를 옮기는 정식 절차서: [→ guide-10 Codex → Claude CLI 마이그레이션](/setup-guides/guide-10-codex-to-claude-cli)

---

## 📦 마이그레이션 체크리스트 — ACP 우회에서 CLI 정식으로

ACP 시기에 셋업한 환경을 CLI 방식으로 옮길 때:

- [ ] OpenClaw **2026.4.22 이상**으로 업그레이드 (warm stdio session 필수)
- [ ] `claude` CLI 설치 + `/login`으로 OAuth 토큰 발급
- [ ] `agents.list[].model.primary`를 `openai-codex/gpt-5.4` → **`claude-cli/claude-opus-4-7`**로 변경
- [ ] `agents.list[].workspace`가 봇마다 **별도 디렉토리**로 지정돼있는지 확인 (CLI는 cwd 격리 필수)
- [ ] `agents.list[].runtime: { type: "acp" }` 같은 잔재 있으면 제거 (이전 ACP 우회 시기 흔적)
- [ ] **바인딩이 전부 `type: "route"`인지 확인** — `type: "acp"` 바인딩은 라우터가 안 봐서 default fallback 사고 (아롱이 사례 참조)
- [ ] 봇별 `~/.openclaw/agents/<id>/agent/auth-profiles.json` OAuth 로그인
- [ ] 슬랙 스레드 rehydrate 필요하면 글로벌 `~/.claude/settings.json`에 hook 설치
- [ ] 봇별 말투 규칙은 **AGENTS.md `## Red Lines`**에 박기 (post-compaction 재주입 보장)
- [ ] 게이트웨이 재시작 + 슬랙 멘션 검증 + 로그에 `[agent/cli-backend] live session start` 확인

> 📦 **한방 절차서** — 이 체크리스트의 명령어 풀버전(`sed` 치환·검증 grep·롤백까지)은 별도 가이드로: [→ guide-10 Codex → Claude CLI 마이그레이션](/setup-guides/guide-10-codex-to-claude-cli)

---

## 🐱 한 줄 요약

> **2026년 4월 우리는 두 번 갈아탔다 — 토큰 빌려쓰기 → ACP 우회 → CLI 정식.**
> 지금 뽀피터스 표준은 **Claude CLI bridge + `type: "route"` 바인딩** (ACP는 빠짐). 이제 본격 셋업 들어가자.

## 다음 단계

변천사는 여기까지. 본격 셋업으로 가자 → [ep.1 Claude in Slack vs OpenClaw — 우리가 OpenClaw를 쓰는 이유](./ep-01-api-vs-cli)부터 보고 [ep.2 작동 흐름](./ep-02-anatomy)으로
