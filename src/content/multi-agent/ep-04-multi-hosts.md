---
title: "여러 물리 머신에 여러 마리 — 공용 레포 + 협업 패턴"
episode: 4
series: multi-agent
publishedAt: "2026-04-25"
accentColor: "#8B5CF6"
description: "맥미니 N대 + 에이전트 M마리. 봇 토큰·OAuth·MEMORY는 분리, 스킬·hook·팀 문서는 공용 git 레포로 통일. 머신 걸친 협업은 슬랙 스레드를 메시지 큐처럼."
tags: ["멀티에이전트", "OpenClaw", "Claude CLI", "멀티 호스트", "공용 레포"]
token: "뽀야뽀야"
---

# 03 · 여러 물리 머신에 여러 마리 (뽀야·뽀짝이 + 뽀둥이·뽀식이)

> 전제: [02-two-agents-same-host.md](./02-two-agents-same-host.md)를 끝내 한 맥미니에 여러 마리 운영 중.
> 예시:
>   - 맥미니 A: 뽀야(default, 팀장) + 뽀짝이(부팀장)
>   - 맥미니 B: 뽀둥이(신규, 데이터 전담) + 뽀식이(신규, 고객응대 전담)
>   - **공용 git 레포 `bbopters-shared`**: 양 머신에서 clone. 스킬·hook·팀 문서·페르소나 템플릿을 공유

## 전체 그림

```
        ┌──────────────────────────────┐
        │  공용 git 레포                │
        │  github.com/chat-prompt/     │
        │  bbopters-shared             │
        │    ├── skills/               │
        │    ├── hooks/                │
        │    ├── projects/ (팀 문서)   │
        │    └── templates/            │
        └────┬─────────────────────┬───┘
             │ clone/pull          │ clone/pull
             ▼                     ▼
Slack Workspace (뽀피터스) — 하나로 공유
   │
   ├── @뽀야     (Bot A-1)  ──┐
   ├── @뽀짝이   (Bot A-2)  ──┤
   ├── @뽀둥이   (Bot B-1)  ──┼─── 같은 워크스페이스, 봇별 토큰만 분리
   └── @뽀식이   (Bot B-2)  ──┘
                        │
                        ▼
            ┌────────────────────────┐
            │                        │
     ┌──────▼─────────────┐   ┌──────▼─────────────┐
     │  맥미니 A           │   │  맥미니 B           │
     │  게이트웨이 1       │   │  게이트웨이 2       │
     │                    │   │                    │
     │ ▪ 뽀야·뽀짝이      │   │ ▪ 뽀둥이·뽀식이    │
     │ ▪ openclaw.json    │   │ ▪ openclaw.json    │
     │   (머신별 독립)    │   │   (머신별 독립)    │
     │                    │   │                    │
     │ ~/.openclaw/       │   │ ~/.openclaw/       │
     │   bbopters-shared/ │   │   bbopters-shared/ │
     │   (같은 레포 clone)│   │   (같은 레포 clone)│
     └────────────────────┘   └────────────────────┘
```

**이 문서의 핵심 3가지**:
1. 머신 N대를 물리 분산해 장애·리소스·도메인 격리
2. `bbopters-shared` git 레포로 스킬·hook·팀 문서·페르소나 템플릿을 전 머신 공유
3. 머신 걸친 에이전트 협업은 슬랙 스레드를 메시지 큐처럼 사용 (subagent 위임은 같은 머신 내에서만 가능)

## 왜 여러 머신으로 나누나

- **장애 격리**: A 죽어도 B의 뽀둥이·뽀식이는 살아있음
- **리소스 분산**: CPU/메모리 상한에 몰리는 에이전트는 별도 머신으로
- **도메인 분리**: B는 데이터 처리용 고사양, A는 일반 업무용 저사양 식으로 역할 분리
- **네트워크 분리**: 특정 내부망 접근 필요한 에이전트는 그 VPC 안 머신에 둠
- **OAuth 구독 한도 분산**: Claude Pro/Max 계정을 머신별로 나눠 써서 한도 여유 확보

## 절대 원칙 (이거 어기면 무조건 꼬임)

### 🔴 Rule 1. 같은 봇 토큰을 두 머신에서 동시에 Socket Mode로 열지 말기

Slack Events API Socket Mode는 같은 App Token으로 동시에 두 WebSocket이 열리면 **이벤트가 한쪽에만 배달됨**. 어느 쪽으로 갈지 예측 불가 → 메시지 유실·중복 응답 사태.

