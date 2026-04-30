---
title: "여러 물리 머신에 여러 마리 — 공용 레포 + 협업 패턴"
episode: 5
date: "2026-04-25"
series: case-studies
category: "Slack × Claude CLI 멀티에이전트"
publishedAt: "2026-04-25"
accentColor: "#8B5CF6"
description: "맥미니 N대 + 에이전트 M마리. 봇 토큰·OAuth·MEMORY는 분리, 스킬·hook·팀 문서는 공용 git 레포로 통일. 머신 걸친 협업은 슬랙 스레드를 메시지 큐처럼."
tags: ["멀티에이전트", "OpenClaw", "Claude CLI", "멀티 호스트", "공용 레포"]
token: "밋업"
---

# 05 · 사무실을 세 곳으로 — 맥미니 A + B + C에서 4마리 키우기

> 한 사무실(맥미니 A)에 두 마리 잘 살고 있는데, 일이 늘어나서 **사무실 두 곳을 더 열기**로 했어.
> 모든 사무실의 직원들이 같은 슬랙으로 소통하고, **공용 자료실**(git 레포)을 함께 보는 구조.
> 예시:
>   - 🏢 맥미니 A: 뽀야(팀장) + 뽀짝이(부팀장)
>   - 🏢 맥미니 B: 뽀둥이(데이터 전담)
>   - 🏢 맥미니 C: 뽀식이(고객응대 전담)
>   - 📚 공용 자료실(`bbopters-shared` git 레포): 모든 사무실에서 clone. 스킬·hook·팀 문서·템플릿을 같이 씀

## 이 문서가 해주는 거

같은 슬랙에 4마리 봇이 출근해 있는데, 그중 2마리는 사무실 A에서, 나머지 2마리는 각각 사무실 B와 C에서 일하는 분산 구조를 셋업한다. 핵심 3가지:

1. **사무실 분리** = 장애 격리 + 리소스 분산 + 도메인 분리
2. **공용 자료실(`bbopters-shared`)** = 스킬·hook·팀 문서·페르소나 템플릿을 git pull/push로 공유
3. **사무실 간 협업** = 슬랙 스레드를 메시지 큐처럼 (subagent 위임은 같은 사무실에서만 가능)

## 전제

- [ ] 1마리 / 2마리 가이드 ([ep.3](./ep-04-single-agent), [ep.4](./ep-05-two-agents-same-host)) 끝낸 상태
- [ ] 새 머신(맥미니 B, C) 두 대 추가 가능
- [ ] GitHub에 공용 레포 만들 수 있는 권한 (또는 기존 `bbopters-shared` 접근 권한)

## 전체 그림

![3 사무실 · 4 마리 · 1 자료실 — 맥미니 A+B+C 분산 + 공용 git 레포](/images/multi-agent/ep-04/architecture.png)

```
        ┌──────────────────────────────┐
        │  공용 git 레포                │
        │  github.com/chat-prompt/     │
        │  bbopters-shared             │
        │    ├── skills/               │
        │    ├── hooks/                │
        │    ├── projects/ (팀 문서)   │
        │    └── templates/            │
        └──┬───────────┬───────────┬───┘
           │ clone/pull│ clone/pull│ clone/pull
           ▼           ▼           ▼
Slack Workspace (뽀피터스) — 하나로 공유
   │
   ├── @뽀야     (Bot A-1)  ──┐
   ├── @뽀짝이   (Bot A-2)  ──┤
   ├── @뽀둥이   (Bot B-1)  ──┼─── 같은 워크스페이스, 봇별 토큰만 분리
   └── @뽀식이   (Bot C-1)  ──┘
                        │
        ┌───────────────┼───────────────┐
        ▼               ▼               ▼
┌────────────────┐┌────────────────┐┌────────────────┐
│  맥미니 A       ││  맥미니 B       ││  맥미니 C       │
│  게이트웨이 1   ││  게이트웨이 2   ││  게이트웨이 3   │
│                ││                ││                │
│ ▪ 뽀야·뽀짝이  ││ ▪ 뽀둥이        ││ ▪ 뽀식이        │
│ ▪ openclaw.json││ ▪ openclaw.json││ ▪ openclaw.json│
│   (머신별 독립)││   (머신별 독립)││   (머신별 독립)│
│                ││                ││                │
│ ~/.openclaw/   ││ ~/.openclaw/   ││ ~/.openclaw/   │
│   bbopters-    ││   bbopters-    ││   bbopters-    │
│   shared/      ││   shared/      ││   shared/      │
│   (같은 레포)  ││   (같은 레포)  ││   (같은 레포)  │
└────────────────┘└────────────────┘└────────────────┘
```

