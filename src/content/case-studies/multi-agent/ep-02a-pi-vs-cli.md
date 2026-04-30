---
title: "심화 · PI vs Claude CLI — OpenClaw 안의 두 갈래, 무엇을 잃고 무엇을 얻나"
episode: 2.5
date: "2026-04-30"
series: case-studies
category: "Slack × Claude CLI 멀티에이전트"
publishedAt: "2026-04-30"
accentColor: "#8B5CF6"
description: "OpenClaw 골랐어도 끝이 아니다 — 그 안에서 PI 모드(빌트인) vs Claude CLI 모드 두 갈래가 또 있다. 우린 CLI 골랐고, 그 결정으로 잃은 것·얻은 것을 공식문서 근거로 정리한다."
tags: ["멀티에이전트", "OpenClaw", "PI", "Claude CLI", "런타임", "심화"]
token: "밋업"
---

# 2.5 · 심화 — PI vs Claude CLI, OpenClaw 안의 두 갈래

> 🐱 **이 편의 핵심** — [ep.2](./ep-02-api-vs-cli)에서 "OpenClaw를 쓴다"고 정했다 해도 *끝이 아니야*. OpenClaw 안에서도 모델을 *어떻게 굴릴지* 두 갈래가 있어 — **PI(빌트인) 모드 vs Claude CLI 모드.** 우린 CLI를 골랐고, 그 결정으로 *잃는 것*과 *얻는 것*이 분명히 갈려. 공식문서 근거로 정리해볼게.
>
> 본 편은 [ep.2](./ep-02-api-vs-cli)과 [ep.3](./ep-03-anatomy) 사이에서 보면 좋은 보충 글. 셋업이 급하면 건너뛰어도 되고, *왜 우리가 CLI를 골랐는지* 진짜로 이해하고 싶으면 여기로 들어와.

---

## 🤔 잠깐 — OpenClaw 골랐는데 또 갈래가 있어?

응, 있어. *어떤 런타임으로 모델을 굴릴지* 봇마다 한 번 더 골라야 해. OpenClaw 공식문서가 두 패밀리로 나눠놨어:

| 패밀리 | 누가 모델 호출하나 | 자격 |
|---|---|---|
| 🔵 **임베디드 하네스 (PI 등)** | OpenClaw가 *직접* Anthropic API에 요청 | Anthropic API 키 |
| 🟢 **CLI 백엔드 (Claude CLI 등)** | OpenClaw가 외부 `claude` 프로세스를 띄우고, *그 CLI가* Anthropic 호출 | Claude CLI 자체 로그인 (Pro/Max OAuth 등) |

설정에선 `agentRuntime.id` 한 줄로 결정:
- `"pi"` → OpenClaw 빌트인 (API 키 필요)
- `"claude-cli"` → 외부 Claude CLI 띄우기 (Pro/Max OAuth 가능) ← **우리가 쓰는 거**

같은 `claude-opus-4-7` 모델이라도 *어느 런타임으로 굴리느냐*에 따라 **자격, 빌링, OpenClaw 통합 깊이가 전부 달라**.

> 📖 **공식문서 발췌 (번역)** — `concepts/agent-runtimes.md`
>
> "**임베디드 하네스**는 OpenClaw의 prepared agent loop 안에서 실행된다. 오늘날 빌트인 `pi` 런타임과 등록된 플러그인 하네스(예: `codex`)가 여기 속한다."
>
> "**CLI 백엔드**는 로컬 CLI 프로세스를 실행하면서 모델 ref는 정식 형태로 유지한다. 예: `anthropic/claude-opus-4-7` + `agentRuntime.id: "claude-cli"`는 *Anthropic 모델을 선택하되, 실행은 Claude CLI를 통해서* 하라는 뜻이다."

---

## 🟢 우린 왜 Claude CLI를 골랐나

[ep.1 변천사](./ep-01-journey)에서 풀었듯, *Pro/Max 정액 빌링 안에서* 다수 봇을 굴리려고. PI 모드는 Anthropic API 키 자격이라 사용량 종량제 — 봇이 늘수록 토큰값도 비례해서 증가. CLI 모드는 *Pro/Max 구독 안에서* 굴러서 정액 안에 들어옴.

근데 단순 빌링 차이만 있는 게 아냐. **OpenClaw 통합 깊이가 갈려.**

---

## ⚠️ Claude CLI로 가면서 *잃는 것*

운영하다 보면 의외로 잃는 거 *하나*야 — **자동 압축이 없음**.