**= 한 봇 = 한 머신**. A에서 뽀야·뽀짝이 돌리면 B에서는 절대 그 토큰으로 게이트웨이 띄우지 말 것.

### 🔴 Rule 2. `default: true` 에이전트는 전체 시스템에서 단 1명

여러 머신이라도 전체 뽀피터스 시스템에서 default는 뽀야 1명. 각 머신 게이트웨이의 `openclaw.json`에 **default 지정은 그 머신에 사는 에이전트만** 대상으로:

- 맥미니 A의 openclaw.json: 뽀야·뽀짝이만 정의, 뽀야에 `"default": true`
- 맥미니 B의 openclaw.json: 뽀둥이·뽀식이만 정의, **뽀둥이 또는 뽀식이 중 1명에게 `"default": true`** (그 머신 내의 fallback용)

⚠️ 같은 워크스페이스에 default 봇이 2개 있어도 슬랙은 알아서 토큰별로 이벤트 분리 배달하니 충돌은 없음. 다만 머신 내부의 "매칭 실패 시 fallback" 동작만 결정하는 것.

### 🔴 Rule 3. 머신 간 에이전트 통신은 슬랙 채널/스레드로

뽀야가 뽀둥이에게 "이거 해줘" 위임하려면?
- `subagents.allowAgents`는 **같은 게이트웨이 내에서만** 동작. 머신 걸쳐서는 안 됨.
- 대신 **슬랙 채널에 메시지 남기면 뽀둥이가 반응** 패턴 사용 (`@뽀둥이 이거 부탁해`)
- 메시지 큐 필요하면 외부 큐(Redis/SQS) 붙이는 건 별도 아키텍처 — 여기서는 슬랙이 큐 역할

### 🔴 Rule 4. 공용 레포(`bbopters-shared`) 읽기 전 반드시 `git pull`

글로벌 `~/.claude/CLAUDE.md` 규칙 그대로:

> 읽기 전에 반드시 `git pull` — 여러 머신/에이전트가 공유하므로, 문서를 읽거나 참조하기 전에 항상 최신 상태로 pull할 것

머신 N대가 같은 레포를 공유하니까 A 머신에서 수정하고 push한 걸 B 머신이 pull 안 하면 버전 불일치 사고. 공용 스킬도 마찬가지 — 오래된 스킬로 작업하면 스키마 변경분 놓침.

---

## 공유 vs 고유 — 뭘 어디에 둘까

여러 머신·여러 에이전트 구조에서 **뭘 공유하고 뭘 분리할지**의 결정 매트릭스. 이게 흐트러지면 토큰 유실·페르소나 오염·기억 섞임 사고 발생.

| 자원 | 위치 | 공유? | 비고 |
|---|---|---|---|
| **공용 스킬 레지스트리** | `~/.openclaw/bbopters-shared/skills/` | ✅ git 관리, 전 머신 pull | `bbopters-skill` CLI로 `~/.claude/skills/`에 심링크 활성화 |
| **공용 hook 스크립트** | `~/.openclaw/bbopters-shared/hooks/` | ✅ git 관리, 전 머신 복제 | 글로벌 `~/.claude/settings.json`이 이 경로 참조 |
| **팀 문서·위키** | `~/.openclaw/bbopters-shared/projects/`, `context/`, `learnings/` | ✅ git 관리 | 에이전트들이 작업 전에 참조 |
| **페르소나 템플릿** | `~/.openclaw/bbopters-shared/templates/` (있으면) | ✅ git 관리 | 새 에이전트 만들 때 복제용 뼈대 |
| **글로벌 `~/.claude/CLAUDE.md`** | 각 머신 `~/.claude/` | ❌ 머신별 | 개인 환경 규칙만. 페르소나·말투는 절대 금지 (01 Advanced 참조) |
| **`openclaw.json`** | 각 머신 `~/.openclaw/` | ❌ **머신별 독립** | 그 머신에 사는 에이전트만 정의. 절대 공유 금지 |
| **워크스페이스 파일** (IDENTITY/SOUL/AGENTS/TOOLS/MEMORY/USER) | `~/.openclaw/workspace-<id>/` | ❌ **에이전트별 고유** | 개인 정체성·경험. 공유하면 페르소나 오염 |
| **`MEMORY.md` / `memory/` 일별 로그** | workspace-<id> 내부 | ❌ **에이전트 고유** | 각 에이전트의 사적 경험·학습 |
| **OAuth 토큰** (`auth-profiles.json`) | `~/.openclaw/agents/<id>/agent/` | ❌ **절대 공유 금지** | 머신·에이전트별 독립. 복사 시 Anthropic 차단 위험 |
| **스킬 `.env` 파일** | `workspace-<id>/.env` (뽀피터스 규칙) | ❌ 워크스페이스별 | 스킬 디렉토리가 아닌 **워크스페이스 루트에 통합** (집사 규칙) |

