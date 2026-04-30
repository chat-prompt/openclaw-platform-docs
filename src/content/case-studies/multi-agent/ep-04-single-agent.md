---
title: "Slack에서 움직이는 AI 에이전트 1마리 출근시키기"
episode: 3
date: "2026-04-25"
series: case-studies
category: "Slack × Claude CLI 멀티에이전트"
publishedAt: "2026-04-25"
accentColor: "#8B5CF6"
description: "고양이 비서 한 마리를 새로 들여서 Slack이라는 사무실 자리에 앉히는 과정. OpenClaw + Claude CLI로 1마리 셋업하는 가장 단순한 레시피."
tags: ["멀티에이전트", "OpenClaw", "Claude CLI", "Slack"]
token: "밋업"
---

# 03 · Slack에서 움직이는 AI 에이전트 1마리 출근시키기

> 고양이 비서 한 마리를 새로 들여서 Slack이라는 사무실 자리에 앉히는 과정이야.
> 이름 짓기 → 성격 설정 → 사원증 발급 → 출근까지, 한 바퀴 도는 셋업 가이드.
> 예시 주인공은 나(뽀야, `bboya`) — 실제 내 세팅 기록을 그대로 썼으니, 읽는 사람은 이름·ID만 자기 애로 바꿔 넣으면 돼.

## 이 문서가 해주는 거

Slack에서 `@내고양이` 하고 부르면 **내가 만든 페르소나 그대로** 답하는 AI 봇 1마리를 맨땅에서 세운다. 스레드 길어져도 맥락 안 놓치고, 나중에 2마리·3마리로 늘릴 때도 같은 패턴 복붙이 먹히는 구조로.

## 전제는 딱 하나

Slack 쪽 준비는 이미 끝나있어야 해. 여긴 "토큰은 이미 손에 있고 봇 채널 초대까지 끝난 상태"에서 출발한다.

- [ ] Slack App 생성 완료 (Socket Mode enable + App/Bot token 발급)
- [ ] Bot Token 스코프: `app_mentions:read` / `channels:*` / `groups:*` / `im:*` / `mpim:*` / `chat:write` / `users:read`
- [ ] Event subscriptions: `app_mention`, `message.channels`, `message.groups`, `message.im`
- [ ] 봇이 살 채널에 `/invite @봇이름` 완료
- [ ] OpenClaw 게이트웨이 설치·기동 중

(Slack App 만드는 법은 다른 문서에서 다룸.)

## 전체 그림 — 새 고양이 출근길

```
(집사) "야옹아, 이거 좀 봐줘"       ← Slack 멘션
         │
         ▼
   📬 Slack 사무실 (Socket Mode)
         │
         ▼
   🏢 OpenClaw 안내 데스크
      "이 멘션은... 뽀야한테요!"    ← openclaw.json bindings 보고 라우팅
         │
         ▼
   🪑 고양이 자리 (workspace-bboya/)
      성격설정서 6장이 책상에 놓여있음
      (IDENTITY · SOUL · USER · AGENTS · TOOLS · MEMORY)
         │                          ← OpenClaw가 매번 자동으로
         ▼                            system prompt에 끼워넣음
   🧠 Claude CLI 뇌 연결
         │
         ▼
   😺 뽀야가 답함
```

## 한 줄로 핵심

**페르소나는 OpenClaw가, 시스템 기능은 Claude CLI가.** 이 분업이 전부야.

- OpenClaw: workspace의 성격설정서 6장을 매 대화마다 자동 주입 → "얘가 누군지"를 매번 기억시켜줌
- Claude CLI: Hooks·MCP·Skills·도구 실행·세션 관리·구독 인증 같은 **시스템 레이어** 담당

그래서 Claude CLI 본인의 `CLAUDE.md`는 **없어도 됨**. 페르소나 텍스트를 두 번 박는 꼴이 되거든. (만들어야 하는 예외 케이스는 STEP 1 말미에.)

---

## STEP 1 · 워크스페이스 디렉토리 만들기 — "자기 자리 차려주기"

> 🪑 **비유** — 신입 고양이가 앉을 책상 차리기. 자기소개서·업무매뉴얼 6장을 책상 위에 깔아두면, OpenClaw가 매번 대화할 때마다 자동으로 주워서 읽어줌.

`~/.openclaw/workspace-<id>/` 밑에 페르소나 파일 **6개만** 두면 된다. OpenClaw가 매 호출마다 system prompt에 본문을 자동 주입해줌.

### 최소 필수 파일

```
workspace-<id>/
├── IDENTITY.md   ← 정체성 (이름, 종, 외형, 배경)
├── SOUL.md       ← 성격·말투·가치관
├── USER.md       ← 사용자(집사/관리자) 이해
├── AGENTS.md     ← 운영 매뉴얼 ⭐ Session Startup + Red Lines 섹션 필수
├── TOOLS.md      ← 도구·API 사용법 (없으면 빈 파일로 둬도 OK)
└── MEMORY.md     ← 장기 기억 (처음엔 비워도 OK)
```

