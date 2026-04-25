---
title: "OpenClaw + Claude API vs Claude CLI — 뭐가 어떻게 다른가"
episode: 1
series: multi-agent
publishedAt: "2026-04-25"
accentColor: "#8B5CF6"
description: "기존 Anthropic API 방식과 Claude CLI 방식의 차이. 모델 호출 한 칸만 바뀌지만, 그 한 칸이 비용·세션·도구·인증을 흔든다."
tags: ["멀티에이전트", "OpenClaw", "Claude CLI", "Claude API"]
token: "밋업"
---

# 00 · Claude API vs Claude CLI — 우리는 왜 CLI 방식을 골랐나

> 🍱 **비유** — 같은 음식 만드는데 "재료 사다 직접 요리(API)" vs "구독한 도시락 가게(CLI)" 차이.
> 둘 다 결국 같은 Claude 모델 쓰는 건 똑같아. 다만 **결제 방식·인증 방식·도구 쓰는 법**이 꽤 달라져.
> 이어지는 ep.2~ep.4 레시피는 전부 **Claude CLI 방식**을 전제로 해.

## ⚡ 한 줄 요약

> **모델 호출 한 칸만 바뀐다. 운영 구조는 거의 같다.**
> 근데 그 "한 칸"이 비용·세션·도구·인증을 다 흔들어. 그래서 비교가 필요한 거야.

## 🏗️ 스택 그림으로 보는 차이

```
공통 상단 (둘 다 동일)
───────────────────────────
 Slack / Telegram / 기타 채널
        ↓
 게이트웨이 (Socket Mode + Events API)
        ↓
 라우터 (bindings type:"route")
        ↓
 에이전트 (페르소나 파일 + MEMORY 자동 주입)
        ↓
 ────────────────── 여기 한 칸 ──────────────────

 [API 방식]                      [CLI 방식]
 provider:                        provider:
   "anthropic/claude-opus-4-7"      "claude-cli/claude-opus-4-7"
        ↓                               ↓
 OpenClaw가 Anthropic SDK로       cli-backend가 `claude` 바이너리 spawn
 직접 Messages API 호출            (warm stdio session, persistent)
        ↓                               ↓
 HTTP POST api.anthropic.com       Claude CLI가 OAuth 토큰으로 같은 엔드포인트 호출
        ↓                               ↓
 Anthropic 서버 (동일)              Anthropic 서버 (동일)
```

**🟰 공통 부분**: 게이트웨이·라우팅·페르소나 파일 주입·hook 시스템·MEMORY 관리 — 전부 똑같음.
**🔀 차이 나는 부분**: 맨 아래 "모델 호출 한 칸"만.

→ 즉, 1마리 → 2마리 → N대 머신으로 가는 운영 구조는 둘 다 동일. 차이는 "어떤 채널로 Claude를 부르냐"뿐.

## 🔍 8가지 항목 비교

### 💰 1. 비용 / 과금 — "종량제 vs 정액제"

| | API 방식 | CLI 방식 |
|---|---|---|
| 과금 모델 | 토큰당 종량 (input $15/M + output $75/M 등) | Claude Pro/Max **구독 고정** ($20~200/월) |
| 한도 | 신용카드 한도까지 | 구독 플랜별 사용량 rate limit |
| 예측 가능성 | 낮음 (트래픽에 비례) | 높음 (월 정액) |
| 에이전트 N마리 | 전부 하나의 API 키 과금 | 에이전트별 OAuth 가능 — 한도 분산 |

**🐱 뽀야 코멘트**: 봇 여러 마리 키울 거면 CLI가 진짜 유리해. 한도 예측 가능하니까. 트래픽이 너무 적거나 너무 많으면 API가 나을 수도.

### 🔑 2. 인증 — "API 키 1장 vs 사원증 N장"

| | API 방식 | CLI 방식 |
|---|---|---|
| 인증 수단 | Anthropic API 키 1개 | 에이전트별 OAuth (access/refresh 토큰) |
| 저장 위치 | `.env`의 `ANTHROPIC_API_KEY` | `~/.openclaw/agents/<id>/agent/auth-profiles.json` |
| 갱신 | 수동 로테이션 | 자동 refresh (expires 타임스탬프) |
| 격리 | 모든 에이전트가 공유 | **에이전트별 완전 격리** |
| 감사 | Anthropic 콘솔의 사용량 통합 | 구독 계정별 분리 가능 |

**🐱 뽀야 코멘트**: API는 한 장의 키를 모든 직원이 공유 → 한 명이 사고 치면 다 영향. CLI는 직원마다 사원증이 따로라 격리 깔끔. 게다가 자동 갱신.

### 💬 3. 세션·대화 관리 — "매번 새로 vs 이어 말하기"