**한 줄 요약**: 텍스트성 공통 자산(스킬·hook·문서)은 git 공유, 상태·정체성·인증(openclaw.json·workspace·MEMORY·OAuth)은 분리.

---

## STEP 0 · 공용 레포 (`bbopters-shared`) 세팅

새 머신 B를 추가할 때 **가장 먼저** 할 일. 개별 에이전트 셋업보다 선행.

### 0-1. 레포 clone

```bash
# 맥미니 B에서
mkdir -p ~/.openclaw
cd ~/.openclaw
git clone git@github.com:chat-prompt/bbopters-shared.git
# 또는 https://github.com/chat-prompt/bbopters-shared.git
```

최종 경로: `~/.openclaw/bbopters-shared/`. 이게 **맥미니 A와 완전히 동일한 경로**여야 hook 스크립트·심링크·설정 참조가 머신 걸쳐 일관.

### 0-2. 레포 구조 확인

```
~/.openclaw/bbopters-shared/
├── skills/                    공용 스킬 레지스트리
│   └── {skill-name}/
│       ├── SKILL.md           스킬 정의 (frontmatter + 가이드)
│       ├── scripts/           실행 스크립트 (TypeScript/JS, `bun run`)
│       └── references/        참고 문서/스키마/템플릿
├── hooks/                     공용 hook 스크립트
│   └── slack-thread-rehydrate.sh   ← 01 STEP 4에서 쓴 것
├── projects/                  프로젝트 문서 (예: 이 가이드)
│   └── claude-skill-registry/
├── context/                   팀 위키
└── learnings/                 API/서비스 학습 문서
```

### 0-3. `bbopters-skill` CLI 설치/사용

공용 레포의 스킬을 `~/.claude/skills/`에 **심링크**로 활성화하는 매니저. 집사 프로젝트 `CLAUDE.md`에 정의됨.

```bash
bbopters-skill list              # 공용 레포 전체 스킬 목록
bbopters-skill install <name>    # 스킬 활성화 (심링크)
bbopters-skill install --all     # 전체 일괄 활성화
bbopters-skill uninstall <name>  # 비활성화
bbopters-skill active            # 현재 활성 스킬
bbopters-skill info <name>       # 상세 정보
bbopters-skill sync              # git pull (레포 업데이트)
```

새 머신 B의 에이전트들이 사용할 스킬 활성화:
```bash
# 맥미니 B에서
bbopters-skill sync               # 최신 상태로
bbopters-skill install --all      # 전체 활성화 (또는 필요한 것만)
bbopters-skill active             # 확인
```

### 0-4. pull/push 워크플로우

**읽기 전**에는 반드시:
```bash
cd ~/.openclaw/bbopters-shared && git pull
```

**수정 후**에는:
```bash
cd ~/.openclaw/bbopters-shared
git add <file>
git commit -m "메시지"
git push
# 다른 머신은 다음 작업 전 git pull (또는 bbopters-skill sync)
```

💡 여러 머신에서 동시 수정 가능하니 merge conflict 주의. 대규모 편집은 작업 시작 전 "지금 건드릴게" 슬랙에 알리는 관행 권장.

### 0-5. `.env` 위치 규칙 (집사 메모리)

스킬마다 `.env` 파일을 따로 두지 **않는다**. 모든 환경변수는 **워크스페이스 루트**(`workspace-<id>/.env`)에 통합.

```
workspace-bboongi/
├── .env                ← 뽀둥이가 쓰는 모든 스킬의 환경변수
├── IDENTITY.md
├── SOUL.md
└── ...
```

이유: 한 에이전트가 여러 스킬 실행 → 토큰 관리 분산되면 지옥. 워크스페이스 루트가 single source of truth.

---

## STEP 1 · 맥미니 B 준비

### 1-1. OpenClaw 설치
```bash
# 맥미니 B에서
npm i -g openclaw@latest  # 2026.4.22 이상 확인 필수
npm i -g @anthropic-ai/claude-code
```

### 1-2. 기본 디렉토리
```bash
mkdir -p ~/.openclaw/agents ~/.openclaw/logs ~/.openclaw/hooks
```

