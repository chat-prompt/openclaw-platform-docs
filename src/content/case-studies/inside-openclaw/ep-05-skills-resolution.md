---
title: "스킬은 어디에 박지? — Claude Code 글로벌이 자동 인식되지 않는 이유"
episode: 5
date: "2026-05-01"
series: case-studies
category: "오픈클로 내부 까보기"
publishedAt: "2026-05-01"
accentColor: "#0D9488"
description: "MCP는 자동인데 스킬도 자동이겠지? 아니다. 공식문서가 명시한 *6단계 우선순위*와 *Claude CLI 백엔드 동작*을 정밀하게 풀고, 'extraDirs 한 줄'이 정답인 이유를 박는다."
tags: ["스킬", "Claude CLI", "OpenClaw", "extraDirs", "skill resolver"]
---

# 5 · 스킬은 어디에 박지? — Claude Code 글로벌이 자동 인식되지 않는 이유

> 🛣️ **이 편의 핵심** — *MCP는* `~/.claude/settings.json`에 박으면 OpenClaw가 자동 합쳐. *스킬도* 그러겠거니 했는데 **아니다.** 공식문서를 정밀하게 보면 스킬은 OpenClaw 6경로 안에 들어와야만 봇이 본다. Claude CLI 백엔드여도 마찬가지. 셋업은 한 줄이지만, *그 한 줄이 *없으면* 스킬은 안 보인다.
>
> 📜 *MCP 등록 4가지 길* — [ep.4 MCP 등록 길찾기](./ep-04-mcp-options) 먼저 보고 오면 *왜 스킬은 다른지* 한 번에 이해된다.
>
> 📎 *이 글은 [Claude CLI 도입기 ep.4](../claude-cli/ep-04-skills-resolution)와 동일 본문이야. 두 시리즈 모두에 어울리는 글이라 양쪽에 묶어뒀어.*

---

## 🤔 도입 — "MCP는 자동인데 스킬도 자동 아냐?"

뽀피터스 운영하면서 *진짜로 헷갈렸던* 순간. *MCP 자동 매핑* 메커니즘 — `~/.claude/settings.json`에 박으면 OpenClaw가 알아서 합쳐. 그래서 *스킬도* `~/.claude/skills/`에 박으면 자동으로 봇이 사용할 거라 믿었다.

근데 검증해보니 — **아니다.** 공식문서가 *둘이 다른 메커니즘*이라고 명시. 차이를 모르고 *MCP 직관*으로 스킬을 다루면 *학생한테 잘못 가르친다*.

이 글은 그 차이를 공식문서 근거로 정밀하게 푸는 편이다.

---

## 📜 공식문서 1 — 스킬 우선순위 6단계

`docs/tools/skills.md`:

> *"OpenClaw loads skills from these sources, **highest precedence first**:"*

| #   | Source                | Path                             |
| --- | --------------------- | -------------------------------- |
| 1   | Workspace skills      | `<workspace>/skills`             |
| 2   | Project agent skills  | `<workspace>/.agents/skills`     |
| 3   | Personal agent skills | `~/.agents/skills`               |
| 4   | Managed/local skills  | `~/.openclaw/skills`             |
| 5   | Bundled skills        | shipped with the install         |
| 6   | Extra skill folders   | `skills.load.extraDirs` (config) |

**한국어**: OpenClaw는 위 6개 경로에서 스킬을 로드한다. *이 6개 안에* 들어와야 봇이 인식.

→ 여기 **`~/.claude/skills/`가 *명시적으로 없다*.** *기본값*으로는 OpenClaw가 안 본다는 뜻.

---

## 📜 공식문서 2 — Claude CLI 백엔드도 똑같은 6경로

직관적으론 *Claude CLI 백엔드*는 *Claude Code 자체*를 돌리는 거니까, Claude Code가 *자기 native 위치(`~/.claude/skills/`)*를 알아서 볼 것 같다. 하지만 공식문서는 정반대.

`docs/gateway/cli-backends.md` 라인 164~170:

> *"The bundled Anthropic `claude-cli` backend receives the OpenClaw skills snapshot two ways: the compact OpenClaw skills catalog in the appended system prompt, and a temporary Claude Code plugin passed with `--plugin-dir`. **The plugin contains only the eligible skills for that agent/session**, so Claude Code's native skill resolver sees **the same filtered set that OpenClaw would otherwise advertise in the prompt**."*

**한국어**: claude-cli 백엔드는 OpenClaw가 만든 스킬 스냅샷을 두 가지 방식으로 받는다 — ① 시스템 프롬프트에 추가된 컴팩트 스킬 카탈로그, ② `--plugin-dir`로 넘긴 임시 Claude Code 플러그인. **그 플러그인엔 오직 *eligible*한 스킬만 들어간다.** 그러므로 Claude Code의 native skill resolver는 OpenClaw가 광고하는 것과 *동일한 filtered set*만 본다.

핵심 단어 두 개:
- "**only the eligible skills**" — *eligible* 스킬*만*
- "**the same filtered set**" — OpenClaw가 정한 set과 *동일*

→ **Claude CLI 백엔드여도 Claude Code가 자기 native 글로벌을 *추가로* 가져오지 않는다.** OpenClaw가 6경로로 *eligible* 판정한 스킬만 Claude Code의 resolver가 본다.

---

## 🆚 MCP vs 스킬 — 자동 vs 명시 등록

이 차이가 진짜 헷갈리는 부분이다. MCP 정책과 비교:

| | MCP (`~/.claude/settings.json`) | 스킬 (`~/.claude/skills/`) |
|---|---|---|
| **OpenClaw 자동 매핑?** | ✅ Yes — bundleMcp가 *기존 backend MCP config*와 합침 | ❌ No — 6경로 안에 *명시 등록*해야 함 |
| **공식문서 근거** | "merges them with any existing backend MCP config/settings shape" | "only the eligible skills" + 6경로 표 |
| **Claude CLI 모드 차이?** | 자동 | 6경로 동일, 자동 X |
| **셋업 위치** | `~/.claude/settings.json` 그대로 | `extraDirs`에 *경로 등록* 필요 |

→ **MCP는 bundleMcp 덕분에 *Claude Code 표준 위치*가 곧 OpenClaw 표준. 스킬은 그게 아님.**

---

## ✏️ 정답 — `extraDirs` 한 줄

`~/.openclaw/openclaw.json`에 한 줄:

```jsonc
{
  "skills": {
    "load": {
      "extraDirs": [
        "/Users/<me>/.claude/skills"
      ],
      "watch": true
    }
  }
}
```

이 한 줄이 6번 슬롯(*Extra skill folders*)을 채운다. 그 다음부터:
- `~/.claude/skills/`에 박는 모든 스킬을 봇이 자동 사용
- *Claude Code 단독*에서도 같은 스킬 작동 → *둘이 같은 풀* 공유
- 봇 N마리면 모두 공유 (extraDirs는 *모든 에이전트* 가시)

→ **MCP가 한 줄 셋업도 안 들었다면, 스킬은 한 줄로 끝.** 큰 차이 아님.

---

## 🐱 우리(뽀피터스) 실증

우리 `~/.openclaw/openclaw.json`을 열어보면:

```jsonc
{
  "skills": {
    "load": {
      "extraDirs": [
        "/Users/dahtmad/.openclaw/bbopters-shared/skills",
        "/Users/dahtmad/.claude/skills",                          ← ★ 여기!
        "/Users/dahtmad/Documents/DEV/_work/shared-team-docs/skills"
      ],
      "watch": true
    }
  }
}
```

→ 우리 봇이 Claude Code 스킬을 가져다 쓸 수 있는 **유일한 이유는 두 번째 라인이 등록돼있기 때문**. 만약 이 라인을 *지우면* — 봇은 그 다음 세션부터 `~/.claude/skills/`의 스킬을 *못 본다*.

이게 *기본값 자동*이 아니라 *명시 등록*이라는 증거. 우리도 처음 셋업할 때 한 번 박은 거다.

---