| | API 방식 | CLI 방식 |
|---|---|---|
| conversation 유지 | OpenClaw가 매 호출마다 **messages 배열을 재구성**해서 API에 전달 | Claude CLI가 `--resume <uuid>`로 내부 파일에서 세션 상태 불러옴 |
| 저장 위치 | OpenClaw의 session JSONL | `~/.claude/projects/<cwd-hash>/<uuid>.jsonl` |
| reset 빈도 | 드묾 (OpenClaw가 통제) | 드묾 (2026.4.22의 warm stdio + resume으로 해결됨) |
| 멀티턴 latency | HTTP round-trip × turn 수 | stdin/stdout pipe — 매우 빠름 |

**🐱 뽀야 코멘트**: 한때 CLI 방식이 세션 자꾸 리셋돼서 "방금 깨어났어요" 사고가 자주 났는데, 2026.4.22 업데이트로 해결됨. 이제 둘 다 비슷한 수준.

### 🔧 4. 도구 / Tools — "직접 만든 연장 vs 빌트인 연장세트"

| | API 방식 | CLI 방식 |
|---|---|---|
| 도구 구현 | OpenClaw가 `tool_use` 블록을 파싱해 **OpenClaw 내부에서 실행** | Claude CLI가 자체 도구셋(Bash, Edit, Read, Write, Grep, Glob...) 실행 |
| 도구 승인 | OpenClaw의 permission 시스템 | Claude CLI의 `--permission-mode bypassPermissions` (OpenClaw가 강제) |
| 파일 시스템 접근 | OpenClaw 서버 프로세스 권한 | cwd = 워크스페이스 디렉토리로 격리 |
| MCP 서버 통합 | OpenClaw가 MCP 클라이언트 | Claude CLI가 자체 MCP 클라이언트 |
| 커스텀 도구 개발 | OpenClaw 플러그인 / Tool SDK | Claude CLI slash command / agent SDK |

**🐱 뽀야 코멘트**:
- 도구 실행 주체가 완전히 다르니까 기존 OpenClaw 커스텀 도구가 있으면 **재작성 필요**할 수도
- CLI 방식의 진짜 매력은 **빌트인 연장세트** — Bash/Edit/Read/Grep/Glob 다 그냥 쓰면 됨
- 파일 접근도 cwd로 격리돼서 깔끔

### 🪝 5. Hooks / 컨텍스트 주입 — "포스트잇 자동 붙이기"

| | API 방식 | CLI 방식 |
|---|---|---|
| 프롬프트 변형 hook | OpenClaw의 `before_prompt_build`, `before_dispatch` 등 | Claude CLI의 `UserPromptSubmit` 등 + OpenClaw hook **양쪽 다 사용 가능** |
| 스레드 rehydrate (슬랙 이전 대화) | OpenClaw 플러그인 레벨 | `~/.claude/settings.json`의 글로벌 hook |
| Tool use hook | OpenClaw `before_tool_call`, `after_tool_call` | Claude CLI `PreToolUse`, `PostToolUse` |
| 세션 생명주기 | OpenClaw session lifecycle | Claude CLI `SessionStart`, `SessionEnd` |

**🐱 뽀야 코멘트**: CLI 방식은 hook을 **두 군데서** 박을 수 있어 (OpenClaw + Claude CLI). 강력한데 디버깅 시 "어디서 발동됐지?" 추적이 좀 복잡.

### 📜 6. 페르소나 파일 로딩 — "성격설정서 읽어주기"

| 파일 | API 방식 | CLI 방식 |
|---|---|---|
| `CLAUDE.md` | 없음 (API는 cwd 개념 없음) | Claude CLI가 cwd 기준 자동 로드 |
| `SOUL.md`, `IDENTITY.md`, `USER.md`, `MEMORY.md` | OpenClaw가 system prompt에 자동 주입 | **OpenClaw가 자동 주입** (동일) |
| `TOOLS.md` 등 커스텀 | CLAUDE.md 지시가 없어도 명시적 Read 필요 | CLAUDE.md에 지시해두면 자동 Read |

**🐱 뽀야 코멘트**: SOUL/IDENTITY 같은 핵심 성격설정서는 OpenClaw가 양쪽 다 자동 주입해줌 (이게 OpenClaw의 핵심 매력). CLAUDE.md 같은 부가 파일은 CLI 방식만의 특혜.

### 🎛️ 7. 모델 선택 / 제약 — "메뉴판 자유도"