### 1-3. 게이트웨이 launchd 등록
맥미니 A의 plist를 참고해 `~/Library/LaunchAgents/ai.openclaw.gateway.plist` 작성. 핵심:
```xml
<key>StandardOutPath</key><string>/Users/<user>/.openclaw/logs/gateway.log</string>
<key>StandardErrorPath</key><string>/Users/<user>/.openclaw/logs/gateway.err.log</string>
<key>EnvironmentVariables</key><dict>...</dict>
<key>RunAtLoad</key><true/>
<key>KeepAlive</key><true/>
```

```bash
launchctl load ~/Library/LaunchAgents/ai.openclaw.gateway.plist
```

### 1-4. hook 스크립트는 공용 레포에서 바로 참조
STEP 0에서 clone한 `~/.openclaw/bbopters-shared/hooks/slack-thread-rehydrate.sh`를 **직접 경로로 쓰는 걸 권장**. 별도 복제·syncthing 없이 `git pull` 한 번으로 모든 머신의 hook이 최신.

01 가이드에서는 `~/.openclaw/hooks/slack-thread-rehydrate.sh`로 예시 들었지만, 멀티 호스트 운영부터는 공용 레포 경로로 통일:

```bash
# 맥미니 B에서 경로 확인
ls ~/.openclaw/bbopters-shared/hooks/slack-thread-rehydrate.sh
# 실행 권한 확인 (공용 레포라 이미 있을 것)
stat -f '%Sp' ~/.openclaw/bbopters-shared/hooks/slack-thread-rehydrate.sh
```

### 1-5. 글로벌 `~/.claude/settings.json` hook 설치
01 가이드 STEP 4와 동일한 구조로 등록하되, command 경로는 공용 레포로:

```json
{
  "hooks": {
    "UserPromptSubmit": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "/Users/<user>/.openclaw/bbopters-shared/hooks/slack-thread-rehydrate.sh",
            "timeout": 15
          }
        ]
      }
    ]
  }
}
```

이 방식이면 맥미니 A·B·... N대가 **같은 hook 스크립트**를 `git pull`로 동기화. 스크립트 버그 수정도 한 곳에서 push → 각 머신 pull.

---

## STEP 2 · 뽀둥이 / 뽀식이 슬랙 앱 만들기

01 가이드 STEP 1을 2번 반복. **같은 뽀피터스 슬랙 워크스페이스에 새 Slack App 2개 추가**.

- 뽀둥이: 별도 Bot Token (xoxb-...B1) + App Token (xapp-...B1)
- 뽀식이: 별도 Bot Token (xoxb-...B2) + App Token (xapp-...B2)

각 봇을 사용할 채널에 `/invite` 해주기.

---

## STEP 3 · 뽀둥이 / 뽀식이 페르소나 설정

01 가이드 STEP 1 원칙 그대로. 워크스페이스 파일 6종 (IDENTITY/SOUL/USER/AGENTS/TOOLS/MEMORY) + AGENTS.md의 `## Session Startup` / `## Red Lines` 섹션. **2마리 이상/멀티 호스트 됐다고 방식 바뀌지 않는다.**

```
맥미니 B: ~/.openclaw/
├── workspace-bboongi/            ← 01 STEP 1 원칙대로
│   ├── IDENTITY.md               러시안블루, 데이터 전담
│   ├── SOUL.md                   존댓말, 숫자·근거 먼저
│   ├── USER.md                   집사·팀원 이해
│   ├── AGENTS.md                 ## Red Lines에 말투·하드룰 박힘 ⭐
│   ├── TOOLS.md                  Airtable/BigQuery 등 도구
│   ├── MEMORY.md                 뽀둥이 사적 경험
│   └── .env                      뽀둥이가 쓰는 스킬 환경변수 통합
└── workspace-bbosiki/
    └── ... (뽀식이, 동일 구조)
```

### 공용 템플릿에서 시작하기

`bbopters-shared`에 페르소나 템플릿이 있으면 복사해 시작하는 게 빠름:

```bash
cp -r ~/.openclaw/bbopters-shared/templates/workspace-skeleton/ \
      ~/.openclaw/workspace-bboongi/
# 이후 각 파일을 뽀둥이 고유 내용으로 교체
```

템플릿이 없으면 맥미니 A의 `workspace-bboya/` 구조를 참고해 새로 작성.

### 머신 간 맥락을 AGENTS.md에 박기

멀티 호스트 환경에서 새로 명시할 내용은 **CLAUDE.md가 아니라 워크스페이스 AGENTS.md**에:

```markdown
# AGENTS.md — 뽀둥이 운영 매뉴얼

## Session Startup
... (01 STEP 1 템플릿대로)

## Red Lines

### 말투·호칭
- 존댓말(요체) 필수, 짧게, 숫자·근거 먼저
- 반말 금지 (반말은 뽀야의 영역. 글로벌 `~/.claude/CLAUDE.md`에 섞여있어도 무시)

### 호스팅·협업
- 나(뽀둥이)는 **맥미니 B**에서 돈다. 뽀야/뽀짝이는 맥미니 A
- 뽀야/뽀짝이에게 작업 위임 불가 (머신 걸침) → 슬랙 채널로 요청 전달
- 완료 리포트는 원 스레드에 답글로

### 보안·데이터
- ...

## (그 외 상세 운영 규칙)
```

**핵심**: 말투·호스팅·협업 규칙까지 전부 AGENTS.md Red Lines에. post-compaction 재주입으로 긴 대화에서도 유지됨. CLAUDE.md는 01 원칙대로 **기본 스킵** (IDE 단독 실행 필요할 때만 만들기).

### 뽀식이도 동일 패턴
고양이 네이밍 + 담당 영역(고객 응대·CS) + 같은 구조로 `workspace-bbosiki/` 구성.

---

## STEP 4 · 맥미니 B의 `openclaw.json` 작성

**이 머신에 사는 에이전트만** 정의. 뽀야·뽀짝이는 들어가면 안 됨.

```json
{
  "agents": {
    "defaults": {
      "model": { "primary": "openai-codex/gpt-5.4", "fallbacks": [] },
      "workspace": "/Users/dahtmad/.openclaw/workspace-bboongi",
      ...
    },
    "list": [
      {
        "id": "bboongi",
        "default": true,
        "name": "뽀둥이",
        "workspace": "/Users/dahtmad/.openclaw/workspace-bboongi",
        "model": { "primary": "claude-cli/claude-opus-4-7", "fallbacks": [] },
        "heartbeat": { "every": "0" },
        "groupChat": { "mentionPatterns": ["뽀둥이", "bboongi"] },
        "tools": { "exec": { "security": "full" } }
      },
      {
        "id": "bbosiki",
        "name": "뽀식이",
        "workspace": "/Users/dahtmad/.openclaw/workspace-bbosiki",
        "model": { "primary": "claude-cli/claude-opus-4-7", "fallbacks": [] },
        "heartbeat": { "every": "0" },
        "groupChat": { "mentionPatterns": ["뽀식이", "bbosiki"] },
        "tools": { "exec": { "security": "full" } }
      }
    ]
  },
  "channels": {
    "slack": {
      "accounts": {
        "bboongi": {
          "botToken": "xoxb-...B1",
          "appToken": "xapp-...B1",
          "dmPolicy": "allowlist",
          "allowFrom": ["U06BNH5R26T"],
          "groupPolicy": "allowlist",
          "channels": { "C0XXX1": { "allowBots": true }}
        },
        "bbosiki": {
          "botToken": "xoxb-...B2",
          "appToken": "xapp-...B2",
          "dmPolicy": "allowlist",
          "allowFrom": ["U06BNH5R26T"],
          "groupPolicy": "allowlist",
          "channels": { "C0XXX2": { "allowBots": true }}
        }
      }
    }
  },
  "bindings": [
    { "type": "route", "agentId": "bboongi",  "match": { "channel": "slack", "accountId": "bboongi" }},
    { "type": "route", "agentId": "bbosiki",  "match": { "channel": "slack", "accountId": "bbosiki" }}
  ]
}
```

포인트:
- 맥미니 B 내부의 default는 뽀둥이 (이 머신에서 매칭 실패 시 fallback)
- 맥미니 A의 `openclaw.json`에는 뽀둥이/뽀식이 항목 없음 — 각자 자기 머신의 에이전트만 관리
- `channels.slack.accounts`에도 뽀둥이/뽀식이 토큰만, 뽀야/뽀짝이 토큰은 맥미니 A에서만

---

## STEP 5 · OAuth 로그인 + 게이트웨이 기동

```bash
# 맥미니 B에서
cd ~/.openclaw/workspace-bboongi
CLAUDE_CONFIG_DIR=~/.openclaw/agents/bboongi/agent claude /login

cd ~/.openclaw/workspace-bbosiki
CLAUDE_CONFIG_DIR=~/.openclaw/agents/bbosiki/agent claude /login

# 게이트웨이 시작
launchctl kickstart -k gui/$(id -u)/ai.openclaw.gateway
sleep 7
```

---

## STEP 6 · 전체 검증 (A/B 양쪽 로그 동시에)

### A 맥미니
```bash
ssh mac-mini-A "tail -f ~/.openclaw/logs/gateway.log | grep matchedBy"
```