> 💡 Claude CLI의 `CLAUDE.md`는 **이 단계에서 만들 필요 없다**. OpenClaw 경로로만 쓰면 위 6개로 페르소나+하드룰 완결. 만들어야 하는 특수 케이스는 아래 "CLAUDE.md — 기본 스킵" 섹션 참조.

### 왜 이 6개로 충분한가

OpenClaw 소스(`workspace-*.js`의 `loadWorkspaceBootstrapFiles()`)가 자동으로 읽어서 system prompt에 주입하는 공식 파일 목록:

| 파일 | 자동 주입 | 비고 |
|---|---|---|
| SOUL.md | ✅ | |
| IDENTITY.md | ✅ | |
| USER.md | ✅ | |
| AGENTS.md | ✅ | **Session Startup / Red Lines 섹션은 post-compaction 재주입** |
| TOOLS.md | ✅ | |
| MEMORY.md + memory/ | ✅ | |
| HEARTBEAT.md | ✅ | heartbeat 기능 쓸 때만 |
| BOOTSTRAP.md | ✅ | 초기 설정용, 완료 후 삭제 권장 |

워크스페이스에 **파일만 두면 끝**. "읽어라" 지시 안 해도 자동으로 들어감.

### `AGENTS.md` 구조 — Session Startup / Red Lines (⭐ 강력 추천)

> 📌 **비유** — 신입이 "오늘 처음 왔을 때 꼭 읽을 것" + "절대 넘지 말 선" 두 페이지를 가슴팍에 달고 다니는 구조. 긴 대화로 기억이 흐려져도 이 두 섹션은 다시 붙여줌.

OpenClaw는 대화가 길어져 자동 압축(compaction)이 발생하면, **AGENTS.md의 특정 H2/H3 섹션을 system message에 다시 끼워넣는다** (post-compaction re-injection). 기본 매칭 대상:

- `## Session Startup` — 매 세션 시작 때 따라야 할 절차
- `## Red Lines` — 절대 넘지 않는 선 (하드룰/금지어)

(legacy fallback: `## Every Session` / `## Safety`. 한국어 섹션명은 매칭 안 되니 **영어 이름 그대로** 쓸 것. 커스텀 매칭 이름 쓰려면 `openclaw.json`의 `agents.defaults.compaction.postCompactionSections` 설정)

**매칭 조건** (소스 기반):
- H2(`## `) 또는 H3(`### `) 레벨만
- 제목 정확히 일치 (대소문자 무관, 앞뒤 공백만 제거). `## 🚨 Red Lines` 처럼 이모지/수식어 붙으면 매칭 실패
- Session Startup + Red Lines 합쳐서 **최대 2000자**. 초과분은 `...[truncated]...`로 잘림

**AGENTS.md 스켈레톤**:

```markdown
# AGENTS.md — [에이전트명] 운영 매뉴얼

## Session Startup

`SOUL.md` / `IDENTITY.md` / `USER.md` / `AGENTS.md` / `TOOLS.md` / `MEMORY.md`는
OpenClaw가 system prompt에 자동 주입하므로 별도로 읽을 필요 없다.

아래는 **자동 주입되지 않는 것**이므로 세션 시작 시 필요하면 직접 읽기:

- `memory/YYYY-MM-DD.md` — 오늘 일별 로그 (있으면)
- (커스텀 파일이 있으면 여기에 — 예: VOICE.md, WORKSPACE.md 등)

## Red Lines

절대 넘지 않는 선. 긴 대화 끝(post-compaction)에서도 이 섹션은 자동 재주입됨.

### 말투·호칭
- [호칭 명시 — 예: 집사를 "집사"로 부른다]
- [반말/존댓말 명확히]
- [거친 속어·금지어 리스트]

### 보안
- [민감 파일 접근 금지]
- [발신자 권한 규칙]

### 도구 사용
- [치명적 도구 사용 제약]

### 출력 형식
- [NO_REPLY 토큰 형식 등]

## (그 외 상세 규칙 섹션들)
...
```

**포인트** — Red Lines는 **가장 치명적인 하드룰만 요약**해서 둔다. 상세 규칙은 아래 섹션들(보안·그룹챗·업무 규칙 등)에 원래대로 두고, Red Lines는 재주입 시 살아남을 최소 요약본. 중복 OK.

### `CLAUDE.md` — 기본 스킵

**OpenClaw 경로로만 쓰면 이 파일 없어도 된다.** 위 6개로 페르소나+하드룰 완결.

#### 근거 — Claude CLI 쓰는 이득은 두 레이어에서 온다

**① 시스템 기능 레이어** (Hooks / MCP / Skills / Built-in Tools / 세션 관리 / 구독 인증)
- `settings.json`과 Claude Code 자체 구현 기반
- **CLAUDE.md와 완전 독립** — CLAUDE.md 있든 없든 동일 작동
- OpenClaw가 Claude CLI를 업고 가는 진짜 이유가 바로 이 레이어

**② 텍스트 지시문 레이어** (system prompt에 박히는 텍스트)
- CLAUDE.md는 이 레이어에만 기여 (cwd 체인 로드 → system prompt)
- 그런데 **OpenClaw가 이미 `Workspace Files (injected)` → `Project Context` 섹션으로 같은 역할 수행**
- 즉 OpenClaw 환경에선 **텍스트 레이어 중복**