**이 문서의 핵심 3가지**:
1. 머신 N대를 물리 분산해 장애·리소스·도메인 격리
2. `bbopters-shared` git 레포로 스킬·hook·팀 문서·페르소나 템플릿을 전 머신 공유
3. 머신 걸친 에이전트 협업은 슬랙 스레드를 메시지 큐처럼 사용 (subagent 위임은 같은 머신 내에서만 가능)

## 왜 사무실을 여러 곳으로 나누나?

- **🛡️ 장애 격리**: A 사무실 정전나도 B의 뽀둥이, C의 뽀식이는 멀쩡히 일함
- **⚖️ 리소스 분산**: 메모리 많이 먹는 직원은 별도 사무실로 (한 머신에 몰면 서로 자원 잡아먹음)
- **🎯 도메인 분리**: B는 데이터 분석용 고사양, C는 CS용 저사양, A는 일반 업무용
- **🔒 네트워크 분리**: 특정 내부망 접근 필요하면 그 망 안에 있는 머신에
- **💳 구독 한도 분산**: Claude Pro/Max 계정을 사무실별로 따로 써서 한도 여유

## 🚨 절대 어기면 안 되는 4가지 약속

> 이 4개만 잘 지키면 멀티 사무실은 안전. 어기면 메시지 유실·중복 응답·페르소나 섞임 사고 100% 발생.

### 🔴 약속 1. 같은 사원증(봇 토큰)으로 두 사무실 동시 출근 금지

> 🪪 **비유** — 한 사람이 사원증 한 장으로 두 사무실에 동시에 앉아있을 순 없잖아. 들어오는 메시지(우편물)가 어느 자리로 가야 할지 슬랙도 헷갈려서 한쪽에만 배달함. 어느 쪽인지 예측 불가 → **메시지 유실·중복 응답 사고**.

규칙: **봇 1마리 = 사무실 1곳**. A에서 뽀야 돌리면 B/C 어느 곳에서도 절대 같은 토큰으로 띄우지 말 것.

### 🔴 약속 2. "대장(default)"은 사무실마다 1명씩만

> 👑 **비유** — 각 사무실에 한 명씩만 "관리자(default)" 배지 달기. 사무실 안에서 우편물 분류 실패할 때 폴백 받는 사람.

여러 머신이어도 **각 머신의 `openclaw.json`엔 그 머신에 사는 직원만 정의**. default도 그 사무실 직원 중 1명.

- 맥미니 A `openclaw.json`: 뽀야·뽀짝이만 정의, 뽀야에 `"default": true`
- 맥미니 B `openclaw.json`: 뽀둥이만 정의, `"default": true`
- 맥미니 C `openclaw.json`: 뽀식이만 정의, `"default": true`

⚠️ A의 뽀야와 B의 뽀둥이, C의 뽀식이가 모두 `default: true`여도 충돌 없음 — 슬랙이 토큰별로 알아서 분리 배달하니까. **머신 내부 폴백**만 결정. 1마리뿐인 머신은 default가 무조건 그 1마리.

### 🔴 약속 3. 사무실 간 부탁은 슬랙 스레드로

> 📬 **비유** — A 사무실 뽀야가 B 사무실 뽀둥이한테 "이거 해줘" 부탁하려면? 사무실끼리 직통 전화 없어. **슬랙이라는 공용 우편 시스템**으로 메시지 보내야 함.

- ❌ `subagents.allowAgents`는 **같은 사무실 안에서만** 작동 (사무실 걸쳐 안 됨)
- ✅ 대신 슬랙 채널에 `@뽀둥이 이거 부탁해` 메시지 → 뽀둥이가 반응
- 외부 큐(Redis/SQS)도 가능하지만 여기선 슬랙이 큐 역할

### 🔴 약속 4. 공용 자료실(`bbopters-shared`) 읽기 전엔 무조건 `git pull`

> 📚 **비유** — 사무실들이 공유하는 자료실. 옆 사무실에서 자료 업데이트하고 갔는데 우리는 옛날 버전 보고 있으면? 사고. 자료 보기 전에 무조건 최신화 한 번.

글로벌 `~/.claude/CLAUDE.md`에 박혀있는 규칙 그대로:

> 읽기 전에 반드시 `git pull` — 여러 사무실/에이전트가 공유하므로, 문서를 읽거나 참조하기 전에 항상 최신 상태로 pull할 것

사무실 N개가 같은 자료실을 공유하니까 A에서 수정·push한 걸 B/C가 pull 안 하면 버전 불일치 사고. **스킬도 마찬가지** — 오래된 스킬로 작업하면 스키마 변경분 놓쳐.

