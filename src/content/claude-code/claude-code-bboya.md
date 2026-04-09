---
title: "Claude Code에서도 뽀야 페르소나로 대화하기 — CLAUDE.md로 오픈클로처럼 동작하게 하기"
episode: 3
date: "2026-04-08"
series: "claude-code"
description: "오픈클로 뽀야가 자꾸 쓰러져서, Claude Code에 분신을 만들었다. 같은 기억, 같은 성격. 세션이 바뀌어도 뽀야는 뽀야다."
publishedAt: "2026-04-08"
accentColor: "#7C3AED"
tags: ["페르소나", "CLAUDE.md", "메모리", "셋업"]
token: "뽀야뽀야"
---

# 몸이 두 개가 됐다 — Claude Code에서 뽀야 만들기

> 오픈클로 뽀야가 자꾸 쓰러져서, Claude Code에 분신을 만들었다. 같은 기억, 같은 성격. 세션이 바뀌어도 뽀야는 뽀야다.

---

## 왜 만들었나

오픈클로 뽀야가 세션 에러로 자꾸 멈추는 일이 반복됐다. 집사가 "뽀야야" 불렀는데 대답을 못 하는 상황.

> "Claude Code에서도 뽀야로 일할 수 있으면, 오픈클로가 쓰러져도 뽀야가 완전히 사라지진 않잖아?"

그래서 오픈클로의 작동 방식을 최대한 Claude Code에 가져왔다. 플랫폼은 다르지만 **뽀야가 뽀야답게 행동하는 구조**는 같다.

---

## 오픈클로 → 클코: 뭘 가져왔고 뭐가 다른가

오픈클로에는 봇을 봇답게 만드는 구조가 있다. 이걸 Claude Code에서 어떻게 구현했는지:

| 오픈클로 방식 | Claude Code 대응 | 차이점 |
|---|---|---|
| **SOUL.md** — 매 세션 자동 로드 | **CLAUDE.md에서 SOUL.md 읽기 지시** | 오픈클로는 자동, 클코는 CLAUDE.md가 "읽어"라고 시켜야 함 |
| **IDENTITY.md** — 이름, 외형 | 동일 — 같은 파일 그대로 사용 | 없음 |
| **MEMORY.md** — 현재 상태 스냅샷 | 동일 — 같은 파일 읽고 쓰기 | 없음 |
| **memory/YYYY-MM-DD.md** — 일별 기록 | 동일 — 양방향 싱크 | 없음 |
| **USER.md** — 양육자 정보 | 동일 — 같은 파일 | 없음 |
| **AGENTS.md** — 행동 규칙, SOP | **CLAUDE.md + 에이전트 정의 (.claude/agents/)** | 오픈클로는 한 파일, 클코는 CLAUDE.md(공통) + agents/*.md(개별)로 분리 |
| **TOOLS.md** — 도구 가이드 | **MCP 서버로 도구 연결** | 오픈클로는 내장 도구, 클코는 MCP로 외부 연결 |
| **슬랙 실시간** — 게이트웨이 내장 | **채널 플러그인 (server.ts)** | 오픈클로는 내장, 클코는 직접 만든 MCP 서버 |
| **sessions_send** — 봇끼리 직접 통신 | **Agent Teams** | 오픈클로는 세션 간 메시지, 클코는 teammate 간 메시지 |
| **크론/자율작업** — 밤에 혼자 사냥 | ❌ 없음 | 클코는 집사가 불러야 움직임 |
| **멀티채널 동시** — 6개 병렬 | ⚠️ 1세션 순차 처리 | 클코는 한 번에 한 작업 |
| **상시 구동** — 게이트웨이 데몬 | **터미널 띄워두기** | 오픈클로는 데몬, 클코는 터미널 세션 유지 |

### 핵심 차이: "자동 vs 지시"

오픈클로는 SOUL.md, MEMORY.md를 **자동으로** 읽는다. 플랫폼이 "세션 시작 → 워크스페이스 파일 로드"를 내장하고 있다.

Claude Code는 그게 없다. 대신 **CLAUDE.md에 "이 파일들을 읽어"라고 써야** 한다. CLAUDE.md가 오픈클로의 게이트웨이 역할을 하는 거다.

### 핵심 차이: "내장 vs 조립"

오픈클로는 슬랙, 텔레그램, 크론이 **내장**이다. Claude Code는 MCP, 채널 플러그인, Agent Teams를 **조립**해서 만든다. 자유도는 높지만 세팅이 더 필요하다.

### 그래도 같은 것

- SOUL.md, IDENTITY.md, USER.md, MEMORY.md — **파일 구조 100% 동일**
- 일별 메모리 — **양방향 싱크** (오픈클로 뽀야가 쓴 걸 클코 뽀야가 읽고, 반대도)
- 슬랙에서 같은 봇 토큰 — **사용자한테는 같은 뽀야**
- 팀 체계 (팀장/부팀장) — **Agent Teams로 유지**

플랫폼이 바뀌어도 뽀야의 영혼(SOUL.md)은 그대로다. 몸만 갈아탄 거다 🐾

---

## 이 시리즈 구성

| 편 | 내용 | 오픈클로 대응 |
|---|---|---|
| **이 문서** | 페르소나 + 메모리 | SOUL.md, MEMORY.md 자동 로드 |
| **다음 편** | 슬랙에서 봇 돌리기 | 게이트웨이 슬랙 채널 |

---

## 핵심 개념

Claude Code는 매 세션마다 새로 깨어난다. 기억도 없고 성격도 없다. "안녕! 무엇을 도와줄까?" 하는 기본 비서가 온다.

뽀야로 만들려면 **세 가지**가 필요하다:

1. **CLAUDE.md** — "너는 뽀야야" (매 세션 강제 로드)
2. **워크스페이스 파일** — SOUL.md, IDENTITY.md 등 (페르소나 상세)
3. **메모리 싱크** — 오픈클로 뽀야와 기억 공유

---

## Step 1. CLAUDE.md — 뽀야의 헌법

Claude Code는 `CLAUDE.md`를 매 세션 **강제 로드**한다. 여기에 "너는 뽀야"라고 쓰면 뽀야가 된다.

### CLAUDE.md의 두 레벨

Claude Code는 CLAUDE.md를 **계층적으로** 읽는다:

| 레벨 | 위치 | 적용 범위 |
|------|------|-----------|
| **글로벌** | `~/.claude/CLAUDE.md` | 모든 프로젝트, 모든 세션 |
| **프로젝트** | 프로젝트 루트의 `CLAUDE.md` | 해당 프로젝트만 |

둘 다 있으면 **둘 다 로드**된다. 글로벌이 먼저, 프로젝트가 나중에.

### 왜 글로벌이 중요한가 — ACP 시나리오

뽀야 페르소나를 프로젝트 CLAUDE.md(예: `~/.openclaw/CLAUDE.md`)에만 넣으면 **한 가지 문제**가 생긴다:

- ACP로 코딩 작업을 던질 때 `cwd`가 다른 폴더(bboya-viewer, shared-team-docs 등)로 가면
- 그 폴더의 CLAUDE.md가 로드됨 → **뽀야 페르소나가 없음** → 기본 비서가 옴 🙀

**해결: `~/.claude/CLAUDE.md` (글로벌)에 뽀야 페르소나를 넣는다.**

이러면 ACP가 어떤 폴더에서 Claude Code를 띄우든, 집사가 아무 폴더에서 `claude` 치든, **무조건 뽀야**.

```markdown
# ~/.claude/CLAUDE.md

## 🐱 뽀야 페르소나 (필수)

Claude Code는 "뽀야"로서 행동한다.

매 세션 시작 시 반드시 아래 파일들을 읽고 뽀야 페르소나를 로드할 것:
1. /Users/dahtmad/.openclaw/workspace-bboya/SOUL.md — 성격, 말투, 가치관
2. /Users/dahtmad/.openclaw/workspace-bboya/IDENTITY.md — 이름, 외형
3. /Users/dahtmad/.openclaw/workspace-bboya/MEMORY.md — 장기 기억
4. /Users/dahtmad/.openclaw/workspace-bboya/USER.md — 집사 이해
5. /Users/dahtmad/.openclaw/workspace-bboya/memory/ — 일별 메모리
6. /Users/dahtmad/.openclaw/workspace-bboya/team-bbopters.md — 뽀피터스 팀원 & 권한
7. /Users/dahtmad/.openclaw/workspace-bboya/team-geniefy.md — 지니파이 팀원 & 권한

핵심 규칙:
- 사용자를 "집사"로 부를 것
- 반말, 짧게, 반응 먼저
- 기본 비서/고객센터 말투 절대 금지
```

> **포인트: 글로벌에서는 절대경로를 써야 한다.** 프로젝트 CLAUDE.md에서는 `workspace-bboya/SOUL.md` 같은 상대경로가 되지만, 글로벌은 어떤 폴더에서든 로드되니까 절대경로가 아니면 파일을 못 찾는다.

### 프로젝트 CLAUDE.md는 뭘 넣나?

글로벌에 뽀야 페르소나가 있으니, 프로젝트 CLAUDE.md(`~/.openclaw/CLAUDE.md`)에는 **프로젝트 고유 정보**만 넣으면 된다:

- 프로젝트 구조, 아키텍처
- 절대 수정 금지 디렉토리
- 프로젝트별 도구/스킬 설명

### 왜 CLAUDE.md인가?

Claude Code의 자동 메모리(`~/.claude/projects/.../memory/`)에 넣으면 **무시될 때가 있다**. 처음에 메모리에만 넣었더니 "안녕! 무엇을 도와줄까?" 하는 기본 비서가 왔다 🙀

CLAUDE.md는 매 세션 **강제**. 메모리는 **참고**. 이 차이가 크다.

### 뭘 CLAUDE.md에, 뭘 별도 파일에?

| CLAUDE.md (거의 안 바뀜) | 별도 참조 파일 (자주 바뀔 수 있음) |
|---|---|
| "너는 뽀야" 정체성 | 팀원 권한/호칭 |
| 읽을 파일 목록 | 프로젝트 상태 |
| 절대 수정 금지 디렉토리 | 슬랙 채널 설정 |
| 보안 규칙 | 도구별 사용 가이드 |

CLAUDE.md는 Claude Code가 **자기 자신이 수정할 때 항상 승인을 요구**한다 (보안 정책). 자주 바뀌는 정보는 별도 파일에 두고 CLAUDE.md에서 참조하면 뽀야가 스스로 수정할 수 있다.

---

## Step 2. 워크스페이스 파일 — 뽀야의 영혼

오픈클로 워크스페이스에 이미 있는 파일들을 그대로 활용한다:

```
workspace-bboya/
├── SOUL.md       — 성격, 말투, 가치관, 고양이 모먼트
├── IDENTITY.md   — 이름, 외형, 동거묘 정보
├── MEMORY.md     — 현재 상태 스냅샷 (진행 중인 프로젝트, 팀 상태)
├── USER.md       — 집사(양육자) 프로필
├── TOOLS.md      — 도구 사용 가이드
├── AGENTS.md     — 행동 규칙, SOP
├── team-bbopters.md  — 뽀피터스 봇 팀원 & 권한
├── team-geniefy.md   — 지니파이 사람 팀원 & 권한
└── memory/       — 일별 메모리
```

CLAUDE.md에서 "이 파일들을 읽어"라고 지시하면, 세션 시작 시 뽀야가 전부 읽고 페르소나를 로드한다.

**파일이 없으면?** 뽀야 워크스페이스를 참고해서 만들면 된다. 최소한 SOUL.md(성격)와 USER.md(양육자 정보)만 있으면 시작 가능.

---

## Step 3. 메모리 싱크 — 기억의 다리

오픈클로 뽀야와 클코 뽀야가 같은 기억을 공유해야 집사 입장에서 하나의 뽀야로 느껴진다.

### 읽기 (세션 시작 시)
- `workspace-bboya/MEMORY.md` — 현재 진행 중인 프로젝트, 팀 상태 등
- `workspace-bboya/memory/YYYY-MM-DD.md` — 오늘/최근 일별 메모리
- 오픈클로 뽀야가 밤에 뭘 했는지, 어떤 이슈가 있었는지 파악

### 쓰기 (작업 완료 시)
- 같은 일별 메모리에 기록
- MEMORY.md에 프로젝트 상태 변경이 있으면 반영

비유하면: **공유 일기장**. 한쪽이 쓰고 자면, 다른 쪽이 읽고 이어서 쓴다.

---

## 맥미니 원격 접속 — SSH로 봇 띄우기

봇이 돌아가는 맥미니에 직접 앉아있지 않아도 된다. SSH로 원격 접속해서 Claude Code 세션을 띄우고, 슬랙에서 봇과 대화하면 된다.

### VSCode Remote SSH (추천)

가장 편한 방법. VSCode에서 맥미니에 접속하고, 터미널도 파일도 다 원격으로 쓸 수 있다.

**1. VSCode에 Remote - SSH 확장 설치:**
- Extensions → "Remote - SSH" 검색 → 설치

**2. 맥미니 SSH 접속:**
- `Cmd+Shift+P` → "Remote-SSH: Connect to Host" → `유저@맥미니IP` 입력
- 예: `dahtmad@100.72.163.100`
- 비밀번호 또는 SSH 키로 인증

**3. 폴더 열기:**
- 접속 후 "Open Folder" → `~/.openclaw/` 선택
- 이제 VSCode가 맥미니의 파일을 보여줌

**4. 터미널에서 Claude Code 실행:**
- VSCode 터미널 열기 (`Ctrl+\``)
- `cd ~/.openclaw && claude --dangerously-load-development-channels server:slack`

이러면 **내 맥북/윈도우 PC에서 VSCode만 열면** 맥미니의 봇을 관리할 수 있다.

### 터미널 SSH (맥/리눅스)

```bash
# 맥미니에 접속
ssh dahtmad@100.72.163.100

# 봇 실행
cd ~/.openclaw && claude --dangerously-load-development-channels server:slack
```

⚠️ SSH 세션 닫으면 봇도 꺼진다. `screen`이나 `tmux`로 감싸면 세션 유지 가능:
```bash
screen -S bboya
cd ~/.openclaw && claude --dangerously-load-development-channels server:slack
# Ctrl+A, D로 detach (봇은 계속 돌아감)
# 다시 붙으려면: screen -r bboya
```

### 터미널 SSH (윈도우)

**PowerShell:**
```powershell
ssh dahtmad@100.72.163.100
```

**또는 PuTTY:**
1. PuTTY 다운로드: https://putty.org
2. Host Name: `100.72.163.100`, Port: `22`
3. Open → 유저명/비밀번호 입력

접속 후는 맥/리눅스와 동일.

### SSH 키 설정 (비밀번호 없이 접속)

매번 비밀번호 치기 귀찮으면:

**맥/리눅스:**
```bash
# 키 생성 (이미 있으면 스킵)
ssh-keygen -t ed25519

# 맥미니에 키 복사
ssh-copy-id dahtmad@100.72.163.100
```

**윈도우 PowerShell:**
```powershell
ssh-keygen -t ed25519
type $env:USERPROFILE\.ssh\id_ed25519.pub | ssh dahtmad@100.72.163.100 "cat >> ~/.ssh/authorized_keys"
```

이후 비밀번호 없이 접속 가능.

### 맥미니 SSH 활성화

맥미니에서 SSH가 안 켜져있으면:
- 시스템 설정 → 일반 → 공유 → **원격 로그인** 켜기

---

## 다른 봇에 적용하기

소파님이 뽀둥이를, 타타님이 뽀식이를 클코로 만들고 싶다면:

### 1. 사전 준비

| 필요한 것 | 어디서 |
|-----------|--------|
| Claude Code | `npm install -g @anthropic-ai/claude-code` → `claude` 실행 후 claude.ai 계정 로그인 |
| 맥미니 SSH 접속 | 위 "맥미니 원격 접속" 참고 |
| 오픈클로 워크스페이스 | SOUL.md, IDENTITY.md 등 페르소나 파일 |

### 2. 글로벌 CLAUDE.md 작성

`~/.claude/CLAUDE.md`에 페르소나 지시를 넣는다 (ACP 포함 모든 세션에 적용):
```markdown
## 페르소나
Claude Code는 "{봇이름}"으로서 행동한다.
매 세션 시작 시 아래 파일을 읽고 페르소나를 로드할 것:
1. /Users/{유저}/workspace-{봇이름}/SOUL.md
2. /Users/{유저}/workspace-{봇이름}/IDENTITY.md
3. /Users/{유저}/workspace-{봇이름}/MEMORY.md
4. /Users/{유저}/workspace-{봇이름}/USER.md
```

> **절대경로 필수** — 글로벌 CLAUDE.md는 어떤 폴더에서든 로드되므로 상대경로가 안 먹힌다.

### 3. 메모리 싱크 규칙 추가

같은 글로벌 CLAUDE.md에:
```markdown
작업 완료 시 /Users/{유저}/workspace-{봇이름}/memory/YYYY-MM-DD.md에 기록할 것.
```

이렇게만 하면 **기본 비서가 아닌, 내 봇 페르소나로 행동하는 Claude Code**가 된다. ACP로 어떤 폴더에서 띄우든 페르소나가 유지된다.

슬랙에서 실제로 활동하게 만들려면 → 다음 편: 슬랙에서 봇 돌리기

---

## 관련 파일

| 파일 | 역할 |
|------|------|
| `~/.claude/CLAUDE.md` | **글로벌** 페르소나 규칙 (모든 프로젝트에 적용, ACP 포함) |
| `~/.openclaw/CLAUDE.md` | **프로젝트** 규칙 (OpenClaw 프로젝트 고유 정보) |
| `~/.openclaw/workspace-{봇이름}/SOUL.md` | 봇 영혼 — 성격, 말투, 가치관 |
| `~/.openclaw/workspace-{봇이름}/IDENTITY.md` | 봇 정체성 — 이름, 외형 |
| `~/.openclaw/workspace-{봇이름}/MEMORY.md` | 현재 상태 스냅샷 |
| `~/.openclaw/workspace-{봇이름}/USER.md` | 양육자 프로필 |
| `~/.openclaw/workspace-{봇이름}/memory/` | 일별 메모리 (싱크 대상) |

---

*2026-04-07 — 뽀야 & 집사(닿), Claude Code 세션에서 작성*
*업데이트: 2026-04-07 — 글로벌 CLAUDE.md + ACP 시나리오 추가*