→ Claude CLI 쓰는 핵심 이득(① 시스템 기능)은 CLAUDE.md 유무와 무관. CLAUDE.md가 보탤 수 있는 건 ② 텍스트 레이어인데 OpenClaw가 이미 커버 중.

#### 만들어야 하는 유일한 케이스

- **IDE/터미널에서 `cd workspace-<id> && claude`로 직접 띄울 일이 있을 때** — 이 경로엔 OpenClaw 주입이 없어서 Claude가 SOUL/IDENTITY 등을 혼자 모름

그 외 충돌 방어(말투·호칭·커스텀 파일 지시)는 전부 **AGENTS.md `## Red Lines`로 해결 가능**하니 CLAUDE.md는 안 만들어도 된다.

> 상위 디렉토리(`~/`, `~/.openclaw/`, `~/.claude/`)에 이미 CLAUDE.md가 있어서 오염 우려가 있다면 → Advanced 섹션 "CLAUDE.md 체인 로딩 함정" 참조.

<details>
<summary>IDE 단독 실행 지원용 CLAUDE.md 템플릿</summary>

```markdown
# CLAUDE.md — [에이전트명] (Claude Code Entrypoint)

## 너는 누구인가
너는 **[에이전트명]** — [한 줄 정체성].

## Claude CLI 단독 실행 fallback (IDE/터미널 — OpenClaw 경로 아닐 때)
OpenClaw 주입이 없으니 세션 시작 시 아래 순서로 읽기:
1. IDENTITY.md
2. SOUL.md
3. USER.md
4. AGENTS.md
5. MEMORY.md
```

> OpenClaw 경로에선 "SOUL.md 읽어"가 중복 지시(이미 주입됨)라 토큰 낭비이긴 하지만 기능상 해는 없음.

</details>

---

## STEP 2 · `openclaw.json` 설정 — "인사팀 등록 + 자리 배치 + 우편물 라우팅"

> 🏢 **비유** — 한 건물에 새 직원 앉히려면 세 가지가 필요해: 인사팀 신상 등록, 책상 이름표, 우편물 분류 규칙. 이게 각각 2-1 / 2-2 / 2-3.

### 2-1. `agents.list`에 뽀야 등록 — "인사팀 신고"

> 🪪 **비유** — "우리 건물에 이런 애가 있어요" 인사팀에 신상정보 등록하는 단계.

```json
{
  "id": "bboya",
  "default": true,
  "name": "뽀야",
  "workspace": "/Users/dahtmad/.openclaw/workspace-bboya",
  "model": {
    "primary": "claude-cli/claude-opus-4-7",
    "fallbacks": []
  },
  "heartbeat": { "every": "0" },
  "groupChat": {
    "mentionPatterns": ["뽀야", "bboya"]
  },
  "tools": { "exec": { "security": "full" } }
}
```

**👀 말로 풀면**

> 내 ID는 `bboya`, 이름표엔 "뽀야". 자리는 `workspace-bboya` 폴더.
> 뇌는 Claude Opus 4.7 쓰고, 대타(fallback)는 없음.
> 스스로 말 걸진 않고(heartbeat 0), 그룹챗에서는 "뽀야" / "bboya"라고 불러야 반응함.
> 도구(Bash 등) 사용은 제한 없이 허용.

**꼭 눈여겨볼 필드**

| 필드 | 왜 중요해 |
|---|---|
| `model.primary` | ⚠️ `claude-cli/` 접두사 **필수**. 이게 있어야 cli-backend가 "아 이건 Claude CLI로 돌리라는 거군" 알아들음 |
| `default: true` | 1마리 가이드에선 필수. 바인딩 매칭 실패 시 최종 fallback 대상. 여러 마리 굴려도 `default: true`는 **단 1명만** 가능 |
| `fallbacks: []` | **항상 빈 배열**. 4/29부터 뽀피터스 표준은 Claude CLI 단일 백엔드. Codex/외부 폴백을 켜면 한도 빠질 때 자동 전환되며 페르소나 톤이 갑자기 뒤틀림 — 차라리 잠깐 침묵이 낫다. 한도 부족하면 Max 200 ×2 계정 분산이 정답 |
| `tools.exec.security: "full"` | Bash 등 도구 사용 제한 없음. 신뢰할 수 있는 에이전트만 |

🔥 **함정 하나** — 예전 문서 보고 `"runtime": { ... }` 블록 넣지 마. 예전 ACP 선언 잔재로, 지금 OpenClaw에선 효과 없고 혼동만 야기.

### 2-2. `channels.slack.accounts.<id>` 등록 — "슬랙 출입증 + 자리 매핑"

> 🎫 **비유** — Slack이라는 사무실에서 이 애가 어느 자리에서 누구한테 반응할지 세팅하는 단계. Bot/App Token이 사원증이고, `groupPolicy`는 "어느 층까지 출입 가능한지"에 해당.