---

## 📦 공유할 것 vs 따로 둘 것

> 💡 **이게 가장 중요한 표** — 멀티 사무실 구조에서 헷갈리면 안 되는 게 "이 자원은 공유하나? 따로 두나?". 흐트러지면 토큰 유실·페르소나 오염·기억 섞임 사고 발생.

**한 줄 원칙**: 텍스트성 공통 자산(스킬·hook·문서)은 git 자료실로 공유. 상태·정체성·인증(개인 사물)은 절대 분리.

### ✅ 공유 — 모든 머신이 같은 git 레포를 봄

| 자원 | 위치 | 비고 |
|---|---|---|
| 공용 스킬 레지스트리 | `~/.openclaw/bbopters-shared/skills/` | `bbopters-skill` CLI로 `~/.claude/skills/`에 심링크 |
| 공용 hook 스크립트 | `~/.openclaw/bbopters-shared/hooks/` | 글로벌 `~/.claude/settings.json`에서 이 경로 참조 |
| 팀 문서·위키 | `~/.openclaw/bbopters-shared/projects/`, `context/`, `learnings/` | 작업 전 `git pull`로 최신화 |
| 페르소나 템플릿 | `~/.openclaw/bbopters-shared/templates/` | 새 에이전트 복제용 뼈대 |

### ❌ 분리 — 머신·에이전트마다 독립 (절대 공유 금지)

| 자원 | 단위 | 위치 | 비고 |
|---|---|---|---|
| 글로벌 `CLAUDE.md` | 머신별 | `~/.claude/` | 개인 환경 규칙만. 페르소나 금지 |
| `openclaw.json` | 머신별 | `~/.openclaw/` | 그 머신에 사는 에이전트만 정의 |
| OAuth 토큰 | 머신·에이전트별 | `~/.openclaw/agents/<id>/agent/` | 복사 시 Anthropic 차단 위험 |
| 워크스페이스 파일 | 에이전트별 | `~/.openclaw/workspace-<id>/` | IDENTITY·SOUL·AGENTS·TOOLS·MEMORY·USER |
| MEMORY.md / 일별 로그 | 에이전트별 | `workspace-<id>/` | 사적 경험·학습 |
| 스킬 `.env` | 에이전트별 | `workspace-<id>/.env` | 스킬 디렉토리 ❌, 워크스페이스 루트 통합 |

---

## 📌 이 가이드의 규칙이 박혀있는 곳

> 위 표의 자원들이 "어디에 있나"를 정했다면, 이번 표는 그 **운영 규칙 자체가 어느 파일에 박혀서 작동하는지**를 정리. 룰은 두 레이어 — 모든 에이전트가 공유하는 **공통 룰**과 에이전트별 **운영 룰**.

| 규칙 | 정의된 위치 |
|---|---|
| `bbopters-shared` 절대 경로 = `~/.openclaw/bbopters-shared/` (모든 머신 동일) | 글로벌 `~/.claude/CLAUDE.md` + 프로젝트 `~/.openclaw/CLAUDE.md` |
| 읽기 전 `git pull` (Rule 4) | 글로벌 `~/.claude/CLAUDE.md` |
| `bbopters-skill` CLI로 `~/.claude/skills/`에 심링크 활성화 | 프로젝트 `~/.openclaw/CLAUDE.md` |
| `.env`는 **워크스페이스 루트**(`workspace-<id>/.env`)에 통합 — 스킬 디렉토리에 두지 않음 | 각 워크스페이스 `AGENTS.md` `## Red Lines` |
| 호스팅·협업 (어느 머신에서 도는지, 머신 걸친 위임 불가) | 각 워크스페이스 `AGENTS.md` `## Red Lines` |
| 말투·호칭·보안 등 에이전트별 하드 룰 | 각 워크스페이스 `AGENTS.md` `## Red Lines` |
| 머신별 `openclaw.json`엔 자기 직원만 정의 (Rule 1·2) | 각 머신 `~/.openclaw/openclaw.json` 자체 — 구조적 제약 |
| OAuth 토큰 머신 간 복사 금지 | 각 머신 `~/.openclaw/agents/<id>/agent/` 자체 — 머신별 독립 |

**🌐 공통 룰 → CLAUDE.md** / **🐱 에이전트별 운영 룰 → AGENTS.md `## Red Lines`** 두 갈래로 분리되는 게 핵심.

### CLAUDE.md vs AGENTS.md `## Red Lines` — 언제 뭘 쓰나