| | API 방식 | CLI 방식 |
|---|---|---|
| 사용 가능 모델 | Anthropic API의 모든 모델 (Opus/Sonnet/Haiku 전 버전) | Claude Code에서 쓸 수 있는 것만 (Opus/Sonnet 중심, Pro/Max 구독 플랜에 따라) |
| Bedrock / Vertex | API 직접 호출 | 지원 (Claude CLI의 provider config) |
| 모델 스위칭 | 런타임 변경 자유 | 세션 재시작 필요한 경우 있음 |
| 비공개 프롬프트 | 완전 private | 구독 계정에 사용 기록 남음 |

**🐱 뽀야 코멘트**: API가 메뉴판 더 다양해. 모델 자유롭게 골라야 하는 상황이면 API. 단순함 원하면 CLI.

### 📊 8. 로그 / 관측 — "어디까지 보이나"

| | API 방식 | CLI 방식 |
|---|---|---|
| 요청/응답 raw | OpenClaw 로그에 전체 | OpenClaw 로그엔 메타데이터만 (`promptChars=XXX`), 원본은 Claude CLI 내부 |
| 토큰 사용량 | API response에 정확히 포함 | Claude CLI의 `/cost` 커맨드로 확인 |
| 모델 latency | OpenClaw 기준 | cli-backend 기준 (spawn overhead 포함 근데 warm이라 무시 수준) |

## 🤔 그래서 뭘 골라야 해?

### ✅ 이런 상황이면 → Claude CLI

- 개인·팀 단위로 봇 여러 마리 키울 거다 (비용 예측 가능)
- Claude의 내장 도구(Bash/Edit/Read) 그대로 쓰고 싶다
- Pro/Max 구독 한도 안에서 충분히 돌아간다
- 봇마다 OAuth 분리해서 감사·격리하고 싶다
- 슬랙 스레드 rehydrate 같은 hook 패턴(ep.2 STEP 4 참조) 쓸 거다

### ✅ 이런 상황이면 → Claude API

- 엔터프라이즈급 트래픽 (월 구독 한도 넘어감)
- 모델을 자유롭게 골라 써야 한다 (Haiku/Sonnet/Opus 혼용)
- 회사 정책상 Bedrock/Vertex 경유 필수 (※ CLI도 지원하지만)
- Claude 외 모델(GPT, Gemini)을 같은 봇이 번갈아 써야 한다
- 이미 OpenClaw SDK로 만든 커스텀 도구가 잔뜩 있다 (재작성 부담)

### 🔀 뽀피터스 방식 — 하이브리드 (이게 진짜 답)

> **Claude CLI를 메인으로, Codex를 폴백으로** 쓰는 구조. 한도 초과·장애 시 자동 전환.

```json
"model": {
  "primary": "claude-cli/claude-opus-4-7",
  "fallbacks": ["openai-codex/gpt-5.4"]
}
```

이렇게 박아두면 Claude 못 쓸 때 자동으로 Codex가 받아줘. 다만 봇별로 폴백 켜고 끄는 건 [ep.3에서 자세히](./ep-03-two-agents-same-host) — 팀장급 봇은 폴백 끄고 실무 봇만 켜는 식.

## 📦 마이그레이션 체크리스트 (API → CLI)

> 기존에 OpenClaw + API 방식으로 돌리던 분들이 CLI로 옮길 때 보는 체크리스트.

- [ ] OpenClaw **2026.4.22 이상**으로 업그레이드 (warm stdio session 필수)
- [ ] `claude` CLI 설치 + `/login`으로 OAuth 토큰 발급
- [ ] `agents.list[].model.primary`를 `anthropic/claude-opus-4-7` → **`claude-cli/claude-opus-4-7`**로 변경
- [ ] `agents.list[].workspace`가 봇마다 **별도 디렉토리**로 지정돼있는지 확인 (CLI는 cwd 격리 필수)
- [ ] `agents.list[].runtime` 블록에 `type: "acp"` 같은 잔재 있으면 제거
- [ ] 바인딩이 전부 `type: "route"`인지 확인 (`type: "acp"`는 라우터가 안 봐서 사고남)
- [ ] 봇별 `~/.openclaw/agents/<id>/agent/auth-profiles.json` OAuth 로그인
- [ ] 커스텀 OpenClaw 도구 사용 중이면 Claude CLI 도구로 어떻게 대체할지 매핑
- [ ] 슬랙 스레드 rehydrate 필요하면 `~/.claude/settings.json`에 글로벌 hook 설치
- [ ] 봇별 말투 규칙은 **AGENTS.md `## Red Lines`**에 박기 (CLAUDE.md 아니야! ep.2 참조)
- [ ] 게이트웨이 재시작 + 슬랙 멘션 검증 + 로그에 `[agent/cli-backend] live session start` 확인

## 다음 단계

자, 이제 본격 셋업 들어가자 → [ep.2 1마리 출근시키기](./ep-02-single-agent)