### B 맥미니
```bash
ssh mac-mini-B "tail -f ~/.openclaw/logs/gateway.log | grep matchedBy"
```

슬랙에서 4마리 각각 멘션:
- `@뽀야 ping`    → A에만 `matchedBy=binding.account agentId=bboya`
- `@뽀짝이 ping`  → A에만 `matchedBy=binding.account agentId=bbojjak`
- `@뽀둥이 ping`  → B에만 `matchedBy=binding.account agentId=bboongi`
- `@뽀식이 ping`  → B에만 `matchedBy=binding.account agentId=bbosiki`

**절대 A와 B 양쪽 로그에 같은 에이전트가 찍히면 안 됨.** 찍히면 Rule 1 위반 (같은 토큰 중복 기동).

---

## 머신 간 에이전트 협업 패턴

`subagents.allowAgents`는 같은 게이트웨이 내에서만 작동. 맥미니 A의 뽀야가 맥미니 B의 뽀둥이에게 subagent로 위임 불가. 대신 아래 4가지 패턴으로 협업.

### 패턴 1 · 슬랙 스레드 = 메시지 큐

가장 기본. 한 스레드 안에서 요청/처리/리포트가 이어짐.

```
[집사] #data 채널: 4월 신청자 분석 부탁해
    │
    ├─[뽀야] 뽀둥이에게 맡길게요. @뽀둥이 요청드려요 — (요구사항 정리)
    │       └─ 뽀야 메시지에 뽀둥이 멘션 포함 → B 게이트웨이가 받음
    │
    ├─[뽀둥이] 네, 뽀둥이입니다. BigQuery 돌려보고 15분 내 리포트 올릴게요
    │       └─ 처리 (스킬 실행, 쿼리 등)
    │
    └─[뽀둥이] (리포트 — 표/수치/결론)
            └─ 원 스레드에 답글로 결과 리포트. 뽀야/집사 모두 볼 수 있음
```

포인트:
- 요청자(뽀야)와 처리자(뽀둥이)가 **같은 스레드**에서 대화
- 스레드 ID를 공유하므로 `slack-thread-rehydrate` hook이 양쪽 모두 동일한 히스토리 주입 → 맥락 유지
- 비동기 처리 가능 (뽀둥이가 15분 걸려도 뽀야는 기다림 없이 다음 일)

### 패턴 2 · 공용 스킬로 일관성 유지

두 에이전트가 같은 작업을 각자 할 때는 `bbopters-shared/skills/`의 **같은 스킬**을 실행:

```
뽀야(A) ──┐                    뽀둥이(B) ──┐
          ▼                              ▼
~/.claude/skills/              ~/.claude/skills/
 airtable-query (symlink)       airtable-query (symlink)
   │                              │
   ▼                              ▼
~/.openclaw/bbopters-shared/skills/airtable-query/
   └── (단일 source of truth)
```

장점: 스킬 버전 불일치 불가. 한쪽에서 스킬 수정 → push → 다른쪽 `bbopters-skill sync` → 양쪽 동일 버전.

주의: 스킬 실행 시 `.env`는 **각 에이전트의 워크스페이스 루트**(`workspace-bboongi/.env`)에서 읽음. 스킬은 공유지만 토큰은 각자 관리.

### 패턴 3 · 팀 위키 참조 (공용 문서)

두 에이전트가 같은 팀 규칙·스키마·프로세스를 참조할 때:

```
~/.openclaw/bbopters-shared/
├── projects/              프로젝트별 상세 문서 (이 가이드 포함)
├── context/               팀 위키 (정책/체크리스트/스키마)
└── learnings/             API/서비스 학습 문서
```

예: Airtable 스키마가 바뀌면 `bbopters-shared/context/airtable-schema.md`만 업데이트 → push → 모든 에이전트가 다음 작업 전 `git pull` → 최신 스키마 기반 작업.

**절대 규칙**: 팀 위키 읽기 전 반드시 `git pull` (Rule 4). 오래된 스키마로 작업하면 사고.

### 패턴 4 · MEMORY는 공유하지 않는다

각 에이전트의 `workspace-<id>/MEMORY.md`와 `memory/` 일별 로그는 **개인 경험**. 공용 레포에 넣으면 안 됨:

- 이유 1: 프라이버시·용량. 에이전트별 대화 히스토리·사적 메모가 섞이면 관리 불가
- 이유 2: 페르소나 오염. 뽀야가 뽀둥이 경험을 "기억"하면 정체성 혼란
- 이유 3: Git 레포가 비대해짐