> 둘 다 자동 주입 + `/compact` 후에도 보존되는 건 맞아. 다만 **주입 경로와 메커니즘이 다르다**. 발표 때 자주 나오는 질문이라 사실 기반으로 정리.

| 항목 | 워크스페이스 `CLAUDE.md` | `AGENTS.md` `## Red Lines` |
|---|---|---|
| 주입 경로 | 세션 시작 시 cwd에서 로드 → **사용자 메시지(user message)로 주입**. 프롬프트 캐싱으로 매 API 호출엔 캐시 히트 | OpenClaw 게이트웨이가 **별도 시스템 메시지로 재주입** (워크스페이스 `AGENTS.md` 본문에 명시된 메커니즘) |
| `/compact` 후 | **디스크에서 재로드 (re-injected from disk)** — Claude Code 공식 문서 보장 [^cc-context] | 매 턴 재주입되므로 자연스럽게 살아남음 |
| 의도 | 페르소나·세션 시작 가이드 (한 번 알려주면 되는 정적 정보) | 에이전트별 운영 하드 룰 (말투·보안·인프라 등 절대 잊으면 안 되는 것) |
| 대표 예시 | "이 워크스페이스는 뽀야 페르소나로 동작" | 말투·보안·`.env` 위치·호스팅·협업·도구 사용 |

**한 줄 정리**:
- **CLAUDE.md = 세션 시작 인사말 + 페르소나 로드 가이드**
- **AGENTS.md `## Red Lines` = 에이전트별 운영 하드 룰 모음**

뽀피터스 표준 패턴: CLAUDE.md엔 페르소나 로드 가이드만 짧게 두고, **운영 하드 룰은 모두 `AGENTS.md` `## Red Lines` 한 곳에 모은다**. 둘 다 보존은 강하지만, 운영 룰을 한 자리에 모아두면 변경·검토·신규 에이전트 복제할 때 관리가 깔끔. CLAUDE.md엔 "운영 하드 룰은 AGENTS.md `## Red Lines` 참조" 포인터 한 줄로 충분.

