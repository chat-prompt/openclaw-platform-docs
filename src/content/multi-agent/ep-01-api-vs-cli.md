---
title: "OpenClaw + Claude API vs Claude CLI — 뭐가 어떻게 다른가"
episode: 1
series: multi-agent
publishedAt: "2026-04-25"
accentColor: "#8B5CF6"
description: "기존 Anthropic API 방식과 Claude CLI 방식의 차이. 모델 호출 한 칸만 바뀌지만, 그 한 칸이 비용·세션·도구·인증을 흔든다."
tags: ["멀티에이전트", "OpenClaw", "Claude CLI", "Claude API"]
token: "뽀야뽀야"
---

# 00 · OpenClaw + Claude API vs OpenClaw + Claude CLI 비교

> 기존에 OpenClaw를 Anthropic API 키로 돌리던 조직이 Claude CLI 방식으로 옮겨올 때 알아야 할 차이.
> 이 가이드의 01~03 레시피는 전부 **Claude CLI 방식**을 전제로 함.

## 한 줄 요약

> **모델 호출 한 칸만 바뀐다. 운영 구조는 거의 같다.**
> 다만 "한 칸"의 의미(비용·세션·도구·인증)는 꽤 크다.

## 스택 그림으로 보는 차이

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

**공통 부분**: 게이트웨이·라우팅·페르소나 파일 주입·hook 시스템·MEMORY 관리 — 전부 동일.
**차이 나는 부분**: 맨 아래 "모델 호출 한 칸".

## 차이 전수 비교

### 1. 비용 / 과금

| | API 방식 | CLI 방식 |
|---|---|---|
| 과금 모델 | 토큰당 종량 (input $15/M + output $75/M 등) | Claude Pro/Max **구독 고정** ($20~200/월) |
| 한도 | 신용카드 한도까지 | 구독 플랜별 사용량 rate limit |
| 예측 가능성 | 낮음 (트래픽에 비례) | 높음 (월 정액) |
| 에이전트 N마리 | 전부 하나의 API 키 과금 | 에이전트별 OAuth 가능 — 한도 분산 |

**시사점**:
- 트래픽 예측 어렵고 봇 N마리 운영 → **CLI가 유리**
- 트래픽 매우 적거나 (개인 사용) 매우 많음 (엔터프라이즈) → API가 유리할 수도

### 2. 인증

| | API 방식 | CLI 방식 |
|---|---|---|
| 인증 수단 | Anthropic API 키 1개 | 에이전트별 OAuth (access/refresh 토큰) |
| 저장 위치 | `.env`의 `ANTHROPIC_API_KEY` | `~/.openclaw/agents/<id>/agent/auth-profiles.json` |
| 갱신 | 수동 로테이션 | 자동 refresh (expires 타임스탬프) |
| 격리 | 모든 에이전트가 공유 | **에이전트별 완전 격리** |
| 감사 | Anthropic 콘솔의 사용량 통합 | 구독 계정별 분리 가능 |

### 3. 세션·conversation 관리

| | API 방식 | CLI 방식 |
|---|---|---|
| conversation 유지 | OpenClaw가 매 호출마다 **messages 배열을 재구성**해서 API에 전달 | Claude CLI가 `--resume <uuid>`로 내부 파일에서 세션 상태 불러옴 |
| 저장 위치 | OpenClaw의 session JSONL | `~/.claude/projects/<cwd-hash>/<uuid>.jsonl` |
| reset 빈도 | 드묾 (OpenClaw가 통제) | 드묾 (2026.4.22의 warm stdio + resume으로 해결됨) |
| 멀티턴 latency | HTTP round-trip × turn 수 | stdin/stdout pipe — 매우 빠름 |

**시사점**: 2026.4.22 이전엔 CLI 방식의 session reset이 하루 수십 회 터져 이슈였지만, **warm stdio session + resume 도입으로 해결**. 지금은 양쪽 동등 수준.

### 4. 도구 / Tools

| | API 방식 | CLI 방식 |
|---|---|---|
| 도구 구현 | OpenClaw가 `tool_use` 블록을 파싱해 **OpenClaw 내부에서 실행** | Claude CLI가 자체 도구셋(Bash, Edit, Read, Write, Grep, Glob...) 실행 |
| 도구 승인 | OpenClaw의 permission 시스템 | Claude CLI의 `--permission-mode bypassPermissions` (OpenClaw가 강제) |
| 파일 시스템 접근 | OpenClaw 서버 프로세스 권한 | cwd = 워크스페이스 디렉토리로 격리 |
| MCP 서버 통합 | OpenClaw가 MCP 클라이언트 | Claude CLI가 자체 MCP 클라이언트 |
| 커스텀 도구 개발 | OpenClaw 플러그인 / Tool SDK | Claude CLI slash command / agent SDK |

**시사점**:
- 도구 실행 주체가 완전히 다름 → 기존 OpenClaw 커스텀 도구가 있으면 CLI로 옮길 때 **재작성 필요**
- 파일 시스템 접근 격리는 CLI가 깔끔 (cwd 기반)
- Claude CLI의 내장 도구(Bash/Edit/Read)를 활용할 수 있는 게 CLI 방식의 큰 장점

### 5. Hooks / 컨텍스트 주입

| | API 방식 | CLI 방식 |
|---|---|---|
| 프롬프트 변형 hook | OpenClaw의 `before_prompt_build`, `before_dispatch` 등 | Claude CLI의 `UserPromptSubmit` 등 + OpenClaw hook **양쪽 다 사용 가능** |
| 스레드 rehydrate (슬랙 이전 대화) | OpenClaw 플러그인 레벨 | `~/.claude/settings.json`의 글로벌 hook |
| Tool use hook | OpenClaw `before_tool_call`, `after_tool_call` | Claude CLI `PreToolUse`, `PostToolUse` |
| 세션 생명주기 | OpenClaw session lifecycle | Claude CLI `SessionStart`, `SessionEnd` |