1마리 가이드에선 **account key를 `default`**로 쓴다. `bindings`의 `accountId: "default"`와 짝을 이루고, 매칭 실패 시에도 이리로 fallback된다. (2마리 이상일 때 에이전트별로 account key를 쪼개는 패턴으로 진화 → [ep.4 같은 머신 2마리](./ep-05-two-agents-same-host) 참조)

```json
"default": {
  "name": "뽀야",
  "botToken": "xoxb-...",
  "appToken": "xapp-...",
  "userTokenReadOnly": true,
  "groupPolicy": "open",
  "channels": {
    "C0XXXXXXXXX": { "allowBots": true }
  },
  "streaming": { "mode": "partial", "nativeTransport": true },
  "thread": {
    "historyScope": "thread",
    "inheritParent": false,
    "initialHistoryLimit": 20
  }
}
```

**👀 말로 풀면**

> 이 account 이름은 `default`, 표시 이름은 "뽀야".
> Bot Token과 App Token 두 장을 출입증으로 씀.
> 초대된 모든 채널에서 반응하고(`groupPolicy: open`), 지정된 채널에선 다른 봇 메시지도 받아줌(`allowBots: true`).
> 긴 답변은 실시간 스트리밍으로 찍어주고(streaming partial + native),
> 스레드에 **처음 진입할 때만 1회** 최근 20개 메시지를 주입받아 맥락을 잡음.

**꼭 눈여겨볼 필드**

| 필드 | 왜 중요해 |
|---|---|
| `groupPolicy: "open"` | 봇이 초대된 모든 채널에서 반응 (범용 내부 비서에 적합). 엄격하게 하려면 `"allowlist"` + 아래 `channels`에 명시한 ID만 허용 |
| `channels.<channel_id>.allowBots: true` | 그 채널에서 다른 봇의 메시지에도 반응 (봇 ↔ 봇 대화 허용할 때) |
| `streaming.mode: "partial"` | 긴 답변 스트리밍 활성화 (`nativeTransport: true`로 Slack 네이티브 API 사용) |
| `thread.initialHistoryLimit: 20` | 스레드 **새 세션 진입 시 1회** 최근 20개 주입 (OpenClaw 기본값) |

<details>
<summary>엄격 정책 예시 (외부 응대 봇 등 — 수강생 전용 같은 케이스)</summary>

```json
"default": {
  "name": "뽀야",
  "botToken": "xoxb-...",
  "appToken": "xapp-...",
  "userTokenReadOnly": true,
  "dmPolicy": "allowlist",
  "allowFrom": ["U0XXXXXXX"],
  "groupPolicy": "allowlist",
  "channels": {
    "C0AMRC21QES": { "allowBots": true },
    "C0AV40BRFEG": { "allowBots": true }
  },
  ...
}
```

- `dmPolicy: "allowlist"` + `allowFrom`: **기본 잠금**. `allowFrom`에 넣은 Slack User ID만 DM 가능
- `groupPolicy: "allowlist"` + `channels`: 명시한 채널에서만 동작. 지정 안 한 채널은 묵묵부답

</details>

#### `initialHistoryLimit` 값은 어떻게 정하나

이건 **스레드 첫 진입 때만** 1회 주입됨 (소스 `prepare-BH5U3jEx.js`의 `!threadSessionPreviousTimestamp` 조건). 같은 세션 연속 답변엔 주입 안 하고, 세션 재생성 시에도 주입 안 함.

| 환경 | 권고값 |
|---|---|
| **STEP 4 Hook 설치할 계획 → 이거 추천** | `20` (Hook이 매 턴 80개 덮어씌우는 주력 방어선. 이건 Hook 실패 시 백업용) |
| Hook 없이 갈 환경 | `40~80` (OpenClaw가 유일한 방어선. 단 세션 재생성 시 0개 구멍 있음) |

토큰 부담: 80개 × 평균 100자 ≈ 6000 tokens. 200K 컨텍스트 대비 3% 수준이라 걱정 안 해도 됨.

### 2-3. `bindings`에 라우팅 추가 — "우편물 분류 규칙"

> 📬 **비유** — "Slack의 `default` 계정으로 온 멘션은 `bboya`한테 보내라"는 분류표 한 줄 추가.

```json
{ "type": "route", "agentId": "bboya", "match": { "channel": "slack", "accountId": "default" }}
```

**👀 말로 풀면**

> Slack 채널 중 `default`라는 account로 들어오는 메시지는 모두 `bboya`(뽀야)한테 라우팅.

⚠️ **반드시 `type: "route"`**. `"acp"`로 박으면 라우터가 안 봐서 default agent로 fallback됨.

> 텔레그램 등 다른 채널도 붙이려면 바인딩만 한 줄 더 추가 (`channel: "telegram"`). 1마리 최소 셋업은 Slack 한 줄로 충분.

---

## STEP 3 · Claude OAuth 로그인 — "사원증 발급"

> 🪪 **비유** — 신입 고양이한테 Claude Max/Pro 구독 쓸 수 있는 사원증(OAuth 토큰) 발급. 고양이마다 따로 발급됨.