### 컨텍스트 엔진·자동 압축이 OpenClaw 손에서 빠짐

> 📖 **공식문서 발췌 (번역)** — `concepts/agent-runtimes.md` (Runtime ownership)
>
> "**Compaction**: PI는 OpenClaw 또는 선택된 컨텍스트 엔진이 담당. 외부 런타임(예: Codex)은 native compaction에 OpenClaw가 알림과 미러 유지를 곁들임."

PI 모드면 컨텍스트가 길어지면 OpenClaw가 *알아서 압축*해줘. CLI 모드는 그게 *claude CLI 손*으로 넘어가는데, **claude CLI 자체가 자동 압축이 없음**. 그래서 세션이 길어지면 jsonl이 무한 누적되고, `--resume` 시 그 모든 history가 매번 Anthropic으로 전송됨 → 결국 1M 컨텍스트 한도 부딪히거나 빌링 폭주 위험.

[ep.3](./ep-03-anatomy)에서 짚은 *"길어지면 직접 끊어줘야 함"* 한계가 여기서 옴. 우리는 [auto-compact-watchdog 스킬](https://github.com/chat-prompt/bbopters-shared/tree/main/skills/auto-compact-watchdog)로 외부에서 보완 중.

> 💡 *"OpenClaw 도구가 직접 주입 안 된다"는 공식문서 한계 항목도 있는데*, 우리 셋업에선 사실상 안 부딪혀. 이유는 아래 게이트웨이 박스에서.

---

## 🎁 Claude CLI로 가면서 *얻는 것*

잃는 게 있으면 얻는 것도 있어. Claude Code 본체 생태계가 통째로 따라옴.

### 1. Claude Code 자체 훅 (`settings.json`)

**훅이 뭐냐?** — *"이런 일이 일어나면 자동으로 저거 해"* 라고 미리 정해두는 자동화 트리거야. Claude Code는 `~/.claude/settings.json`에 다음 같은 훅 종류를 지원해:

- `SessionStart` — 새 세션 시작 시 자동 실행 (예: 페르소나 파일 로드)
- `UserPromptSubmit` — 사용자가 메시지 보낼 때 자동 실행 (예: 팀 스킬 자동 검색)
- `PreToolUse` / `PostToolUse` — 도구 호출 직전·직후 (예: 위험한 명령 가로채기)

우리 운영의 *실제 동력*들이 다 여기 얹혀 있어 — 매 세션마다 SOUL/IDENTITY/MEMORY 자동 주입, 팀 스킬 검색 가이드 주입, NO_REPLY 토큰 후처리, 페르소나 부팅 분기(뽀짝/뽀야) 등. **PI 모드면 이 생태계 못 씀** — Claude Code 자체 기능이라.

> 🔧 **우리 실제 훅 운영 예 — 토큰 절감 안전망**
>
> 이게 진짜 와닿는 효과야. claude-cli backend는 [자동 압축이 없어서](#-claude-cli로-가면서-잃는-것) 세션 토큰이 무한 누적되는데, 우린 다음 훅·자동화로 강제 차단:
>
> - **`auto-compact-watchdog` 스킬 + cron** — 30분마다 세션 토큰 점검. 1M 한도 80%+ 도달 시 `/compact` 자동 트리거. 빌링 폭주 + 응답 지연 동시 차단.
> - **`PreCompact` / `PostCompact` 훅** — 압축 직전·직후 *어떤 메모리는 살릴지* 자동 결정 (예: MEMORY.md 핵심은 보존)
> - **`UserPromptSubmit` 훅** — 매 프롬프트마다 *그 작업에 필요한 스킬만* 검색 가이드로 주입 → 시스템 프롬프트가 통째로 부풀지 않음
> - **`SessionStart` 훅** — 새 세션마다 페르소나 부팅 파일을 *truncate해서* 임베드 (`bootstrapMaxChars` 한도 적용)
>
> *"훅으로 토큰 절감 강제"* 같은 운영 패턴이 인터넷에 자주 나오는데, 그게 가능한 이유는 *Claude Code 훅 시스템*이 뒤에 있어서야. CLI 모드를 골라야 이 안전망이 다 따라옴.

### 2. Claude Code 네이티브 도구 그대로

**"Anthropic 도구"가 뭐냐?** — 클로드가 *세상을 만지는 손* 역할을 하는 도구 묶음. Anthropic이 Claude Code 본체에 직접 만들어 박아둔 거. 종류:

- `Read` / `Write` / `Edit` — 파일 읽기·쓰기·부분수정
- `Bash` — 터미널 명령 실행
- `Glob` / `Grep` — 파일·내용 검색
- `WebFetch` / `WebSearch` — 웹 가져오기·검색

PI 모드는 OpenClaw가 *비슷한 도구*를 만들어 모델한테 넘겨야 함. CLI 모드는 *Anthropic이 다듬어둔 진품 그대로* 들어와서, 동작이 안정적이고 권한 모드(아래 5번)도 자연스럽게 연결됨.

### 3. `--plugin-dir`로 OpenClaw skills 동적 주입

**스킬 시스템이 두 개 (OpenClaw + Claude Code) — 합쳐서 쓸 수 있나? 우선순위는?**

답: **합쳐서 클로드한테 보임.** OpenClaw가 자기 skills 중 그 에이전트한테 허용된 것만 추려서 *임시 Claude Code 플러그인 형태로 변환*해 `--plugin-dir`로 넘기면, **Claude Code의 native skill resolver가 그걸 자기 skills 같이 인식**.

> 📖 **공식문서 발췌 (번역)** — `gateway/cli-backends.md`
>
> "번들된 Anthropic `claude-cli` 백엔드는 OpenClaw skills 스냅샷을 두 가지 방식으로 받는다 — 시스템 프롬프트에 추가되는 OpenClaw skills 카탈로그, 그리고 `--plugin-dir`로 전달되는 *임시 Claude Code 플러그인*. 플러그인은 해당 에이전트/세션에 적합한 skills만 담고 있어, **Claude Code의 native skill resolver가 OpenClaw가 광고하는 것과 동일한 필터링된 set을 보게 된다**."

**OpenClaw skills 우선순위** (같은 이름 충돌 시 위가 이김):

| # | 위치 | 의미 |
|---|---|---|
| 1 | `<workspace>/skills/` | 그 봇 워크스페이스 전용 (최우선) |
| 2 | `<workspace>/.agents/skills/` | 워크스페이스 안 에이전트 전용 |
| 3 | `~/.agents/skills/` | 머신 단위 개인 에이전트 |
| 4 | `~/.openclaw/skills/` | 머신 단위 공용 |
| 5 | bundled (설치 포함) | OpenClaw 기본 |
| 6 | `skills.load.extraDirs` | 설정으로 추가한 외부 |

> 📖 **공식문서 발췌 (번역)** — `tools/skills.md`
>
> "OpenClaw는 다음 소스에서 skills를 로드한다, **우선순위 높은 순으로**: workspace skills → project-agent → personal-agent → managed/local → bundled → extra dirs. **이름이 충돌하면 가장 높은 소스가 이긴다.**"

우리 셋업 예 — 같은 이름의 `create-issue` 스킬이 워크스페이스(`workspace-bboya/skills/`)에도, 머신 공용(`~/.openclaw/skills/`)에도 있으면 *워크스페이스 것이 이김*. 그래서 봇별로 다르게 굴리고 싶은 스킬은 워크스페이스에 두고, 모두가 똑같이 쓰는 건 공용에 둠.

> 💡 **Claude Code 자체 skills (`~/.claude/skills/`)와 충돌하면?** — OpenClaw가 임시 플러그인으로 주입한 거랑 `~/.claude/skills/` 양쪽이 같은 이름이면 어느 게 이기는지는 OpenClaw docs엔 명시 X. 운영 안전책은 *이름 겹치지 않게 네임스페이스 관리*. 우린 OpenClaw 쪽 skills를 메인으로 쓰고 `~/.claude/skills/`엔 *Claude Code 전용 보조*만 둠.

### 4. Pro/Max 정액 빌링

토큰 종량제 안 박힘. 봇이 N마리든 통화량이 많든 *월 정액*. [ep.1](./ep-01-journey)에서 본 우리 빌링 안전장치의 핵심.

### 5. `--resume` 자체 세션 + `--permission-mode` 그대로

**`--resume`**: Claude Code가 *과거 세션 기억을 jsonl 파일에 누적*해두고, 같은 세션 ID로 다시 부르면 그 history를 다 끌어와서 답함. 슬랙 같은 스레드에서 봇이 *이전 대화 기억하고 답*하는 메커니즘이 이거. (자세한 작동은 [ep.3의 `--resume` 섹션](./ep-03-anatomy) 참조)

**`--permission-mode`**: Claude Code가 *어떤 도구는 자동 실행, 어떤 도구는 사람한테 물어보고 실행*할지 정하는 모드. OpenClaw가 자기 보안 정책(`tools.exec.security`)을 이 모드에 자동 매핑해줘서, 봇이 *위험한 명령은 자동 차단*되고 *안전한 거만 자동 실행*되는 식으로 굴러감.

OpenClaw가 그 위에 얹혀서 슬랙·텔레그램 라우팅만 추가.

---

> 💡 **헷갈리지 말 것 — 다음은 다 그대로 작동해**
>
> **게이트웨이 레이어 (런타임 독립):**
> 웹훅 받기, 크론 잡, 하트비트, 채널 라우팅(슬랙·텔레그램 등) — 다 **OpenClaw 게이트웨이가 처리하는 영역**이라 PI 모드든 CLI 모드든 *똑같이 작동*. *문 앞에서 손님 받는 단계*는 어느 런타임이든 동일.
>
> **OpenClaw 도구 (`sessions_send`, `message`, 크론 추가/삭제 등):**
> 공식문서엔 *"CLI 모드는 OpenClaw 도구가 직접 주입되지 않는다"*고 박혀 있지만, 그 다음 줄에 단서가 있음:
>
> > 📖 **공식문서 발췌 (번역)** — `gateway/cli-backends.md`
> >
> > "OpenClaw 도구는 직접 주입되지 않는다. **다만 `bundleMcp: true`를 켠 백엔드는 루프백 MCP 브릿지로 게이트웨이 도구를 받을 수 있다.** 현재 번들 동작: `claude-cli`는 strict MCP config 파일을 자동 생성한다."
>
> 즉 *"직접 주입은 X지만 MCP 다리로 결국 다 작동"*이고, 우리가 쓰는 `claude-cli` 백엔드는 **번들 플러그인이 `bundleMcp`를 기본값으로 켜둠**. 우리 `~/.openclaw/openclaw.json`에 따로 박지 않아도 자동. 그래서 결과적으론 OpenClaw 도구가 다 작동해.

## 📊 트레이드오프 한 장 요약

| 영역 | 🔵 PI 모드 (빌트인) | 🟢 Claude CLI 모드 (우리 거) |
|---|---|---|
| **자격** | Anthropic API 키 | Pro/Max OAuth |
| **빌링** | 사용량 종량제 | 월 정액 |
| **자동 압축 (compaction)** | ✅ OpenClaw가 함 | ❌ 없음 (운영 주의) |
| **Claude Code 훅 (settings.json)** | ❌ | ✅ 그대로 활용 |
| **Claude Code 네이티브 도구** | ❌ | ✅ Read/Edit/Bash 등 통째로 |
| **`--plugin-dir` skill 주입** | ❌ | ✅ |
| **`--resume` 세션 / `--permission-mode`** | ❌ (PI 자체 시스템) | ✅ Claude Code 그대로 |
| **OpenClaw 도구 (`message` 등)** | ✅ 직접 | ✅ MCP 다리 경유 (자동) |
| **웹훅·크론·하트비트·채널 라우팅** | ✅ | ✅ (런타임 독립) |

---

## 🐱 결론 — 우리는 무엇에 베팅했나

> **"OpenClaw 자체 통합을 일부 잃는 대신, Claude Code 생태계를 풀로 가져온 것"** — 이게 우리 셋업의 정확한 트레이드오프.

PI 쓸 거면 OpenClaw 자체 훅·도구·압축을 풀로 활용하는 셋업이 자연스러워. CLI 쓸 거면 *Claude Code 훅 + skills + settings.json 생태계*를 적극 쓰는 셋업이 자연스러워. 우린 후자에 베팅했고, 그래서 우리 시스템의 *실제 동력*은:

- `~/.claude/settings.json`의 페르소나 부팅 hook
- `~/.claude/skills/`, `bbopters-shared/skills/`의 스킬 라이브러리
- Claude Code의 `--resume` 기반 스레드 기억
- Pro/Max 정액 빌링 안전장치

이게 다 *Claude CLI 모드 덕분에 가능한 것들*이야. 잃는 거 있는 거 알지만, **얻는 게 우리 운영에 더 결정적**이라 이쪽으로 잡았어.

---

## 다음 단계

작동 흐름이 이제 *왜 그렇게 생겼는지* 더 또렷하게 보일 거야 → [ep.3 OpenClaw 작동 흐름](./ep-03-anatomy)으로