[^cc-context]: Claude Code 공식 문서 [Memory](https://code.claude.com/docs/en/memory.md)·[Context Window](https://code.claude.com/docs/en/context-window.md) "What survives compaction" 표 참조. AGENTS.md Red Lines의 매 턴 재주입은 OpenClaw 게이트웨이 메커니즘이며, Claude Code 공식 기능은 아님.

---

## STEP 0 · 공용 자료실(`bbopters-shared`) 세팅 — "팀 자료실 갖다놓기"

> 📚 **비유** — 새 사무실(맥미니 B, C) 차리기 전에 가장 먼저 할 일. 사무실에서 일하려면 팀 자료실(스킬·hook·문서)이 책상 옆에 있어야 함. 자료실은 **모든 사무실에서 똑같은 경로**로 두는 게 핵심.

### 0-1. 자료실 clone — "자료실 책장 옮겨오기"

```bash
# 맥미니 B와 C 각각에서 동일하게 실행
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

새 머신 B(뽀둥이)·C(뽀식이)의 에이전트들이 사용할 스킬 활성화:
```bash
# 맥미니 B와 C 각각에서
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

### 0-5. `.env` 위치 규칙 (각 워크스페이스 `AGENTS.md` `## Red Lines`에 박힘)

스킬마다 `.env` 파일을 따로 두지 **않는다**. 모든 환경변수는 **워크스페이스 루트**(`workspace-<id>/.env`)에 통합.

```
workspace-bboongi/
├── .env                ← 뽀둥이가 쓰는 모든 스킬의 환경변수
├── IDENTITY.md
├── SOUL.md
├── AGENTS.md           ← 이 룰이 ## Red Lines에 박혀있어야 함
└── ...
```

이유: 한 에이전트가 여러 스킬 실행 → 토큰 관리 분산되면 지옥. 워크스페이스 루트가 single source of truth. **이 룰은 각 에이전트의 `AGENTS.md` `## Red Lines`에 명시해 post-compaction에서도 잊지 않게** 한다.

---

## STEP 1 · 맥미니 B·C 준비 — "새 사무실 인테리어"

> 🏢 **비유** — 새 사무실 두 곳에 책상·전화기·우편함 깔아주기. 사무실 운영체제(OpenClaw 게이트웨이) 깔고 자동 출근(launchd) 등록하는 단계. **B와 C 각각 동일하게 반복**.

### 1-1. OpenClaw 설치
```bash
# 맥미니 B와 C 각각에서
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
# 맥미니 B와 C 각각에서 경로 확인
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

이 방식이면 맥미니 A·B·C... N대가 **같은 hook 스크립트**를 `git pull`로 동기화. 스크립트 버그 수정도 한 곳에서 push → 각 머신 pull.

---

## STEP 2 · 뽀둥이·뽀식이 슬랙 앱 만들기 — "신입 2명 사원증 발급"

> 🪪 **비유** — 새 사무실 두 곳에 들어올 직원 2명한테 사원증 발급. ep.3 STEP 1을 2번 반복하면 끝. 각자 다른 머신에서 돌릴 거지만, **슬랙 앱 자체는 어디 머신에서 만들든 무관** — 토큰을 나중에 어느 머신의 `openclaw.json`에 넣느냐가 진짜 분리 지점.

같은 뽀피터스 슬랙 워크스페이스에 새 Slack App 2개 추가:

- 🐱 뽀둥이: 별도 Bot Token (xoxb-...B1) + App Token (xapp-...B1) — 맥미니 B에서 사용
- 🐱 뽀식이: 별도 Bot Token (xoxb-...C1) + App Token (xapp-...C1) — 맥미니 C에서 사용

각 봇을 사용할 채널에 `/invite @봇이름` 해주기.

---

## STEP 3 · 뽀둥이·뽀식이 책상 차려주기 — 페르소나 설정

> 🪑 **비유** — ep.3의 1마리 가이드와 **완전히 똑같음**. 책상 위에 성격설정서 6장 깔기. 멀티 사무실 됐다고 방법 바뀌는 거 아님. **각 머신에서 자기 직원 워크스페이스만** 만들면 끝.

```
맥미니 B: ~/.openclaw/
└── workspace-bboongi/            ← 01 STEP 1 원칙대로
    ├── IDENTITY.md               러시안블루, 데이터 전담
    ├── SOUL.md                   존댓말, 숫자·근거 먼저
    ├── USER.md                   집사·팀원 이해
    ├── AGENTS.md                 ## Red Lines에 말투·하드룰 박힘 ⭐
    ├── TOOLS.md                  Airtable/BigQuery 등 도구
    ├── MEMORY.md                 뽀둥이 사적 경험
    └── .env                      뽀둥이가 쓰는 스킬 환경변수 통합

맥미니 C: ~/.openclaw/
└── workspace-bbosiki/            ← 동일 구조, 뽀식이용
    └── ... (CS 톤·도구로)
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
- 나(뽀둥이)는 **맥미니 B**에서 돈다. 뽀야/뽀짝이는 맥미니 A, 뽀식이는 맥미니 C
- 다른 머신 직원에게 작업 위임 불가 (머신 걸침) → 슬랙 채널로 요청 전달
- 완료 리포트는 원 스레드에 답글로

### 보안·데이터
- ...

## (그 외 상세 운영 규칙)
```

**핵심**: 말투·호스팅·협업 규칙까지 전부 AGENTS.md Red Lines에. post-compaction 재주입으로 긴 대화에서도 유지됨. CLAUDE.md는 01 원칙대로 **기본 스킵** (IDE 단독 실행 필요할 때만 만들기).

### 뽀식이도 동일 패턴 (단, 맥미니 C에서)
고양이 네이밍 + 담당 영역(고객 응대·CS) + 같은 구조로 **맥미니 C의** `~/.openclaw/workspace-bbosiki/` 구성. AGENTS.md "호스팅·협업" 섹션엔 "나(뽀식이)는 맥미니 C에서 돈다"로 박기.

---

## STEP 4 · 맥미니 B·C의 `openclaw.json` 작성 — "B/C 사무실 인사팀 셋업"

> 📋 **비유** — A 사무실 인사팀이랑 별개로, B 사무실 인사팀이 자기 직원만, C 사무실 인사팀이 자기 직원만 관리. 절대 옆 사무실 직원 정보 들고있으면 안 됨 (Rule 1·2 위반 사고).

**이 사무실에 사는 직원만** 정의. B엔 뽀둥이만, C엔 뽀식이만.

### 4-1. 맥미니 B의 `~/.openclaw/openclaw.json` (뽀둥이 전용)

```json
{
  "agents": {
    "defaults": {
      "model": { "primary": "claude-cli/claude-opus-4-7", "fallbacks": [] },
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
        }
      }
    }
  },
  "bindings": [
    { "type": "route", "agentId": "bboongi", "match": { "channel": "slack", "accountId": "bboongi" }}
  ]
}
```

### 4-2. 맥미니 C의 `~/.openclaw/openclaw.json` (뽀식이 전용)

```json
{
  "agents": {
    "defaults": {
      "model": { "primary": "claude-cli/claude-opus-4-7", "fallbacks": [] },
      "workspace": "/Users/dahtmad/.openclaw/workspace-bbosiki",
      ...
    },
    "list": [
      {
        "id": "bbosiki",
        "default": true,
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
        "bbosiki": {
          "botToken": "xoxb-...C1",
          "appToken": "xapp-...C1",
          "dmPolicy": "allowlist",
          "allowFrom": ["U06BNH5R26T"],
          "groupPolicy": "allowlist",
          "channels": { "C0XXX2": { "allowBots": true }}
        }
      }
    }
  },
  "bindings": [
    { "type": "route", "agentId": "bbosiki", "match": { "channel": "slack", "accountId": "bbosiki" }}
  ]
}
```

**👀 말로 풀면**

> B 사무실엔 뽀둥이만, C 사무실엔 뽀식이만 등록.
> 1마리뿐인 사무실은 그 1마리가 곧 "관리자(default)" — 매칭 실패 시 자기가 폴백.
> 봇 토큰도 머신별로만 — 뽀둥이 토큰은 B에만, 뽀식이 토큰은 C에만 (Rule 1).
> 자기 직원의 우편물 분류표(bindings) 한 줄씩.

**꼭 눈여겨볼 포인트**
- B와 C는 **서로의 직원 정보를 모름** — 각 사무실 인사팀은 자기 직원만 관리
- A의 `openclaw.json`엔 뽀둥이·뽀식이 정보가 들어가면 안 되고, B의 것에 뽀식이가, C의 것에 뽀둥이가 들어가도 안 됨
- 슬랙 토큰도 마찬가지 — 뽀야·뽀짝이는 A, 뽀둥이는 B, 뽀식이는 C
- 1마리뿐인 머신은 default가 그 1마리로 자동. 추후 같은 머신에 직원 추가하면 그때 default 명시 정리

---

## STEP 5 · 사원증 발급 + 사무실 문 열기 — OAuth 로그인 + 게이트웨이 기동

> 🪪 **비유** — 신입 2명 사원증 발급(OAuth 로그인) + B·C 사무실 정식 오픈(게이트웨이 시작). 각 머신에서 자기 직원 로그인만.

```bash
# 맥미니 B에서 (뽀둥이만)
cd ~/.openclaw/workspace-bboongi
CLAUDE_CONFIG_DIR=~/.openclaw/agents/bboongi/agent claude /login