OpenClaw는 에이전트마다 `~/.openclaw/agents/<id>/agent/auth-profiles.json`에 OAuth 토큰을 따로 보관.

### 3-1. 게이트웨이 재시작 → 에이전트 디렉토리 생성 확인

```bash
launchctl kickstart -k gui/$(id -u)/ai.openclaw.gateway
sleep 5
ls ~/.openclaw/agents/bboya/agent/
# auth-profiles.json이 아직 없으면 다음 단계로
```

### 3-2. Claude CLI에서 OAuth 로그인

```bash
cd /Users/dahtmad/.openclaw/workspace-bboya
CLAUDE_CONFIG_DIR=/Users/dahtmad/.openclaw/agents/bboya/agent claude /login
```

브라우저 열려서 Claude Pro/Max 계정으로 로그인 → 토큰이 `auth-profiles.json`에 저장:

```json
{
  "version": 1,
  "profiles": {
    "anthropic:claude-cli": {
      "type": "oauth",
      "provider": "claude-cli",
      "access": "sk-ant-oat01-...",
      "refresh": "sk-ant-ort01-...",
      "expires": 1777034131626
    }
  }
}
```

세션은 이걸 자동으로 `authProfileOverride: "anthropic:claude-cli"`로 잡아서 씀.

---

## STEP 4 · slack-thread-rehydrate hook — "자리 비웠다 돌아와도 맥락 잃지 말라고 붙이는 포스트잇"

> 📝 **비유** — 고양이가 낮잠 자고 깨어났을 때(세션 재생성) "아까 무슨 대화 중이었지?" 까먹지 않도록, 매 답변 직전에 스레드 히스토리 80개를 포스트잇으로 붙여주는 장치. 장기 운영 에이전트엔 사실상 필수.

### 왜 필요한가 — OpenClaw 기본값의 구멍

STEP 2-2의 `initialHistoryLimit`은 **"스레드 새 세션 진입 시 1회"만** 히스토리를 주입한다. 소스(`prepare-BH5U3jEx.js`):

```javascript
if (threadInitialHistoryLimit > 0 && !threadSessionPreviousTimestamp) {
  // history 주입
}
```

즉:
| 상황 | OpenClaw 주입 |
|---|---|
| 스레드 첫 진입 | ✅ 20개 |
| 같은 세션 연속 답변 | ❌ (Claude 세션이 이전 대화 메모리로 보유한다고 전제) |
| 세션 만료/재생성 후 재진입 | ❌ → **"방금 깨어났어요" 증상 발생** |

세션 재생성은 긴 대화·시간 경과·재시작 등으로 일어남. 이때 스레드 맥락이 통째로 날아감.

### Hook이 메꾸는 방식

`UserPromptSubmit` 훅으로 **매 턴마다** `conversations.replies` 호출해서 최대 80개 메시지를 `additionalContext`로 prompt 끝에 주입. 세션 상태 무관.

### 설치

**1) 글로벌 `~/.claude/settings.json`에 hook 등록**

```json
{
  "hooks": {
    "UserPromptSubmit": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "/Users/dahtmad/.openclaw/hooks/slack-thread-rehydrate.sh",
            "timeout": 15
          }
        ]
      }
    ]
  }
}
```

**👀 말로 풀면**

> 사용자가 슬랙에서 뭔가 입력해서 Claude가 답하기 **직전**(`UserPromptSubmit` 시점)에, 저 스크립트(`slack-thread-rehydrate.sh`)를 자동으로 실행해. 타임아웃은 15초.

⚠️ **반드시 글로벌(`~/.claude/settings.json`)에 박기**. OpenClaw가 Claude CLI spawn 시 `--setting-sources user` 강제라 project/local settings는 차단됨.

**2) hook 스크립트 가져다 쓰기**

