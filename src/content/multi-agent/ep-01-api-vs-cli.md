---
title: "ACP 우회 시기를 지나 — 우리가 Claude CLI 방식으로 넘어온 이야기"
episode: 1
series: multi-agent
publishedAt: "2026-04-25"
accentColor: "#8B5CF6"
description: "구독 차단 → ACP 우회 → 정식 CLI 지원. 뽀피터스가 거쳐온 OpenClaw 백엔드 변천사와 지금 CLI 방식이 권장되는 이유."
tags: ["멀티에이전트", "OpenClaw", "Claude CLI", "ACP", "구독 차단"]
token: "밋업"
---

# 00 · 어쩌다 우리는 Claude CLI로 왔나 — OpenClaw 백엔드 변천사

> 🛣️ **이 편의 핵심** — 그냥 "API vs CLI 비교"가 아니야. 우리가 **2026년 4월 구독 차단 사건**부터 **ACP 우회 시기**를 거쳐 **최근 CLI 정식 지원**으로 넘어온 흐름을 짚는 편.
> 이 맥락을 알아야 ep.2~ep.4의 셋업 이유가 이해돼.
> 비개발자 닿도 따라올 수 있게 시간순으로 풀게.

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
                  → ACP는 OS 역할(스레드 매핑/오케스트레이션)로 여전히 살아있음

[지금]         🐱 뽀피터스 표준 = Claude CLI bridge + (필요시 ACP는 그대로)
```

---

## 🍞 첫 시기 — Claude Code Max 구독으로 OpenClaw 돌리기 (~4월 초)

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

## 🔀 두 번째 시기 — ACP 우회 (4월 4일 ~ 4월 21일경)

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

## 🟢 세 번째 시기 — Claude CLI 정식 sanctioned (4월 22일~)

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

### ACP는 빠지나? 아니야.

여기서 흔한 오해 — "그럼 ACP 빼도 되겠네?"

**❌ 아니야**. CLI bridge는 **모델 호출 한 칸**만 바뀐 거고, 위의 게이트웨이/라우팅/페르소나 주입/스레드 매핑은 다 그대로:

```
Slack 스레드 (또는 Telegram, KakaoTalk, 웹훅)
    ↓
게이트웨이 (요청 수신, 인증, 라우팅)
    ↓
ACP (스레드↔에이전트 매핑, 멀티에이전트 오케스트레이션)  ← 여전히 살아있음
    ↓
에이전트 (뽀야, 뽀짝이, 닿플갱어)
    ↓
모델 호출 백엔드   ← 🎯 CLI bridge가 여기 한 칸만 바꿈
    ↓
Claude (Opus/Sonnet)
```

ACP가 빠지면 **슬랙 스레드 답글 매핑·멀티에이전트 위임·툴 승인·채널 라우팅** 같은 게 다 사라져. CLI bridge는 "지갑 교체", ACP는 "OS" — 둘은 다른 층의 일.

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

### ✅ Claude CLI 방식 (지금 권장 — 이 가이드 시리즈 ep.2~ep.4 전제)

- 개인·팀 단위로 봇 여러 마리 키우는 환경
- Claude Pro/Max 구독 이미 있음
- 멀티에이전트 운영 (각 봇 cwd 격리 필요)
- Codex 톤 뒤틀림 안 겪고 싶음

### 🔶 ACP 우회는 언제 써?

- 어떤 이유로든 Claude CLI를 못 쓸 때 (sanctioned 정책 변경 시)
- 무거운 분석·코딩 작업을 별도 cwd에서 격리하고 싶을 때 (sub-agent 패턴)
- 단, 멀티에이전트면 default agent만 ACP에 탈 수 있다는 한계 인지 필요

### 🔵 API 종량제는 언제?

- 엔터프라이즈급 트래픽 (월 구독 한도 초과)
- 모델 자유 스위칭 필요 (Haiku/Sonnet 혼용)
- Bedrock/Vertex 경유 강제 (※ CLI도 일부 지원)
- Claude 외 모델(GPT, Gemini)을 같은 봇이 번갈아 써야 함

### 🔀 뽀피터스 하이브리드 — Claude CLI 메인 + Codex 폴백 (역할별 차등)

```json
// 뽀야 (집사 직속 팀장) — 폴백 끔. 톤 뒤틀림이 위험
"model": { "primary": "claude-cli/claude-opus-4-7", "fallbacks": [] }

// 뽀짝이 (실무 전담) — 폴백 켬. 멈추면 수강생 피해
"model": { "primary": "claude-cli/claude-opus-4-7", "fallbacks": ["openai-codex/gpt-5.4"] }
```

봇 역할에 따라 폴백 켜고 끄는 패턴. 자세한 건 [ep.3 (2마리 셋업)](./ep-03-two-agents-same-host)에서.

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

---

## 🐱 한 줄 요약

> **CLI bridge는 지갑 교체. ACP는 OS. 2026년 4월 우리는 지갑을 두 번 바꿨다 — 토큰 차단 → ACP 우회 → CLI 정식.**
> 다음 편부터 본격 셋업 들어간다.

## 다음 단계

자, 이제 본격 셋업 들어가자 → [ep.2 1마리 출근시키기](./ep-02-single-agent)