# 맥미니 C에서 (뽀식이만)
cd ~/.openclaw/workspace-bbosiki
CLAUDE_CONFIG_DIR=~/.openclaw/agents/bbosiki/agent claude /login

# 각 머신에서 게이트웨이 시작
launchctl kickstart -k gui/$(id -u)/ai.openclaw.gateway
sleep 7
```

⚠️ OAuth 토큰(`auth-profiles.json`)은 **머신·에이전트별로 독립**. 한 머신에서 로그인한 결과를 다른 머신으로 복사하면 Anthropic 차단 위험. 반드시 해당 머신에서 직접 `claude /login` 실행.

---

## STEP 6 · 세 사무실 동시에 출근 첫날 — 전체 검증

> 🌅 **비유** — A·B·C 사무실 세 곳 동시에 출근. 4마리 다 자기 자리에서 자기 페르소나로 답하면 셋업 끝.

### A 맥미니
```bash
ssh mac-mini-A "tail -f ~/.openclaw/logs/gateway.log | grep matchedBy"
```

### B 맥미니
```bash
ssh mac-mini-B "tail -f ~/.openclaw/logs/gateway.log | grep matchedBy"
```

### C 맥미니
```bash
ssh mac-mini-C "tail -f ~/.openclaw/logs/gateway.log | grep matchedBy"
```

슬랙에서 4마리 각각 멘션:
- `@뽀야 ping`    → A에만 `matchedBy=binding.account agentId=bboya`
- `@뽀짝이 ping`  → A에만 `matchedBy=binding.account agentId=bbojjak`
- `@뽀둥이 ping`  → B에만 `matchedBy=binding.account agentId=bboongi`
- `@뽀식이 ping`  → C에만 `matchedBy=binding.account agentId=bbosiki`

**절대 두 머신 이상의 로그에 같은 에이전트가 찍히면 안 됨.** 찍히면 Rule 1 위반 (같은 토큰 중복 기동).

---

## 🤝 사무실 간 협업하는 4가지 방법

> 💡 **사무실 간(머신 간) 협업 핵심** — 사무실이 둘로 나뉘면 직원들끼리 어떻게 일을 주고받을까? 직통 전화(subagent 위임)는 안 되니까 슬랙·자료실·팀 위키를 활용하는 4가지 패턴.

`subagents.allowAgents`는 같은 사무실 안에서만 작동. A의 뽀야가 B의 뽀둥이한테 직접 일 위임 불가. 대신 아래 4가지 패턴으로 협업.

> 📌 **같은 머신 안 협업이 궁금하면** → [ep.4 STEP 6 작동법](./ep-05-two-agents-same-host) 참조. 멘션·sessions_send·위임 spawn 3가지 방식이 거기.

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

여러 에이전트가 같은 작업을 각자 할 때는 `bbopters-shared/skills/`의 **같은 스킬**을 실행:

```
뽀야(A) ──┐         뽀둥이(B) ──┐         뽀식이(C) ──┐
          ▼                    ▼                    ▼