**시사점**: CLI 방식은 **hook 레이어가 2개** (OpenClaw + Claude CLI). 강력하지만 디버깅 시 "어디서 발동됐나" 추적 복잡.

### 6. 페르소나 파일 로딩

| 파일 | API 방식 | CLI 방식 |
|---|---|---|
| `CLAUDE.md` | 없음 (API는 cwd 개념 없음) | Claude CLI가 cwd 기준 자동 로드 |
| `SOUL.md`, `IDENTITY.md`, `USER.md`, `MEMORY.md` | OpenClaw가 system prompt에 자동 주입 | **OpenClaw가 자동 주입** (동일) |
| `TOOLS.md` 등 커스텀 | CLAUDE.md 지시가 없어도 명시적 Read 필요 | CLAUDE.md에 지시해두면 자동 Read |

**시사점**: CLI 방식은 **CLAUDE.md 덕에 첫 턴 룰 + 커스텀 파일 지시가 깔끔**. API 방식은 system prompt에 전부 박아야 함.

### 7. 모델 선택 / 제약

| | API 방식 | CLI 방식 |
|---|---|---|
| 사용 가능 모델 | Anthropic API의 모든 모델 (Opus/Sonnet/Haiku 전 버전) | Claude Code에서 쓸 수 있는 것만 (Opus/Sonnet 중심, Pro/Max 구독 플랜에 따라) |
| Bedrock / Vertex | API 직접 호출 | 지원 (Claude CLI의 provider config) |
| 모델 스위칭 | 런타임 변경 자유 | 세션 재시작 필요한 경우 있음 |
| 비공개 프롬프트 | 완전 private | 구독 계정에 사용 기록 남음 |

**시사점**: 모델 고르는 자유도는 API가 높음. CLI는 단순함이 장점.

### 8. 로그 / 관측

| | API 방식 | CLI 방식 |
|---|---|---|
| 요청/응답 raw | OpenClaw 로그에 전체 | OpenClaw 로그엔 메타데이터만 (`promptChars=XXX`), 원본은 Claude CLI 내부 |
| 토큰 사용량 | API response에 정확히 포함 | Claude CLI의 `/cost` 커맨드로 확인 |
| 모델 latency | OpenClaw 기준 | cli-backend 기준 (spawn overhead 포함 근데 warm이라 무시 수준) |

## 언제 어느 방식을 쓰나 — 의사결정 가이드

### ✅ Claude CLI 방식 권장

- 개인·팀 단위 멀티 에이전트 운영 (비용 예측성)
- Claude Code의 내장 도구(Bash/Edit/Read) 활용 필요
- Pro/Max 구독 한도 여유 있음
- 페르소나별 OAuth 분리로 감사·격리 원함
- hook 기반 컨텍스트 주입 패턴 (우리 가이드 04 항목 같은 rehydrate) 활용

### ✅ Claude API 방식 권장

- 엔터프라이즈급 트래픽 (월 구독 한도 초과)
- 모델 자유롭게 스위칭 (특정 버전 Haiku/Sonnet 혼용)
- Bedrock/Vertex 경유가 조직 정책상 필수 (단, CLI도 지원)
- Claude 외 모델(GPT, Gemini)을 같은 에이전트가 번갈아 써야 함
- OpenClaw 자체 도구 SDK로 구현한 커스텀 도구가 많음 (재작성 비용 부담)

### 🔀 하이브리드 (뽀피터스 방식)

- Claude CLI를 **default** 백엔드로 쓰되, **`fallbacks`에 Codex(또는 다른 API)**를 둠
- Claude 한도 초과 / 장애 시 자동 페일오버
- `agents.list[].model.fallbacks: ["openai-codex/gpt-5.4"]` 식으로 설정

## 마이그레이션 체크리스트 (API → CLI)

기존 OpenClaw + API 방식에서 CLI로 옮길 때:

- [ ] OpenClaw **2026.4.22 이상**으로 업그레이드 (warm stdio session 필수)
- [ ] `claude` CLI 설치 + `/login`으로 OAuth 토큰 발급
- [ ] `agents.list[].model.primary`를 `anthropic/claude-opus-4-7` → **`claude-cli/claude-opus-4-7`**로 변경
- [ ] `agents.list[].workspace`가 각 에이전트마다 **별도 디렉토리**로 지정돼있는지 확인 (CLI는 cwd 격리 필수)
- [ ] `agents.list[].runtime` 블록에 `type: "acp"` 같은 잔재 있으면 제거 ([아롱이 이전 경험](https://...) 참고)
- [ ] 바인딩이 전부 `type: "route"`인지 확인 (`type: "acp"`는 레이터가 안 봄)
- [ ] 에이전트별 `~/.openclaw/agents/<id>/agent/auth-profiles.json` OAuth 로그인
- [ ] 커스텀 OpenClaw 도구 사용 중이면 Claude CLI의 어떤 도구로 대체할지 매핑
- [ ] 슬랙 스레드 rehydrate 필요하면 `~/.claude/settings.json`에 글로벌 hook 설치
- [ ] 각 에이전트 CLAUDE.md에 **말투 룰 직접 박기** (글로벌 충돌 방지)
- [ ] 게이트웨이 재시작 + 슬랙 멘션 검증 + 로그에서 `[agent/cli-backend] live session start` 확인

## 다음 단계

본격 세팅 들어가면 → [01-single-agent.md](./01-single-agent.md) (1마리부터)