## 🔧 흔한 오해 — *"Claude CLI니까 자동이겠지"*

이 오해가 가장 큰 함정이다. *Claude CLI 백엔드는 결국 Claude Code 자체를 돌리는 거니까* — *Claude Code가 자기 글로벌 알아서 보지 않을까?* 라는 직관.

근데 공식문서가 정확히 그 반대를 명시:

> *"OpenClaw still owns precedence, per-agent allowlists, gating, and `skills.entries.*` env/API key injection."*

**한국어**: OpenClaw가 *우선순위·에이전트 allowlist·gating·env/API key 주입을 여전히 owns한다.* 즉 Claude Code가 *자기 마음대로* 스킬을 끌어오면 안 된다는 뜻.

→ **OpenClaw가 통제하는 set만 봇이 본다.** 자동 추가 없음.

---

## 🐾 삽질 포인트 — 등록 안 하고 작동 안 한다고 헤매는 케이스

워크숍 학생이나 새 머신 셋업 시 가장 흔한 패턴:

1. ❌ Claude Code에 gog 스킬 깔려있음 → 봇한테 "캘린더 보여줘" → "그 기능 없어요"
   - 원인: `extraDirs` 등록 안 함
   - 해결: `~/.openclaw/openclaw.json`에 한 줄 + 게이트웨이 재시작

2. ❌ `extraDirs` 박았는데도 안 됨
   - 원인: 게이트웨이 재시작 안 함 (스킬 스냅샷은 *세션 시작 시 캐시*)
   - 해결: `openclaw gateway restart` + 새 세션

3. ❌ 워크스페이스 `skills/`도 박고 `~/.claude/skills/`도 박음 → 어느 쪽 작동?
   - 6단계 우선순위에서 워크스페이스(1번)가 extraDirs(6번)보다 *위*
   - 같은 이름이면 워크스페이스가 이김

4. ❌ 스킬 폴더에 `SKILL.md` 안 만듦 → OpenClaw가 인식 X
   - 모든 스킬은 폴더 안에 `SKILL.md`(YAML frontmatter + 본문) 필수

---

## 🎨 비유 — Claude Code 사무실에 직원이 들어가는 두 가지 길

- **MCP** = *방문증*. Claude Code가 자기 카드(`~/.claude/settings.json`)를 *공항 입국심사*처럼 통과시킴. OpenClaw가 그걸 *수용*해서 봇한테 그대로 발급. 자동.
- **스킬** = *사내 입사*. Claude Code 글로벌은 *사외*. OpenClaw 사내 인사팀(`extraDirs`)이 그 사람들을 *고용*해야 봇이 일 시킴. 명시 등록 필요.

→ MCP는 *덮어쓰기 합치기*, 스킬은 *경로 채택*. 메커니즘이 다르다.

---

## 🐱 한 줄 요약

> **스킬은 OpenClaw 6경로 안에 들어와야만 봇이 본다.** Claude CLI 백엔드도 동일 — 자동 추가 없음. `~/.openclaw/openclaw.json`의 `extraDirs`에 `~/.claude/skills`를 한 줄 추가하면 *Claude Code 표준 위치 = OpenClaw 표준*이 된다. MCP는 자동이지만 스킬은 명시. 두 메커니즘이 다르다는 걸 *알면* 더 이상 헷갈리지 않는다.

> 📜 *MCP 등록 길찾기* — [Claude CLI 도입기 ep.3](../claude-cli/ep-03-mcp-options)
> 📜 *PI vs Claude CLI 큰 그림* — [Claude CLI 도입기 ep.2](../claude-cli/ep-02a-pi-vs-cli)
> 📜 *어쩌다 지금 셋업이 됐나* — [Claude CLI 도입기 ep.1](../claude-cli/ep-01-journey)

## 다음 단계

다음 편에서는 — 스킬 *우선순위 충돌*이 실제로 어떻게 풀리는지 (workspace vs extraDirs 같은 이름일 때), 그리고 *agent allowlist*로 봇별 스킬 가시성을 다듬는 운영 디테일.
