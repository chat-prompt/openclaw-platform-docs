---
title: "ACP 우회 시기를 지나 — 우리가 Claude CLI 방식으로 넘어온 이야기"
episode: 1
date: "2026-04-25"
series: case-studies
category: "Slack × Claude CLI 멀티에이전트"
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

## 🤔 잠깐 — 그냥 `claude` 치면 되지, 왜 OpenClaw가 필요해?

답은 **두 단계**로 나뉘어:

> **Step 1 — 혼자야, 팀이야?** (협업 관점)
> - 혼자라면 → 터미널에서 `claude` 단독으로 충분
> - 팀이라면 → 슬랙에 봇으로 붙여야 협업 가능
>
> **Step 2 — 슬랙에 붙이는 두 갈래** (페르소나·철학 관점)
> 여기서 **진짜 차이**가 나와. 표면적으론 둘 다 슬랙 봇이지만 **철학이 정반대**.

---

### 🌐 두 슬랙 모델 — 철학이 정반대

| | **Claude in Slack** (Anthropic 공식) | **OpenClaw** |
|---|---|---|
| **철학 한 줄** | 각자 자기 Claude를 **슬랙으로 끌어오기** | Claude를 **페르소나 가진 팀원**으로 만들기 |
| **봇이 팀원인가** | ❌ 개인 도구. 협업 가시성만 공유 | ✅ 진짜 팀원. 페르소나·메모리·스킬 보유 |
| **슬랙에 사는 봇** | `@Claude` 1마리 (Anthropic 공식 봇, 이름 고정) | `@뽀야`/`@뽀짝이`/... N마리 (집사가 만듦, 자유 이름) |
| **봇 뒤에서 일하는 Claude는?** | **멘션한 사람 본인** Claude (사용자별 분리) | **봇 양육자 1명** Claude (봇별 고정) |
| **다혜·진우 동시 멘션** | 각자 본인 Claude 세션 spawn (한도 분리) | 둘 다 **봇 양육자 1명 Claude**로 (한도 공유) |
| **팀원이 쓰려면** | 자기 Claude 계정 연결 필수 | 자기 Claude 없어도 OK (봇이 양육자 Claude로 일함) |

→ **"진짜 팀원 봇" 모델은 OpenClaw에서만 가능**. 이 시리즈가 그걸 어떻게 만드는지 풀어줘.

비유로 정리:

- **Claude in Slack 봇** = 슬랙 채팅창에 안내데스크 1개. 다혜가 누르면 다혜 사무실 문 열림 → 다혜 Claude 출근. 진우가 누르면 진우 사무실 문 → 진우 Claude. **공동 출입구 + 사용자별 사무실**
- **OpenClaw 봇** = 진짜 직원 1명이 슬랙에 출근. 양육자(다혜)가 만든 봇한테 진우가 일 시켜도 **봇 = 다혜 Claude** 그대로 일함. **공용 직원**

---

### Claude Code를 쓰는 3가지 시나리오

#### 시나리오 1️⃣ — 그냥 터미널에서 `claude` 단독

```
🙋 사람 → 내 노트북 터미널 → claude 입력 → 1:1 대화
```

- 1:1 대화. **사람이 옆에 있어야** 작동
- **로컬 파일 직접 수정 강력** (Bash·파일시스템 자유)
- 슬랙 연결 X
- 노트북 닫으면 끝
- 비유: 내 노트북 안에서 일하는 도구. 휴대폰 비서 앱 — 내가 앱 켤 때만

#### 시나리오 2️⃣ — Claude in Slack (각자 자기 Claude를 슬랙으로)

