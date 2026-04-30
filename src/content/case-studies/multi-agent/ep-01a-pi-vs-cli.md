---
title: "심화 · PI vs Claude CLI — OpenClaw 안의 두 갈래, 무엇을 잃고 무엇을 얻나"
episode: 1.5
date: "2026-04-30"
series: case-studies
category: "Slack × Claude CLI 멀티에이전트"
publishedAt: "2026-04-30"
accentColor: "#8B5CF6"
description: "OpenClaw 골랐어도 끝이 아니다 — 그 안에서 PI 모드(빌트인) vs Claude CLI 모드 두 갈래가 또 있다. 우린 CLI 골랐고, 그 결정으로 잃은 것·얻은 것을 공식문서 근거로 정리한다."
tags: ["멀티에이전트", "OpenClaw", "PI", "Claude CLI", "런타임", "심화"]
token: "밋업"
---

# 1.5 · 심화 — PI vs Claude CLI, OpenClaw 안의 두 갈래

> 🐱 **이 편의 핵심** — [ep.1](./ep-01-api-vs-cli)에서 "OpenClaw를 쓴다"고 정했다 해도 *끝이 아니야*. OpenClaw 안에서도 모델을 *어떻게 굴릴지* 두 갈래가 있어 — **PI(빌트인) 모드 vs Claude CLI 모드.** 우린 CLI를 골랐고, 그 결정으로 *잃는 것*과 *얻는 것*이 분명히 갈려. 공식문서 근거로 정리해볼게.
>
> 본 편은 [ep.1](./ep-01-api-vs-cli)과 [ep.2](./ep-02-anatomy) 사이에서 보면 좋은 보충 글. 셋업이 급하면 건너뛰어도 되고, *왜 우리가 CLI를 골랐는지* 진짜로 이해하고 싶으면 여기로 들어와.

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

[ep.0 변천사](./ep-00-journey)에서 풀었듯, *Pro/Max 정액 빌링 안에서* 다수 봇을 굴리려고. PI 모드는 Anthropic API 키 자격이라 사용량 종량제 — 봇이 늘수록 토큰값도 비례해서 증가. CLI 모드는 *Pro/Max 구독 안에서* 굴러서 정액 안에 들어옴.

근데 단순 빌링 차이만 있는 게 아냐. **OpenClaw 통합 깊이가 갈려.**

---

## ⚠️ Claude CLI로 가면서 *잃는 것*

공식문서 `gateway/cli-backends.md`의 **Limitations** 섹션이 솔직하게 써둠.

### 1. OpenClaw 도구가 직접 안 들어감

> 📖 **공식문서 발췌 (번역)** — `gateway/cli-backends.md` (Limitations)
>
> "**OpenClaw 도구는 직접 주입되지 않는다.** OpenClaw는 CLI 백엔드 프로토콜에 도구 호출을 주입하지 않는다. 백엔드는 `bundleMcp: true`를 켰을 때만 게이트웨이 도구를 볼 수 있다."

PI 모드면 OpenClaw가 자기 도구(`sessions_send`, `message`, `cron` 등)를 *모델 컨텍스트에 직접* 박아넣어. CLI 모드는 그게 안 돼 — 우리가 쓰는 `claude-cli` 백엔드는 `bundleMcp: true`가 켜져 있어서 **MCP 루프백 브릿지로 우회**해서 받음. *받긴 하는데 우회임*.

### 2. 컨텍스트 엔진·자동 압축이 OpenClaw 손에서 빠짐

> 📖 **공식문서 발췌 (번역)** — `concepts/agent-runtimes.md` (Runtime ownership)
>
> "**Compaction**: PI는 OpenClaw 또는 선택된 컨텍스트 엔진이 담당. 외부 런타임(예: Codex)은 native compaction에 OpenClaw가 알림과 미러 유지를 곁들임."

claude-cli 백엔드는 codex만큼 native 통합도 없어서 **압축 자체를 OpenClaw가 안 함** — claude CLI에 위임하는데, 그 CLI가 자동 압축이 *없음*. [ep.2](./ep-02-anatomy)에서 짚은 *"길어지면 직접 끊어줘야 함"* 한계가 여기서 옴.

---

## 🎁 Claude CLI로 가면서 *얻는 것*

잃는 게 있으면 얻는 것도 있어. Claude Code 본체 생태계가 통째로 따라옴.

### 1. Claude Code 자체 훅 (settings.json)