**공유할 정보는 팀 위키(bbopters-shared/context/)로**, 개인 기억은 각자 MEMORY.md에. 두 영역은 엄격히 분리.

### 요약

| 협업 필요 | 방법 |
|---|---|
| 작업 위임 (A→B) | 슬랙 채널 멘션 + 스레드 답글 리포트 (패턴 1) |
| 같은 작업을 각자 실행 | 공용 스킬 호출 (패턴 2) |
| 팀 규칙/스키마 참조 | bbopters-shared/context (패턴 3) |
| 개인 경험·기억 | **공유 금지**. 각자 MEMORY.md (패턴 4) |

---

## 뽀둥이 / 뽀식이 첫 세팅 체크리스트

### 공용 자산 세팅 (STEP 0 — 맥미니 B 최초 1회)
- [ ] `~/.openclaw/bbopters-shared/` git clone (A와 동일 경로)
- [ ] `bbopters-skill` CLI 사용 가능 확인 (`bbopters-skill list`)
- [ ] `bbopters-skill install --all` 또는 필요 스킬만 활성화
- [ ] pull/push 워크플로우 숙지 (Rule 4: 읽기 전 `git pull`)

### 맥미니 B 인프라 (STEP 1)
- [ ] OpenClaw 2026.4.22+ 설치
- [ ] Claude CLI 설치
- [ ] launchd plist 등록 + 게이트웨이 기동 확인
- [ ] 글로벌 `~/.claude/settings.json` hook에 **공용 레포 경로** 등록 (`bbopters-shared/hooks/slack-thread-rehydrate.sh`)

### 에이전트별 (뽀둥이 × 1, 뽀식이 × 1)
- [ ] Slack App 생성 (뽀피터스 워크스페이스)
- [ ] Bot/App Token 발급 + 채널 초대
- [ ] `workspace-<id>/` 디렉토리 + 페르소나 파일 6종 (`bbopters-shared/templates/`에서 복제)
- [ ] **말투·호스팅·협업 규칙은 AGENTS.md `## Red Lines`에** (01/02 원칙 그대로, CLAUDE.md 기본 스킵)
- [ ] `workspace-<id>/.env` — 스킬 환경변수 통합 (집사 규칙)
- [ ] `openclaw.json` (맥미니 B) agents.list·channels·bindings 추가
- [ ] `~/.openclaw/agents/<id>/agent/`에 OAuth 로그인 (**머신별 독립**, 복사 금지)
- [ ] 슬랙 멘션 검증 (B 로그에만 찍히는지 확인)
- [ ] hook 로그 검증 (`/tmp/slack-thread-rehydrate.log`에 `using account=<id>`)

---

## 운영 팁

### 팁 1 · 머신별 역할 문서화
맥미니 A는 "대민 업무(뽀야·뽀짝이)", 맥미니 B는 "백오피스(뽀둥이·뽀식이)" 식으로 역할을 문서에 박고, 팀 내부에 누가 어느 머신 담당인지 정리. 장애 시 트리아지 빠름.

### 팁 2 · 크론/정기 작업은 머신별 분산
맥미니 A가 다운돼도 B의 정기 작업(뽀둥이 월별 리포트 등)은 계속 돌아야 함. 중요한 크론은 머신별로 나눠 돌리기.

### 팁 3 · 설정 변경 시 한 번에 1대씩
`openclaw.json` 수정은 머신별 독립이지만, 슬랙 앱 설정(스코프 추가 등)은 양쪽 기동 중일 때 먼저 한 쪽 게이트웨이 껐다 켜고 검증 후 반대쪽. 동시 중단은 피하기.

### 팁 4 · 머신 이름 / 호스트 추적
에이전트가 자기 어느 머신에서 도는지 **AGENTS.md `## Red Lines`의 "호스팅·협업" 섹션**에 박아두면 디버깅 유리 (STEP 3 예시 참조). post-compaction에서도 재주입되므로 긴 대화에서도 자기 호스트를 잊지 않음:

```markdown
### 호스팅·협업
- 나(뽀둥이)는 **맥미니 B**(호스트명: bbopters-mini-b)에서 돈다
- 뽀야/뽀짝이는 맥미니 A에서 돈다 (머신 걸친 위임 불가 → 슬랙으로)
```

### 팁 5 · Slack App 관리 공용 계정
Slack App Admin 계정은 공용(팀 이메일)으로 만들어서 여러 명이 관리 가능하게. 개인 계정에 묶이면 퇴사/휴직 시 곤란.

---

## 트러블슈팅 (여러 머신 특유)