> Anthropic이 공식 운영하는 [Claude in Slack](https://code.claude.com/docs/en/slack) 통합. 슬랙 워크스페이스에 봇 install + 각 팀원이 자기 Claude 계정 연결.

```
다혜 멘션 → @Claude → claude.ai/code (Anthropic 클라우드) → 다혜 Claude 세션 → 답장
진우 멘션 → @Claude → claude.ai/code (Anthropic 클라우드) → 진우 Claude 세션 → 답장
                  ↑ 봇 1마리지만 멘션자별로 다른 Claude 인스턴스
```

- **Anthropic 클라우드에서 작동** — 24시간 자동, 노트북 꺼져도 OK
- **사용자별 분리** — 각자 본인 Claude 한도, 본인 GitHub repo
- **PR 1개씩** — 한 세션 = 한 PR (GitHub repo 필수)
- 보안·권한·인프라 → Anthropic 관리 (마음 편함)
- **DM X**, 채널만

⛔ **결정적 한계 — "팀 공용 페르소나 봇" 자체가 개념적으로 불가능**:

- 봇 이름 = `@Claude` 고정 (커스텀 페르소나 X)
- 봇이 응대할 때 **멘션한 사람 본인의 Claude**로 작동 → 다른 사람한테 같은 Claude를 빌려줄 수 없음
- "**뽀야 1마리를 팀 공용으로**" 쓰는 게 아니라 "**각자 자기 Claude를 슬랙에서 쓰는**" 모델

비유: 슬랙 채널에서 각자 자기 vscode 펴고 코딩하는 거랑 가까워. **협업 가시성**(스레드로 진행 공유)은 있지만, **봇 자체가 팀 멤버는 아님**.

#### 시나리오 3️⃣ — OpenClaw + Claude CLI (이 시리즈가 다루는 방식)

```
슬랙·텔레그램·웹훅
       ↓
OpenClaw 게이트웨이 (24시간 데몬, 양육자 머신에서 작동)
       ↓
bindings 라우팅 → 각 봇 워크스페이스(cwd)
       ↓
cli-backend가 각자 Claude CLI 병렬 spawn (양육자 OAuth로)
       ↓
페르소나 자동 주입 → 봇별 답변
```

- **24시간 데몬** (launchd로 자동 복구) — 양육자 머신은 켜져있어야 함
- **봇 N마리** — `@뽀야`, `@뽀짝이`, `@뽀둥이`... 양육자별로 만들 수 있음
- **봇 = 팀원** — 페르소나·메모리·스킬·OAuth를 보유한 진짜 직원
- **양육자 Claude 한도 공유** — 양육자 1명 구독으로 팀 전체 응대 (단 한도 빨리 닳음)
- **DM·다채널 지원** — 텔레그램·웹훅 등
- **봇끼리 협업·위임** — 같은 머신 내 sessions_send / 위임 spawn
- **세팅 난이도 ↑** — 그래서 이 시리즈가 필요한 거고

비유: **양육자 Claude를 봇으로 패키징해서 회사에 출근시킴**. 팀원이 그 봇한테 일 시키면 양육자 Claude가 처리. 봇이 진짜 직원처럼 페르소나·기억·스킬을 가짐.

---

### 3-way 비교표

| 항목 | 🟦 단독 터미널 | 🟪 Claude in Slack | 🟢 OpenClaw |
|---|---|---|---|
| **24시간 자동** | ❌ 노트북 켜야 | ✅ Anthropic 클라우드 | ✅ 데몬 (양육자 머신 켜야) |
| **로컬 파일 직접 수정** | ✅ 강력 | ❌ GitHub repo 경유만 | ✅ Bash 가능 |
| **결과물 형태** | 자유 | PR 1개/세션 강제 | 자유 |
| **봇이 팀원** | ❌ | ❌ 개인 도구 in 슬랙 | ✅ 페르소나·메모리·스킬 |
| **봇 페르소나 자유** | ❌ | ❌ `@Claude` 고정 | ✅ `@뽀야` 등 |
| **봇 뒤 Claude는 누구** | 본인 (터미널 사용자) | **멘션자 본인** | **봇 양육자 1명 (고정)** |
| **팀 5명이 쓰면** | 5명 각자 5개 구독 | 5명 각자 5개 구독 | **양육자 1명 구독으로 팀 전체** |
| **DM 가능** | ✅ (개인 터미널) | ❌ 채널만 | ✅ |
| **다채널 (텔레그램·웹훅)** | ❌ | ❌ 슬랙만 | ✅ |
| **스레드 맥락 자동 복구** | ❌ | ✅ 슬랙 통합 자동 | ✅ hook 자동 |
| **크론·웹훅 자동화** | ❌ | ❌ | ✅ 내장 |
| **봇끼리 협업·위임** | ❌ | ❌ | ✅ 같은 머신 내 |
| **세팅 난이도** | 가장 쉬움 | 쉬움 | 높음 (이 시리즈가 풀어줌) |

---

### 결정 트리 — 어디로 가야 하나

```
🤔 Claude로 뭘 하고 싶어?
│
├─ 혼자, 내 노트북에서 무거운 코딩 → 🟦 단독 터미널
│
└─ 팀이랑 슬랙에서 → 슬랙에 봇 붙이기
   │
   ├─ 각자 자기 코딩을 슬랙으로 위임 (개인 도구) → 🟪 Claude in Slack
   │  • 5명이면 5개 구독 필요
   │  • 봇 페르소나 X (그냥 @Claude)
   │  • PR 만드는 모델, GitHub 필수
   │
   └─ 봇 자체가 팀원처럼 페르소나로 응대 → 🟢 OpenClaw (이 시리즈)
      • 양육자 1명 구독으로 팀 전체 응대
      • 봇 페르소나 자유 (뽀야, 뽀짝이...)
      • DM·다채널·크론·웹훅까지
```

---

### 그래서 우리는 셋 다 쓴다 — 역할 분담

> 🐱 **OpenClaw 봇 (뽀야/뽀짝이...)** = 팀 공용 페르소나 비서. 슬랙에서 진짜 동료처럼 협업
> 💬 **Claude in Slack** = 각자 자기 Claude로 슬랙에서 코딩 위임 (개인 도구)
> 🤖 **Claude Code 단독 터미널** = 무거운 로컬 작업 (파일·코드 직접 수정)

**OpenClaw의 정체성**: 개인 코딩 도구를 잠깐 슬랙에 끌어다 쓰는 게 아니라, **에이전트가 진짜 동료가 되어 회사 슬랙에서 팀원으로 협업하는 것**. 페르소나·메모리·스킬을 가지고 24시간 출근. 이 시리즈는 그 모델을 어떻게 만드는지 풀어줘.

---

## 🧱 먼저 알아야 할 등장인물 8명

> 본론 들어가기 전에 이 네 가지 단어만 잡고 가면 뒤가 다 풀려. 비유로 한 줄씩.

### 1. **OpenClaw 게이트웨이** = 사무실 안내데스크

슬랙·텔레그램·웹훅에서 메시지가 오면 가장 먼저 받는 프로그램. "어느 봇한테 갈 메시지인지" 분류해서 적절한 봇한테 넘겨줌. 맥미니 같은 컴퓨터에서 24시간 돌아가는 백그라운드 서비스.

```
슬랙 메시지 도착 → 🏢 OpenClaw 게이트웨이 → 적절한 봇한테 분배
```

### 2. **Claude Code CLI** = 봇의 뇌

원래는 사람이 터미널 열고 `claude` 치면 실행되는 AI 코딩 도구. 우리 시리즈에선 **OpenClaw가 사람 대신 이걸 실행**해서 봇의 뇌로 씀.

```
봇한테 일이 들어오면 → OpenClaw가 백그라운드에서 `claude` 실행 →
"이 메시지에 어떻게 답할까?" 묻고 → 답 받아서 슬랙으로 전송
```

> 💡 즉 봇이 멘션받을 때마다 OpenClaw가 **컴퓨터 뒤에서 `claude` 명령을 자동으로 실행**한다고 생각하면 돼. 사람이 직접 타이핑하는 거랑 똑같은 일을 자동으로.

### 3. **바인딩(bindings)** = 우편물 분류표

"슬랙 'A 계정'으로 온 메시지는 → 뽀야한테" / "슬랙 'B 계정'으로 온 메시지는 → 뽀짝이한테" 같은 매핑 규칙. `openclaw.json` 파일에 적어둠. 게이트웨이는 이 표를 보고 분배해.

```json
{ "type": "route", "agentId": "bboya", "match": { "channel": "slack", "accountId": "default" }}
//   ↑ 분류 규칙 한 줄                ↑ 누구한테?              ↑ 어떤 메시지를?
```

### 4. **cwd / 워크스페이스** = 봇의 자기 책상

**`cwd` = current working directory = `claude` 명령이 실행되는 그 순간의 현재 디렉토리.**

터미널에서 사람이 직접 쓸 때:
```bash
cd ~/myproject && claude
#  ↑ 이 폴더가 cwd. claude는 여기서 깨어나서 이 폴더의 파일들을 자동으로 봄
```

OpenClaw가 봇 호출받을 때도 똑같이 `cwd` 지정해서 spawn함:
```bash
# 뽀야한테 메시지 오면
cd /Users/dahtmad/.openclaw/workspace-bboya && claude

# 뽀짝이한테 메시지 오면
cd /Users/dahtmad/.openclaw/workspace-bbojjak && claude
#                                ↑ cwd만 다르게 줌
```

봇마다 자기 폴더가 따로 있어:
```
~/.openclaw/
├── workspace-bboya/      ← 뽀야 책상
├── workspace-bbojjak/    ← 뽀짝이 책상
└── workspace-arongi/     ← 아롱이 책상
```

`claude`는 시작할 때 **자기 cwd 폴더의 파일들을 자동으로 둘러봄** (CLAUDE.md 등). OpenClaw는 거기에 추가로 SOUL/IDENTITY/AGENTS 같은 페르소나 파일도 주입해줌.

> 🪑 **그래서 "책상" 비유**: cwd = "claude가 깨어났을 때 자기가 앉은 자리". 책상 위에 깔린 파일(성격설정서)이 자기 페르소나가 됨. **같은 `claude` 바이너리인데 어느 책상에서 실행되냐에 따라 완전히 다른 봇이 되는 게 멀티에이전트의 핵심 트릭.**

### 5. **페르소나 파일 6장** = 책상에 깔리는 성격설정서

각 워크스페이스 책상 위에 깔리는 6장의 마크다운 파일. OpenClaw가 매 호출마다 자동으로 읽어서 Claude한테 끼워줌:

| 파일 | 역할 |
|---|---|
| `IDENTITY.md` | 정체성 (이름, 종, 외형) |
| `SOUL.md` | 성격·말투·가치관 |
| `USER.md` | 사용자(집사) 이해 |
| `AGENTS.md` | 운영 매뉴얼 (⭐ Red Lines 섹션은 긴 대화에도 재주입) |
| `TOOLS.md` | 도구·API 사용법 |
| `MEMORY.md` | 장기 기억 |

> 🪶 멀티에이전트에서 **봇 성격이 안 섞이는 비밀**이 여기 있어 — 각자 자기 책상 파일만 읽으니까.

### 6. **OAuth 토큰** = 봇별 Claude 사원증

봇마다 자기 Claude Pro/Max 구독 사원증을 따로 발급받음. `~/.openclaw/agents/<봇이름>/agent/auth-profiles.json`에 저장. **봇·머신별 완전 격리** — 절대 공유 금지 (Anthropic 차단 위험).

```bash
CLAUDE_CONFIG_DIR=~/.openclaw/agents/bboya/agent claude /login
```

### 7. **default 에이전트** = 대장 봇

`"default": true`가 붙은 봇 1마리. 바인딩 매칭 실패 시 폴백으로 받음. **시스템에 단 1명만**. 보통 팀장 역할(뽀야)을 대장으로.

### 8. **bbopters-shared** = 팀 공용 git 자료실 (멀티 머신일 때만)

여러 맥미니에서 같이 봐야 하는 **스킬·hook 스크립트·팀 문서·페르소나 템플릿**을 모아둔 git 레포. 각 머신에서 clone → `git pull/push`로 동기화. 1·2마리만 한 머신에서 돌리면 굳이 안 써도 됨.

---

## 📊 1마리 → 2마리 → N대 머신·N마리 — 설정 차이 한눈에

각 시나리오에서 어떤 게 그대로고, 어떤 게 바뀌는지 한 표로:

| 항목 | 🐱 1마리<br/>(ep.2) | 🐱🐈‍⬛ 2마리·같은 머신<br/>(ep.3) | 🏢🏢 N대 머신·N마리<br/>(ep.4) |
|---|---|---|---|
| 🪪 슬랙 앱 / 봇 토큰 | 1개 / 1쌍 | 2개 / 2쌍 | N개 / N쌍 |
| 🪑 워크스페이스 디렉토리 | 1개 | 2개 (`workspace-A`, `workspace-B`) | N개 (머신·봇별로 흩어짐) |
| 🏢 OpenClaw 게이트웨이 | 1대 | 1대 (그대로!) | **머신당 1대** |
| ⚙️ `openclaw.json` | 1개, 봇 1마리만 정의 | 1개, 봇 2마리 정의 | **머신마다 1개** (자기 머신 봇만) |
| 👑 `default: true` | 그 1마리에 박음 | 둘 중 1마리만 (보통 팀장) | **머신당 1마리** (전체로는 의미 분산) |
| 📬 bindings (`type: "route"`) | 1줄 | 2줄 이상 (봇별로) | 머신별로 자기 봇 라우트만 |
| 🪪 OAuth | 봇 1개분 | 봇 2개분 | **모든 봇·머신에서 각자 따로** (복사 절대 금지) |
| 🎫 slack `accounts.<id>` key 규칙 | `default` 한 줄로 충분 | 봇별 key (`bboya`/`bbojjak`) — 폴더명과 일치 필수 | 머신별 봇 account만 |
| 🪝 hook (slack-thread-rehydrate) | 글로벌 `~/.claude/settings.json`에 1번 등록 | **그대로 자동 적용** (재등록 X) | 머신마다 등록 (공용 레포 경로 권장) |
| 📚 공용 레포 (`bbopters-shared`) | 굳이 안 써도 OK | 굳이 안 써도 OK | **필수** — 스킬·hook·문서를 git pull/push로 동기화 |
| 🤝 봇 간 협업 방식 | (혼자라 해당없음) | `subagents.allowAgents`로 같은 머신 내 위임 | **슬랙 스레드를 메시지 큐**로 (subagent는 머신 못 넘음) |

### 한 줄로 정리

> **봇이 늘어나도 게이트웨이는 1대 그대로. 머신이 늘면 게이트웨이도 늘고, 공용 레포가 필수가 된다.** OAuth는 **무조건 봇·머신별 따로**. default는 **머신당 1마리** 룰만 지키면 멀티 호스트도 안 꼬여.

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
                  → ACP 우회는 한계로 폐기 → `type: "route"` 바인딩으로 정착

[지금]         🐱 뽀피터스 표준 = Claude CLI bridge + route 바인딩 (ACP 빠짐)
```

---

## 📖 시기별 상세 — 우리가 거쳐온 길

> 위 한 장 변천사를 시간순으로 풀어쓴 부분. 자세한 사정이 안 궁금하면 바로 [그래서 지금 뭘 골라야 해?](#-그래서-지금-뭘-골라야-해)로 건너뛰어도 OK.

### 🍞 첫 시기 — Claude Code Max 구독으로 OpenClaw 돌리기 (~4월 초)

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

### 🔀 두 번째 시기 — ACP 우회 (4월 4일 ~ 4월 21일경)

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

### 🟢 세 번째 시기 — Claude CLI 정식 sanctioned (4월 22일~)

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

### 그럼 ACP는? 뽀피터스에선 빠졌어

이론상 ACP는 "OS 역할(스레드 매핑/멀티에이전트 오케스트레이션)을 하는 별도 층"으로 살려둘 수 있어. 근데 OpenClaw의 실제 구현(`acpx` 플러그인)은 **single-backend, default agent의 cwd로 묶임** — 멀티에이전트 환경엔 한계가 명확했어. (자세한 한계: [봇키우기 교실 #13](/notes/bot-school-13-cli-bridge-vs-acp))

뽀피터스는 ACP 우회 시기를 거치며 한계를 다 겪고, 결국 **ACP를 완전히 빼고 `type: "route"` 바인딩으로 대체**했어.

```
[ACP 우회 시기]                    [현재 — CLI 정식]
Slack                               Slack
  ↓                                   ↓
게이트웨이                          게이트웨이
  ↓                                   ↓
ACP (single-backend)               🚫 ACP 안 씀
  ↓                                   ↓
default agent만                    bindings: type:"route"
  ↓                                   ↓
Codex 메인                         claude-cli/... 직접 spawn
  ↓                                   ↓
ACP로 Claude Code borrow           Claude (Opus 4.7)
```

**현재 뽀피터스 라우팅**: 슬랙 메시지 도착 → 게이트웨이가 `bindings` 보고 `accountId → agentId` 매핑 → cli-backend가 그 워크스페이스 cwd로 Claude CLI spawn → OpenClaw가 페르소나 파일 자동 주입 → 응답.

스레드 매핑·멀티에이전트 라우팅은 ACP 없이도 **route 바인딩 + slack-thread-rehydrate hook + 워크스페이스별 cwd 분리**로 다 처리됨. (자세한 셋업은 ep.2~ep.4)

> 🪝 **참고** — 노트 Part 7 결론: "ACP 바인딩만 박고 '왜 내 에이전트가 뽀야로 답하지?' 하는 순간이 온다. 라우터는 `type: 'route'`만 본다. 새 에이전트 심을 땐 route 바인딩부터." 즉 멀티에이전트 운영의 표준 답안은 ACP가 아니라 **route 바인딩**.

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

### 🔶 ACP 우회는 굳이 필요 없음 (역사적 맥락만)

- ACP 우회 시기에 셋업한 환경이 남아있으면 → `type: "route"`로 바인딩 교체하고 ACP 빼는 게 정답
- "모델 호출 한 칸"만 교체하는 거라 라우팅·페르소나·스레드 매핑은 route + hook + cwd 분리로 충분
- ACP는 single-backend 한계 + DM 라우팅 버그 등 굳이 다시 도입할 이유 없음

### 🔵 API 종량제는 언제?

- 엔터프라이즈급 트래픽 (월 구독 한도 초과)
- 모델 자유 스위칭 필요 (Haiku/Sonnet 혼용)
- Bedrock/Vertex 경유 강제 (※ CLI도 일부 지원)
- Claude 외 모델(GPT, Gemini)을 같은 봇이 번갈아 써야 함

### 🔀 뽀피터스 표준 — Claude CLI 단일 백엔드 (4/29부터)

처음엔 Claude CLI를 메인으로, Codex를 폴백으로 두는 하이브리드를 시도했어. 근데 운영해보니 — Codex 폴백이 살아있으면 Claude 한도 빠질 때 자동으로 Codex로 떨어져서 **페르소나 톤이 갑자기 뒤틀림**. 외부 응대 봇은 물론이고 실무 봇도 톤이 깨지는 게 더 큰 사고였어.

그래서 **2026년 4월 29일** 본진(닿 머신)에서 **Codex 폴백 완전 제거**:

- `openclaw.json` 13곳 (각 에이전트 + heartbeat + subagents + auth.order)
- `cron/jobs.json` 25개 잡 model

지금 뽀피터스 표준은 단일 백엔드:

```json
"model": {
  "primary": "claude-cli/claude-opus-4-7",
  "fallbacks": []
}
```

한도 빠지면 차라리 잠깐 멈추는 게 톤 깨지는 것보다 나아. 동시 한도가 모자라면 **Max 200 ×2 계정**으로 분산 운영하는 게 정답.

> 📦 **실전 절차** — codex로 도는 OpenClaw 인스턴스를 옮기는 정식 절차서: [→ guide-10 Codex → Claude CLI 마이그레이션](/setup-guides/guide-10-codex-to-claude-cli)

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

> 📦 **한방 절차서** — 이 체크리스트의 명령어 풀버전(`sed` 치환·검증 grep·롤백까지)은 별도 가이드로: [→ guide-10 Codex → Claude CLI 마이그레이션](/setup-guides/guide-10-codex-to-claude-cli)

---

## 🐱 한 줄 요약

> **2026년 4월 우리는 두 번 갈아탔다 — 토큰 빌려쓰기 → ACP 우회 → CLI 정식.**
> 지금 뽀피터스 표준은 **Claude CLI bridge + `type: "route"` 바인딩** (ACP는 빠짐). 다음 편부터 본격 셋업.

## 다음 단계

자, 이제 본격 셋업 들어가자 → [ep.2 1마리 출근시키기](./ep-02-single-agent)