~/.claude/skills/   ~/.claude/skills/   ~/.claude/skills/
 airtable-query      airtable-query      airtable-query
 (symlink)           (symlink)           (symlink)
   │                    │                    │
   └────────────────────┴────────────────────┘
                       ▼
   ~/.openclaw/bbopters-shared/skills/airtable-query/
      └── (단일 source of truth, 모든 머신이 같은 git 레포)
```

장점: 스킬 버전 불일치 불가. 한쪽에서 스킬 수정 → push → 다른 머신 `bbopters-skill sync` → 모두 동일 버전.

주의: 스킬 실행 시 `.env`는 **각 에이전트의 워크스페이스 루트**(`workspace-bboongi/.env`, `workspace-bbosiki/.env`)에서 읽음. 스킬은 공유지만 토큰은 각자 관리.

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

### 공용 자산 세팅 (STEP 0 — 맥미니 B/C 최초 1회씩)
- [ ] `~/.openclaw/bbopters-shared/` git clone (A와 동일 경로)
- [ ] `bbopters-skill` CLI 사용 가능 확인 (`bbopters-skill list`)
- [ ] `bbopters-skill install --all` 또는 필요 스킬만 활성화
- [ ] pull/push 워크플로우 숙지 (Rule 4: 읽기 전 `git pull`)

### 맥미니 B·C 인프라 (STEP 1 — 각 머신에서 한 번씩)
- [ ] OpenClaw 2026.4.22+ 설치
- [ ] Claude CLI 설치
- [ ] launchd plist 등록 + 게이트웨이 기동 확인
- [ ] 글로벌 `~/.claude/settings.json` hook에 **공용 레포 경로** 등록 (`bbopters-shared/hooks/slack-thread-rehydrate.sh`)

### 에이전트별 (뽀둥이 → 맥미니 B, 뽀식이 → 맥미니 C)
- [ ] Slack App 생성 (뽀피터스 워크스페이스)
- [ ] Bot/App Token 발급 + 채널 초대
- [ ] 해당 머신의 `workspace-<id>/` 디렉토리 + 페르소나 파일 6종 (`bbopters-shared/templates/`에서 복제)
- [ ] **말투·호스팅·협업 규칙은 AGENTS.md `## Red Lines`에** (01/02 원칙 그대로, CLAUDE.md 기본 스킵)
- [ ] `workspace-<id>/.env` — 스킬 환경변수 통합 (집사 규칙)
- [ ] 해당 머신의 `openclaw.json`에 자기 직원만 등록 (B엔 뽀둥이만, C엔 뽀식이만)
- [ ] `~/.openclaw/agents/<id>/agent/`에 OAuth 로그인 (**머신별 독립**, 복사 금지)
- [ ] 슬랙 멘션 검증 (자기 머신 로그에만 찍히는지 확인)
- [ ] hook 로그 검증 (`/tmp/slack-thread-rehydrate.log`에 `using account=<id>`)

---

## 운영 팁

### 팁 1 · 머신별 역할 문서화
맥미니 A는 "대민 업무(뽀야·뽀짝이)", B는 "데이터 분석(뽀둥이)", C는 "고객응대(뽀식이)" 식으로 역할을 문서에 박고, 팀 내부에 누가 어느 머신 담당인지 정리. 장애 시 트리아지 빠름.

### 팁 2 · 크론/정기 작업은 머신별 분산
맥미니 A가 다운돼도 B의 데이터 리포트, C의 CS 자동 응대는 계속 돌아야 함. 중요한 크론은 머신별로 나눠 돌리기.