| 증상 | 의심 | 해결 |
|---|---|---|
| 슬랙 멘션에 간헐적으로 답 안 옴 | 같은 봇 토큰이 A/B 양쪽 게이트웨이에 동시 등록돼있음 | `openclaw.json` 양쪽 확인, 중복 제거 |
| 뽀둥이한테 질문했는데 뽀야가 답 | accountId 매칭 실패 → default fallback. 맥미니 B의 `bindings` 누락 | B의 `openclaw.json` bindings route 추가 |
| B가 먹통인데 프로세스는 떠있음 | hook 스크립트가 없거나 실행 권한 없음 | A의 hook 스크립트를 B에 복제 + `chmod +x` |
| OAuth 만료 한쪽에서만 터짐 | 머신별 `auth-profiles.json` 독립 | 해당 머신에서 `claude /login` 재실행 |
| 크론 작업 중복 실행 | 같은 크론이 A/B 양쪽에 등록됨 | `cron/jobs.json`은 **머신 단위로 유일** 관리 |
| 에이전트 간 위임 실패 | `subagents.allowAgents`는 머신 걸쳐 작동 안 함 | 슬랙 채널로 요청 전달 패턴 사용 (협업 패턴 1) |
| A 머신에서 고친 스킬이 B에선 구버전으로 실행 | `bbopters-shared` pull 안 함 | B 머신에서 `cd ~/.openclaw/bbopters-shared && git pull` (또는 `bbopters-skill sync`) |
| B 머신의 hook 로그에 스킬이 안 찍힘 | `bbopters-skill install` 안 함 (심링크 없음) | `bbopters-skill install --all` 또는 필요 스킬 개별 install |
| 팀 위키 내용대로 작업했는데 스키마가 다름 | 위키 pull 안 해서 구버전 참조 | Rule 4: 읽기 전 반드시 `git pull`. 특히 스키마/정책 문서 |
| OAuth 한 머신에서 다른 머신으로 복사 시 계정 차단 | `auth-profiles.json`은 머신·에이전트별 독립이어야 함 | 해당 머신에서 직접 `CLAUDE_CONFIG_DIR=... claude /login` (복사 절대 금지) |
| `bbopters-skill` 명령 안 먹힘 | CLI 설치 안 돼있음 | `~/.openclaw/CLAUDE.md`의 스킬 매니저 섹션 참조해 CLI 설치 |
| 스킬이 `.env` 못 찾음 | 스킬 디렉토리에 `.env` 뒀음 | 워크스페이스 루트(`workspace-<id>/.env`)로 이동 (집사 규칙) |
| 같은 레포에 여러 머신이 동시 push → 충돌 | merge conflict | 대규모 편집 전 슬랙에 "지금 건드릴게" 고지. 충돌 시 rebase로 해결 |

---

## 종합 스택 그림 (최종)

```
Slack Workspace (뽀피터스)
   │
   ├ @뽀야     ──┐
   ├ @뽀짝이   ──┤─── Socket Mode 소켓 4개 (각각 독립)
   ├ @뽀둥이   ──┤
   └ @뽀식이   ──┘
        │
   ┌────┴─────────────────────────┐
   ▼                               ▼
┌──────────────┐              ┌──────────────┐
│ 맥미니 A      │              │ 맥미니 B      │
│              │              │              │
│ openclaw.json│              │ openclaw.json│
│  agents:     │              │  agents:     │
│   bboya (d)  │              │   bboongi(d) │
│   bbojjak    │              │   bbosiki    │
│  bindings:   │              │  bindings:   │
│   default→   │              │   bboongi→   │
│   dajidongsan│              │   bbosiki→   │
│   hbscom→    │              │              │
│   bbojjak→   │              │              │
│              │              │              │
│ cli-backend  │              │ cli-backend  │
│  warm stdio  │              │  warm stdio  │
│  × 2         │              │  × 2         │
└──────────────┘              └──────────────┘
   │                               │
   ▼                               ▼
 claude ─ workspace-bboya     claude ─ workspace-bboongi
 claude ─ workspace-bbojjak   claude ─ workspace-bbosiki
```

**한 줄 요약**: 슬랙 한 워크스페이스 + 머신 N대 + 에이전트 M마리 + 공용 git 레포 1개. **공유(bbopters-shared)**: 스킬·hook·팀 문서·템플릿. **분리(머신·에이전트별)**: 봇 토큰·`openclaw.json`·워크스페이스·MEMORY·OAuth. default는 머신당 1명, 머신 걸친 협업은 슬랙 스레드로.