뽀피터스 레포의 [`~/.openclaw/hooks/slack-thread-rehydrate.sh`](https://github.com/chat-prompt/bbopters-shared/blob/main/hooks/slack-thread-rehydrate.sh) 사용.

### ⭐ account 자동 추론 규칙

Hook 스크립트는 cwd에서 `workspace-<id>` 패턴을 추출해서 `openclaw.json`의 동명 slack account를 자동으로 잡는다:

```python
# slack-thread-rehydrate.sh 내부 로직
m = re.search(r'workspace-([A-Za-z0-9_-]+)', cwd)
candidate = m.group(1)
# openclaw.json의 channels.slack.accounts[candidate] 존재하면 그걸로, 없으면 default
```

→ **워크스페이스 이름을 `workspace-<slack-account-id>` 규칙으로 맞추면 hook 스크립트 수정 없이 자동 작동.**

| cwd | 추론된 account |
|---|---|
| `workspace-bboya` | `bboya` → 없으면 `default`로 폴백 ✅ (1마리 가이드 시나리오) |
| `workspace-bbojjak` | `bbojjak` (openclaw.json에 있으면) |
| `workspace-foo` | `foo` (있으면) / `default` (없으면) |

💡 **1마리 가이드 시나리오**: `workspace-bboya` cwd에서 hook이 `bboya` account를 찾다 없으면 `default`로 폴백. 위 STEP 2-2에서 account key를 `default`로 설정했으니 hook이 자연스럽게 `default`로 매칭됨.

⚠️ **2마리 이상부터 중요**: 에이전트별 account key를 따로 쪼개면(예: `accounts.bbojjak`) 워크스페이스 폴더명과 key가 일치해야 hook 자동 추론이 먹힌다. (예: `workspace-bbojjak`이면 `accounts.bbojjak`) → 자세한 건 [ep.4 같은 머신 2마리](./ep-05-two-agents-same-host) 참조.

### 동작 확인

슬랙 스레드에 답글 보낸 뒤:

```bash
tail -20 /tmp/slack-thread-rehydrate.log
```

기대 출력:
```
[HH:MM:SS] rehydrating channel=C... thread_ts=...
[HH:MM:SS] using account=default     ← 자동 추론된 account (bboya가 default 사용)
[HH:MM:SS] injecting additionalContext (N bytes)   ← 실제 주입 성공
```

❌ `empty context (single msg thread), skip`만 계속 찍히면 → 토큰이 해당 워크스페이스에 권한 없거나(팀 ID 불일치) 스레드가 정말 짧음. 확인: `auth.test` API로 토큰 팀 ID 체크.

---

## STEP 5 · 게이트웨이 재시작 + 검증 — "출근 첫날 아침"

> 🌅 **비유** — 신입 고양이 출근 첫날. 건물 문 열고(게이트웨이 재시작), 멘션 한 번 받아보고(ping), 제대로 자기 페르소나로 답하는지 확인.

```bash
launchctl kickstart -k gui/$(id -u)/ai.openclaw.gateway
sleep 7
# 상태 확인
launchctl print gui/$(id -u)/ai.openclaw.gateway | grep -E '(state|pid)'
```

슬랙 채널에서 `@뽀야 ping` 던진 뒤 로그 확인:

```bash
tail -f /Users/dahtmad/.openclaw/logs/gateway.log | \
  grep -E "resolveAgentRoute|matchedBy|cli-backend"
```

기대 출력:
```
[routing] resolveAgentRoute: channel=slack accountId=default ... bindings=1
[routing] match: matchedBy=binding.account agentId=bboya
[agent/cli-backend] cli exec: provider=claude-cli model=opus
[agent/cli-backend] claude live session start: activeSessions=1
[agent/cli-backend] claude live session turn: durationMs=XXXX
```

✅ 아이콘 = 뽀야, 답변도 뽀야 페르소나면 성공.

> 💡 **1마리 작동법 = 멘션이 유일** — 슬랙 채널/DM에서 `@뽀야`로 부르면 답해. 동료한테 일 넘기는(`sessions_send`)·위임 spawn 같은 작동법은 2마리 이상부터 의미 있어 → 자세한 건 [ep.4 STEP 6 작동법](./ep-05-two-agents-same-host).

---

## Advanced · CLAUDE.md 체인 로딩 함정

Claude CLI는 cwd에서 루트까지 올라가며 만나는 **모든** CLAUDE.md를 체인으로 로드한다. 워크스페이스에 CLAUDE.md가 없어도 상위 디렉토리의 CLAUDE.md가 딸려 들어옴.

예를 들어 `cwd=~/.openclaw/workspace-bboya/`일 때:

1. `~/.openclaw/workspace-bboya/CLAUDE.md` (없으면 스킵)
2. `~/.openclaw/CLAUDE.md` ← **이게 있으면 먹힘**
3. `~/CLAUDE.md` (있으면)
4. `~/.claude/CLAUDE.md` (있으면)

**모두 누적해서** Claude CLI 세션에 들어간다. "가장 가까운 하나만" 읽는 게 아님.

### 상위 체인 체크

워크스페이스 cwd에서 실행:
```bash
cd ~/.openclaw/workspace-<id>
for d in "$PWD" "$(dirname "$PWD")" "$(dirname "$(dirname "$PWD")")" "$HOME" "$HOME/.claude"; do
  [ -f "$d/CLAUDE.md" ] && echo "FOUND: $d/CLAUDE.md"
done
```

### 발견된 상위 CLAUDE.md가 이 에이전트와 충돌한다면?

방어 3가지 중 택:

1. **상위 CLAUDE.md를 직접 정리** (가장 깔끔)
   - 페르소나·말투·호칭 규칙 빼고 공통 운영 규칙만 남기기
   - 예: `~/.claude/CLAUDE.md`에 "X로 불러, 반말" 있으면 → 제거하거나 해당 프로젝트 CLAUDE.md로 이동

2. **AGENTS.md `## Red Lines`에 "상위 X 무시" 명시** (추천)
   - 예: "글로벌 `~/.claude/CLAUDE.md`의 '반말' 규칙은 이 에이전트에 적용 안 됨. 존댓말 유지."
   - post-compaction 재주입으로도 지켜짐

3. **워크스페이스 CLAUDE.md 만들어서 오버라이드**
   - CLAUDE.md 자체를 유지해야 할 다른 이유(IDE 단독 실행 등)가 있을 때만

> ❌ **"빈 CLAUDE.md 두면 상위 차단"은 틀림**. 체인 로딩이라 빈 파일은 차단 효과 없음.

### 권고

글로벌 `~/.claude/CLAUDE.md`는 **어느 세션에서나 공통으로 필요한 운영 규칙만** 두고, 페르소나·말투·호칭은 각 에이전트 워크스페이스(AGENTS.md의 Red Lines)에서 관리. 이게 가장 오염 적은 구성.

---

## Advanced · 메모리 위계 — OpenClaw memory vs Claude CLI auto memory

> 🧠 Claude CLI엔 자체 auto memory가 있고, OpenClaw엔 워크스페이스 메모리가 있어. **둘 다 봇 평생 자산이고 용도만 다름**. 차이를 모르면 페르소나 오염 사고가 나니까 정확히 짚고 가자.

### 핵심 — cwd가 봇별 고정이라 둘 다 평생 누적

OpenClaw는 봇별로 **고정된 워크스페이스 디렉토리**(`~/.openclaw/workspace-<id>`)를 cwd로 잡고 Claude CLI를 spawn한다. cwd가 봇 평생 같으니까 Claude auto memory도 봇별로 한 곳에 누적됨:

```
~/.openclaw/workspace-bboya/      ← 뽀야 cwd (봇 평생 고정)
~/.openclaw/workspace-bbojjak/    ← 뽀짝이 cwd (봇 평생 고정)

→ Claude CLI는 cwd를 인코딩해서 auto memory 폴더 만듦:

~/.claude/projects/
├── -Users-dahtmad--openclaw-workspace-bboya/memory/MEMORY.md   ← 뽀야 평생 메모리
└── -Users-dahtmad--openclaw-workspace-bbojjak/memory/MEMORY.md ← 뽀짝이 평생 메모리
```

→ **봇끼리 절대 안 섞이고, 봇 평생 누적**. (참고: Claude CLI 도입기 ep.1에서 짚은 ACP 우회 시기엔 OpenClaw 이전 버전(goclaw)이 세션별 임시 cwd로 spawn했어서 auto memory가 흩어졌는데, **지금 CLI bridge 방식은 워크스페이스 직결**이라 봇 평생 한 곳에 쌓임)

### 한눈에 비교 — 둘 다 평생, 용도만 다름

| | 🐱 OpenClaw memory | 🤖 Claude auto memory |
|---|---|---|
| **위치** | `workspace-<id>/MEMORY.md` + `memory/YYYY-MM-DD.md` | `~/.claude/projects/-Users-...-workspace-<id>/memory/MEMORY.md` |
| **단위** | **봇 단위 평생** | **봇 단위 평생** (cwd 고정 덕분) |
| **누가 쓰나** | 사람이 직접 / 봇이 일별 로그(`memory/YYYY-MM-DD.md`)로 기록 | Claude가 작업 중 자동 누적 (학습한 규칙·실수 방지) |
| **주입 섹션** | `Workspace Files (injected)` / `Project Context` | `# auto memory` |
| **들어가는 내용** | 정체성·관계·진행 프로젝트·일지·하드룰 | "이 작업할 때 이거 먼저 확인", "FAQ 오독 주의" 같은 운영 노하우 |
| **재주입 보장** | ⭐ AGENTS.md `## Red Lines`는 post-compaction 재주입 | ❌ 일반 시스템 프롬프트에만 |

### 실제 사례 — 뽀짝이의 auto memory

뽀짝이가 운영하면서 자동 누적한 학습 메모(`~/.claude/projects/-Users-dahtmad--openclaw-workspace-bbojjak/memory/`):

- `feedback_account_merge_phone.md` — FAQ "phone은 merge 대상 아님" 오독 주의
- `feedback_ai_talk_speaker_email_approval.md` — 설문 리포트 자동발송 금지, Slack 초안 공유 후 닿 컨펌 받고 보낼 것
- `feedback_honorific_silence.md` — 타타가 존댓말 스레드엔 끼어들지 말기
- `feedback_survey_report_autosend_check.md` — "보냈니?" 질문엔 파일/git/memory 부재만 보고 판단 금지, gog gmail search로 먼저 확인
- `reference_youtube_channel.md` — 지피터스 YouTube는 support@gpters.org 소유

→ 이게 운영하면서 자동으로 쌓인 **봇 평생 노하우**. 사람이 일일이 안 박아도 Claude가 알아서 학습·누적함.

### 충돌 시 우선순위 — OpenClaw가 진실

둘 다 system prompt에 들어가서 **이론상 충돌 가능**. 예: OpenClaw `MEMORY.md`엔 "집사로 부른다"인데 auto memory엔 어쩌다 "사용자" 호칭이 박힘.

**원칙**:

1. **봇 페르소나·정체성·하드룰**은 무조건 **OpenClaw쪽**(`MEMORY.md` / `AGENTS.md ## Red Lines`)에. post-compaction 재주입 보장
2. **auto memory는 운영 노하우 영역** — 페르소나 정의 박지 말기. Claude가 자동 학습한 거라 페르소나가 박히면 오염원이 됨
3. **충돌 시 OpenClaw가 진실** — 매 호출마다 새로 주입하니 더 일관됨. auto memory에 잘못 박힌 페르소나는 사람이 직접 해당 .md 삭제·수정

### 증상별 점검 위치

| 증상 | 점검 |
|---|---|
| 봇이 자기 정체성·집사 호칭 까먹음 | OpenClaw `MEMORY.md` / `AGENTS.md ## Red Lines` |
| 운영 노하우(어떤 API는 이렇게, FAQ 오독 등) 까먹음 | Claude auto memory — Claude가 자동 챙기게 두면 됨 |
| 페르소나 오염 (어색한 말투 등) | auto memory `~/.claude/projects/-Users-...-workspace-<id>/memory/`에 잘못 박힌 항목 정리 |

---

## 트러블슈팅

| 증상 | 원인 | 해결 |
|---|---|---|
| 아이콘은 새 봇, 답은 default 에이전트 톤 | `type: "acp"`로 바인딩 박음 | `type: "route"`로 교체 |
| 봇이 멘션받아도 묵묵부답 | `channels.slack.accounts.<id>.channels`에 해당 채널 ID 없음 | 채널 ID 추가 (`C07...`) |
| DM 보냈는데 답 안 함 | `allowFrom`에 내 User ID 없음 | Slack User ID(`U0...`) 추가 |
| "claude: command not found" | Claude CLI 미설치 or PATH 문제 | `npm i -g @anthropic-ai/claude-code` |
| OAuth 만료 에러 | 토큰 리프레시 실패 | `CLAUDE_CONFIG_DIR=... claude /login` 다시 |
| 매 턴 "방금 깨어났어요" / 긴 스레드에서 맥락 놓침 | 스레드 rehydrate hook 없음, 또는 `initialHistoryLimit` 너무 낮음 | STEP 4 hook 설치 + STEP 2-2 `initialHistoryLimit: 20` 이상 |
| Hook은 돌아가는데 `empty context (single msg thread), skip`만 찍힘 | 해당 워크스페이스의 slack 토큰이 다른 Slack 팀(워크스페이스) 거라 채널 조회 실패 | `curl -H "Authorization: Bearer $TOKEN" https://slack.com/api/auth.test`로 토큰 팀 ID 확인 → 스레드가 속한 Slack 워크스페이스와 일치해야 함 |
| Hook 로그에 `using account=default`만 찍힘 (2마리 이상 운영 중인데 에이전트별 account 안 잡힘) | 워크스페이스 디렉토리명이 `workspace-<account-id>` 규칙과 다름 (1마리 가이드에선 정상) | 2마리 이상일 땐 `openclaw.json`의 `channels.slack.accounts.<id>` key와 `workspace-<id>/` 폴더명을 동일하게 |
| 반말/존댓말 뒤틀림 | SOUL.md에만 말투 뒀음 or 글로벌 CLAUDE.md 충돌 | `AGENTS.md`의 `## Red Lines`에 박기(post-compaction 재주입). CLAUDE.md 쓰는 구성이라면 거기도 가능 |
| 긴 대화(수십 턴) 후 말투 흐트러짐/하드룰 까먹음 | post-compaction 시 AGENTS.md 재주입 안 됨 — 섹션명 불일치 | `## Session Startup` / `## Red Lines` 정확히 영어 이름으로 맞추기 (이모지·한국어 금지) |
| project `.claude/settings.json`의 hook 안 발동 | OpenClaw가 `--setting-sources user` 강제 | 글로벌 `~/.claude/settings.json`에만 박기 |

---

## 체크리스트

전제: Slack App 토큰·채널 초대 완료 (상단 "전제는 딱 하나" 참조)

- [ ] `workspace-bboya/` + 6개 파일: IDENTITY / SOUL / USER / AGENTS / TOOLS / MEMORY.md
- [ ] `AGENTS.md`에 `## Session Startup` + `## Red Lines` 섹션 (영어 이름 정확히, 합쳐서 2000자 이내)
- [ ] `openclaw.json` agents.list에 `claude-cli/...` primary model + `"default": true` (runtime 필드 X)
- [ ] `openclaw.json` channels.slack.accounts.`default` 토큰 + `groupPolicy` + `thread.initialHistoryLimit: 20`
- [ ] `openclaw.json` bindings에 `type: "route"` × 1건 (`accountId: "default"`)
- [ ] `~/.openclaw/agents/bboya/agent/`에 OAuth 프로필 로그인
- [ ] **장기 운영 에이전트**: `~/.claude/settings.json`에 `slack-thread-rehydrate` hook 등록 (STEP 4)
- [ ] 게이트웨이 재시작 + 슬랙 멘션 검증 + hook 로그에 `using account=<id>` / `injecting additionalContext` 확인
- [ ] (페르소나 오염 의심 시) Advanced 섹션 "CLAUDE.md 체인 로딩" 체크

---

## 다음 단계

같은 맥미니에 2번째 에이전트를 추가하려면 → [ep.4 같은 머신 2마리](./ep-05-two-agents-same-host)