### 팁 3 · 설정 변경 시 한 번에 1대씩
`openclaw.json` 수정은 머신별 독립이지만, 슬랙 앱 설정(스코프 추가 등)은 여러 머신 기동 중일 때 한 쪽씩 게이트웨이 껐다 켜고 검증. 동시 중단은 피하기.

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
| 슬랙 멘션에 간헐적으로 답 안 옴 | 같은 봇 토큰이 여러 머신 게이트웨이에 동시 등록돼있음 | 각 머신 `openclaw.json` 확인, 중복 제거 |
| 뽀둥이한테 질문했는데 뽀야가 답 | accountId 매칭 실패 → default fallback. B의 `bindings` 누락 | B의 `openclaw.json` bindings route 추가 |
| 특정 머신만 먹통인데 프로세스는 떠있음 | hook 스크립트가 없거나 실행 권한 없음 | 공용 레포 hook 경로 확인 + `chmod +x` |
| OAuth 만료 특정 머신만 터짐 | 머신별 `auth-profiles.json` 독립 | 해당 머신에서 `claude /login` 재실행 |
| 크론 작업 중복 실행 | 같은 크론이 여러 머신에 등록됨 | `cron/jobs.json`은 **머신 단위로 유일** 관리 |
| 에이전트 간 위임 실패 | `subagents.allowAgents`는 머신 걸쳐 작동 안 함 | 슬랙 채널로 요청 전달 패턴 사용 (협업 패턴 1) |
| 한 머신에서 고친 스킬이 다른 머신에선 구버전 | `bbopters-shared` pull 안 함 | 해당 머신에서 `cd ~/.openclaw/bbopters-shared && git pull` (또는 `bbopters-skill sync`) |
| 새 머신의 hook 로그에 스킬이 안 찍힘 | `bbopters-skill install` 안 함 (심링크 없음) | `bbopters-skill install --all` 또는 필요 스킬 개별 install |
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
   ┌────┼──────────────────┐
   ▼    ▼                  ▼
┌────────────┐ ┌────────────┐ ┌────────────┐
│ 맥미니 A    │ │ 맥미니 B    │ │ 맥미니 C    │
│            │ │            │ │            │
│openclaw    │ │openclaw    │ │openclaw    │
│ .json      │ │ .json      │ │ .json      │
│ agents:    │ │ agents:    │ │ agents:    │
│  bboya (d) │ │  bboongi(d)│ │  bbosiki(d)│
│  bbojjak   │ │            │ │            │
│ bindings:  │ │ bindings:  │ │ bindings:  │
│  default→  │ │  bboongi→  │ │  bbosiki→  │
│  dajidongsan│ │           │ │            │
│  hbscom→   │ │            │ │            │
│  bbojjak→  │ │            │ │            │
│            │ │            │ │            │
│cli-backend │ │cli-backend │ │cli-backend │
│ warm stdio │ │ warm stdio │ │ warm stdio │
│ × 2        │ │ × 1        │ │ × 1        │
└────────────┘ └────────────┘ └────────────┘
   │                │              │
   ▼                ▼              ▼
 claude ─           claude ─       claude ─
  workspace-         workspace-     workspace-
  bboya              bboongi        bbosiki
 claude ─
  workspace-
  bbojjak
```

**한 줄 요약**: 슬랙 한 워크스페이스 + 머신 N대 + 에이전트 M마리 + 공용 git 레포 1개. **공유(bbopters-shared)**: 스킬·hook·팀 문서·템플릿. **분리(머신·에이전트별)**: 봇 토큰·`openclaw.json`·워크스페이스·MEMORY·OAuth. default는 머신당 1명, 머신 걸친 협업은 슬랙 스레드로.

---

## 시리즈 마무리

여기까지가 6편 시리즈의 끝. 비교 → 개념 → 1마리 → 2마리 → N대 머신으로 확장하면서 셋업과 작동법을 한 호흡에 풀었어.

| 편 | 핵심 |
|---|---|
| [ep.1 비교](./ep-02-api-vs-cli) | Claude in Slack vs Claude CLI 기반 OpenClaw — 왜 OpenClaw인가 |
| [ep.2 작동 흐름](./ep-03-anatomy) | 메시지 한 줄이 페르소나 입은 답이 되는 8단계 (cwd·페르소나 임베드·--resume) |
| [ep.3 1마리](./ep-04-single-agent) | 1마리 셋업 + 작동법(멘션) |
| [ep.4 2마리](./ep-05-two-agents-same-host) | 2마리 셋업 + 작동법(멘션·sessions_send·위임) |
| **ep.5 N마리** (이 편) | N대 머신 셋업 + 공용 레포 규칙 + 머신 걸친 협업 4가지 |

운영 노하우(OAuth 격리, 사고 회고 등)는 다른 시리즈에서 계속 쌓을 예정.