`~/.claude/settings.json`의 `SessionStart`, `UserPromptSubmit`, `PreToolUse` 같은 훅이 *그대로* 작동. 우리 페르소나 부팅 hook(매 세션 시작 시 SOUL/IDENTITY/MEMORY 자동 로드), 팀 스킬 자동 검색 hook, NO_REPLY 토큰 처리 등 — 다 Claude Code 훅 시스템에 얹혀 있어. **PI 모드면 이 생태계 못 씀.**

### 2. Claude Code 네이티브 도구 그대로

Read / Edit / Write / Bash / Glob / Grep / WebFetch 등 *Anthropic이 잘 다듬어둔 도구 묶음*이 그대로 들어와. PI도 비슷한 도구를 만들어줄 수는 있지만 *Claude Code 본체 그대로*는 아님.

### 3. `--plugin-dir`로 OpenClaw skills 동적 주입

> 📖 **공식문서 발췌 (번역)** — `gateway/cli-backends.md`
>
> "번들된 Anthropic `claude-cli` 백엔드는 OpenClaw skills 스냅샷을 두 가지 방식으로 받는다 — 시스템 프롬프트에 추가되는 OpenClaw skills 카탈로그, 그리고 `--plugin-dir`로 전달되는 *임시 Claude Code 플러그인*. 플러그인은 해당 에이전트/세션에 적합한 skills만 담고 있어, **Claude Code의 native skill resolver가 OpenClaw가 광고하는 것과 동일한 필터링된 set을 보게 된다**."

→ OpenClaw skills와 Claude Code skill 시스템이 *충돌이 아니라 통합*. 둘 다 살려.

### 4. Pro/Max 정액 빌링

토큰 종량제 안 박힘. 봇이 N마리든 통화량이 많든 *월 정액*. [ep.0](./ep-00-journey)에서 본 우리 빌링 안전장치의 핵심.

### 5. `--resume` 자체 세션 + `--permission-mode` 그대로

Claude Code의 세션 jsonl 누적 + permission mode 시스템이 그대로 적용. OpenClaw가 그 위에 얹혀서 슬랙·텔레그램 라우팅만 추가.

---

> 💡 **헷갈리지 말 것 — 게이트웨이 레이어는 런타임이랑 상관 없어**
>
> 웹훅 받기, 크론 잡, 채널 라우팅(슬랙·텔레그램 등) 같은 건 **OpenClaw 게이트웨이가 처리하는 영역**이라 PI 모드든 CLI 모드든 *똑같이 작동*. 즉 "Claude CLI 쓰면 OpenClaw 웹훅 못 쓰는 거 아냐?" 같은 걱정 안 해도 돼. *문 앞에서 손님 받는 건* 어느 런타임이든 동일하고, *받은 손님 응대를 누가 어떻게 하느냐*만 갈리는 거야.
>
> 위에서 다룬 "잃는 것"은 *받은 후 응대 단계*에 한정된 얘기.

## 📊 트레이드오프 한 장 요약

| 영역 | 🔵 PI 모드 (빌트인) | 🟢 Claude CLI 모드 (우리 거) |
|---|---|---|
| **자격** | Anthropic API 키 | Pro/Max OAuth |
| **빌링** | 사용량 종량제 | 월 정액 |
| **OpenClaw 도구 주입** | ✅ 직접 | ⚠️ MCP 루프백 우회 (`bundleMcp: true`) |
| **자동 압축 (compaction)** | ✅ OpenClaw가 함 | ❌ 없음 (운영 주의) |
| **OpenClaw 플러그인 훅** | 풀 동작 | 일부 제한 (CLI 자체 도구는 외부) |
| **Claude Code 훅 (settings.json)** | ❌ | ✅ 그대로 활용 |
| **Claude Code 네이티브 도구** | ❌ | ✅ Read/Edit/Bash 등 통째로 |
| **`--plugin-dir` skill 주입** | ❌ | ✅ |
| **`--resume` 세션 / `--permission-mode`** | ❌ (PI 자체 시스템) | ✅ Claude Code 그대로 |
| **웹훅·크론·채널 라우팅 (게이트웨이 레이어)** | ✅ | ✅ (런타임 독립) |

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

작동 흐름이 이제 *왜 그렇게 생겼는지* 더 또렷하게 보일 거야 → [ep.2 OpenClaw 작동 흐름](./ep-02-anatomy)으로
