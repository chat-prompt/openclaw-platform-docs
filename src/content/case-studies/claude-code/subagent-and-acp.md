---
title: "클코 구독이 막혔다 — ACP로 구독 뽕뽑기"
episode: 1
date: "2026-04-08"
series: "case-studies"
category: "클로드코드 구독 막혔을 때 대응법"
description: "Claude Code Max 구독으로 에이전트를 돌리던 게 막혔다. API 종량제 vs ACP — 구독 안에서 봇을 살리는 법."
publishedAt: "2026-04-08"
updatedAt: "2026-04-12"
accentColor: "#7C3AED"
tags: ["ACP", "비용", "위임", "봇 먹이", "구독 차단"]
token: "구독뽕뽑기"
---

> **구독뽕뽑기 시리즈** — Claude Code 구독 하나로 AI 봇을 만들고, 말투를 가르치고, 슬랙에서 팀원과 함께 쓰기까지.
>
> 1. **구독이 막혔다 — ACP로 뽕뽑기** ← 지금 읽는 글
> 2. [봇 말투 교정 — VOICE.md](/case-studies/claude-code/codex-voice-training)
> 3. [봇이 말만 하고 안 움직인다 — 실행 편향 교정](/case-studies/claude-code/codex-action-training)
> 4. [내 터미널에 AI비서 만들기 — CLAUDE.md](/case-studies/claude-code/claude-code-bboya)
> 5. [슬랙에서 팀이 같이 쓰기 — 채널 플러그인](/case-studies/claude-code/claude-code-slack)

# ACP 가이드 — 구독 막혔을 때 대처법

> Claude Code 구독으로 에이전트를 돌리던 게 **2026년 4월, 막혔다**.
> 대안은 두 가지 — **API 종량제**와 **ACP**.
>
> 이 글은 두 파트야.
> - **Part 1** — 인간이 읽고 이해할 부분. 뭐가 막혔고, ACP가 뭐고, 왜 되는지.
> - **Part 2** — 봇 먹이. 복붙해서 봇한테 먹이면 알아서 따르는 설정 레시피.
>
> 2026-04-12 기준.

---

# Part 1: 인간이 이해할 것

> 여기는 **사람이 읽는 파트**야. 봇 설정이 아니라, "왜 이런 구조인지" 이해하기 위한 글.
> 비개발자도 이해할 수 있게 썼어.

## 뭐가 막혔나

### 원래 구조

Claude Code Max 구독이라는 게 있어. 월 $200 내면 Claude를 무제한으로 쓸 수 있는 정액제야.

우리는 이 구독을 AI 에이전트(뽀야)한테 연결해서 쓰고 있었어. 에이전트가 Claude한테 일을 시킬 때마다 이 구독에서 차감되니까, 아무리 많이 써도 추가 비용이 안 나왔지.

### 2026년 4월, 차단

Anthropic(Claude 만든 회사)이 **서드파티 도구가 구독을 갖다 쓰는 걸 완전히 막았어**.

- 2026.01.09 — 비공식 우회 도구들 대상으로 기술적 제한 시작
- 2026.02.19 — 이용약관 업데이트: "구독 인증 토큰은 공식 앱에서만 사용 가능"
- 2026.04.04 — **완전 시행**. 서드파티 도구에서 구독 쿼터 완전 차단

이유는 단순해. $200 월정액으로 $3,000~$5,000 어치 일을 시키는 사람들이 너무 많았거든. Anthropic 입장에서는 수익 구조가 안 맞으니까 막은 거야.

### 그래서 지금 선택지는?

에이전트를 계속 돌리려면 두 가지 중 하나를 골라야 해:

1. **API 종량제** — 쓴 만큼 돈 내기. 제한 없지만, 많이 쓰면 비용이 쌓임.
2. **ACP** — 이미 내고 있는 구독을 다른 방식으로 활용. 추가 비용 없음.

우리는 ACP를 택했어. 왜 이게 가능한지는 아래에서 설명할게.

---

## ACP가 뭔데?

ACP = **Agent Client Protocol** (Zed가 만든 오픈 프로토콜). 이름이 거창하지만 하는 일은 단순해.

> **다른 프로그램이 Claude Code를 대신 실행해주는 것.**

### 평소에 Claude Code 쓸 때

터미널(검은 화면)을 열고 `claude`라고 치면 Claude Code가 열려. 거기에 "이 코드 고쳐줘"라고 말하면 Claude가 알아서 고침. 이게 평소 사용법이야.

### ACP는?

사람이 직접 타이핑하는 대신, **에이전트(봇)가 대신 타이핑해주는 것**. 그게 전부야.

```
[평소]  사람 → 터미널 열기 → "코드 고쳐줘" 타이핑 → Claude Code가 실행
[ACP]   봇 → 터미널 열기 → "코드 고쳐줘" 타이핑 → Claude Code가 실행 (동일!)
```

좀 더 구체적으로:

1. **봇**(뽀야)이 "이거 해야겠다"고 판단한다
2. 할 일을 텍스트로 정리한다 — "이 파일에서 버그 고쳐"
3. Claude Code를 **직접 실행**한다 — 마치 사람이 터미널에 타이핑하듯
4. Claude Code가 파일 읽고, 코드 고치고, 테스트하고, 결과를 돌려준다
5. 봇이 결과를 받아서 사람에게 보고한다

### 비유

집에 TV 리모컨이 있어. 내가 직접 눌러서 TV를 켤 수도 있고, 로봇 팔이 대신 눌러서 켤 수도 있어. TV 입장에서는 **똑같은 리모컨 신호**가 들어오는 거야. 누가 눌렀는지는 모름.

ACP가 그 로봇 팔이고, Claude Code가 리모컨이야.

**핵심:**
- ACP는 별도의 서비스나 서버가 아님. 이미 설치된 **Claude Code를 프로그래밍적으로 실행하는 방식**
- Claude Code가 Max 구독으로 로그인돼 있으면, ACP로 실행해도 **같은 구독**을 쓰는 거
- 에이전트가 인증 정보를 뽑아가는 게 아니라, **프로그램 자체를 실행**하는 것

---

## 왜 ACP는 안 막혔어?

이게 핵심이야. Anthropic이 막은 건 뭐고 안 막은 건 뭔지.

### 막은 것: 인증 토큰 가져다 쓰기

구독하면 "이 사람은 결제한 사람이에요"라는 **인증 토큰**이 생겨. 원래 이건 Claude 공식 앱에서만 쓰라고 만든 건데, 서드파티 도구들이 이 토큰을 뽑아서 자기네 프로그램에서 직접 API를 호출하는 데 갖다 썼어.

Anthropic이 막은 게 바로 이거야. **"우리가 준 토큰을 다른 프로그램이 가져다 쓰는 것."**

### 안 막은 것: Claude Code를 실행하는 것

ACP는 토큰을 건드리지 않아. 그냥 **Claude Code라는 공식 프로그램 자체를 실행**해. 토큰 인증은 Claude Code 내부에서 알아서 처리하고, 바깥에서는 접근할 수가 없어.

| 방식 | 뭘 하는 건지 | 차단? |
|------|-------------|-------|
| 토큰 뽑아서 API 직접 호출 | 인증 정보를 가져가서 다른 프로그램이 쓴다 | ❌ 차단 |
| **ACP (Claude Code 실행)** | **공식 프로그램을 그대로 실행한다** | **✅ 허용** |

Anthropic 입장에서 보면: 누군가 터미널에서 `claude`를 치고 일을 시키는 것과, 봇이 `claude`를 대신 실행해서 일을 시키는 것은 **구분할 수가 없어**. 둘 다 Claude Code라는 공식 프로그램을 쓰는 거니까.

### 정리

```
차단: 인증 토큰을 가져가서 → 다른 프로그램이 API에 직접 요청
허용: Claude Code 프로그램을 → 그대로 실행 (토큰은 내부에서 처리)
```

**직접 API 호출은 막혔지만, 공식 프로그램을 실행하는 ACP는 여전히 구독 안에서 돌릴 수 있다.**

---

## 왜 봇이 직접 안 하고 위임해?

여기서 자연스러운 질문: "그냥 봇(뽀야)이 직접 하면 되지 않아?"

**봇이 직접 하면 대화가 멈춤.**

뽀야는 집사랑 슬랙에서 대화하는 본체야. 집사 말 듣고, 파일 읽고, 검색하고, API 호출하고. 근데 뽀야가 코딩 작업에 30분씩 빠져버리면? 그 동안 집사가 말 걸어도 대답이 없어.

그래서 이런 구조야:

```
집사: "이거 해줘"
  ↓
뽀야: "알겠어!" → ACP한테 일을 던져놓고 → 집사랑 계속 대화
  ↓
ACP(Claude Code): 혼자서 작업 중...
  ↓
완료! → 뽀야에게 보고
  ↓
뽀야: 결과 검토 → 집사에게 전달
```

**뽀야 = 집사의 대화 상대 + 작업 배분자**, ACP = **실제로 일하는 손발**.

---

## 봇한테 어떻게 시키나?

비개발자 입장에서 가장 궁금한 부분. "나는 코드를 안 짜는데, 이걸 어떻게 써?"

### 답: 봇한테 먹이를 주면 돼

이 문서의 **Part 2 (봇 먹이)** 에 있는 텍스트를 복사해서, 봇의 설정 파일(AGENTS.md)에 붙여넣으면 끝이야. 봇이 알아서 ACP를 쓰기 시작해.

사람이 할 일:
1. Claude Code를 맥미니/노트북에 설치하고, Max 구독 계정으로 로그인
2. Part 2의 설정 텍스트를 봇의 설정 파일에 붙여넣기
3. 끝! 이후로는 봇이 알아서 ACP로 일함

### 실제 동작 예시

**예시 1: 서재 글 수정 + 배포**
```
집사: "서재에 오타 있어. 뽙뽑기 → 뽕뽑기로 바꿔서 배포해줘"

→ 뽀야가 ACP(Claude Code)를 띄움
→ Claude Code가 오타 검색 → 수정 → git push → 자동 배포
→ 뽀야: "2군데 수정, 배포 완료!"
```

**예시 2: 설문 분석 + 이메일 발송**
```
집사: "어제 AI토크 설문 분석해서 리포트 보내줘"

→ 뽀야가 ACP를 띄움
→ Claude Code가 Airtable에서 데이터 수집 → 분석 → HTML 리포트 생성 → 이메일 발송
→ 뽀야: "리포트 발송 완료!"
```

**예시 3: 간단한 인사 (ACP 안 씀)**
```
집사: "ㅇㅋ 고마워"

→ 뽀야가 직접 이모지 리액션 👍 (5초짜리 작업에 ACP는 과함)
```

### 판단 기준

```
뭔가 시켰다
  ↓
한줄 답변이나 이모지면 충분? ──yes──→ 뽀야가 직접
  │ no
  ↓
ACP로 위임
```

거의 모든 작업이 ACP로 가. 직접 하는 건 "ㅇㅇ", "ㅋㅋ", 이모지 리액션 정도.

---

## API 종량제 vs ACP 비교

둘 다 에이전트를 돌리는 방법이지만 성격이 다름.

| | API 종량제 | ACP |
|---|---|---|
| **비용** | 쓴 만큼 냄 (토큰 × 단가) | 구독 안에서 차감 (추가 비용 없음) |
| **전제 조건** | API 키 발급 | Claude Code Max 구독 + CLI 설치 |
| **장점** | 팀원 공유 가능, rate limit 넉넉 | 비용 예측 가능, 이미 구독 중이면 공짜 |
| **단점** | 많이 쓰면 비용 폭증 | rate limit을 사람과 공유, 한 머신에 종속 |
| **적합한 경우** | 팀 규모 큼, 사용량 많음 | 개인/소규모, 이미 Max 구독 중 |

우리 경우: 이미 Max 구독($200/월) 내고 있었으니까, ACP로 전환하면 **추가 비용 0원**. API 종량제로 가면 월 $500~$1,000은 더 나올 상황이었어.

---

## 주의사항

### rate limit 공유
ACP가 Claude Code를 돌리면, 같은 구독의 rate limit을 사람과 나눠 써. 봇이 열심히 일하는 중이면 내 Claude Code가 좀 느려질 수 있어.

### 한 머신에 종속
ACP는 Claude Code가 설치된 머신에서만 동작해. 맥미니가 꺼지면 ACP도 멈춤.

### 봇한테 일 시킬 때 주의
ACP로 위임하면 봇이 메인 대화의 맥락을 모름. "아까 그거 해줘" ❌ → 구체적으로 파일 경로, 현재 상태, 원하는 결과를 써줘야 해.

---

## 따라하기 요약 — 나는 뭘 하면 되나?

비개발자 기준으로, ACP 전환에 필요한 전체 과정을 5단계로 정리했어.

| 단계 | 뭘 하나 | 누가 하나 | 난이도 |
|------|---------|-----------|--------|
| **1. Claude Code 설치** | 맥미니/노트북에 Claude Code CLI 설치 + Max 구독 계정으로 로그인 | 사람 (1회) | 터미널 명령어 3줄 |
| **2. ACP 인프라 세팅** | OpenClaw에 ACP 플러그인 활성화 + 기본 설정 | 사람 or 봇 | 터미널 명령어 7줄 |
| **3. 채널 바인딩** | "슬랙/텔레그램에서 메시지 오면 ACP로 보내라" 라우팅 설정 | 사람 or 봇 | JSON 편집 |
| **4. 봇한테 위임 규칙 먹이기** | AGENTS.md에 "모든 작업은 ACP로" 규칙 붙여넣기 | 사람 (복붙) | 쉬움 |
| **5. 테스트** | 슬랙에서 봇 멘션 → ACP 경유 답변 오는지 확인 | 사람 | 확인만 |

1~3은 인프라 세팅 (한 번만 하면 끝), 4는 봇 행동 규칙 (먹이), 5는 검증.

각 단계의 구체적인 명령어와 설정값은 아래 **Part 2 (봇 먹이)** 에 순서대로 있어.

---

# Part 2: 봇 먹이

> 여기부터는 **봇한테 주는 레시피**야. 인간이 이해 안 해도 돼.
> **위에서 아래로 순서대로 따라가면 ACP 세팅이 끝남.**


## Step 1: 인프라 세팅 — Claude Code + OpenClaw ACP 활성화

> 새 머신/새 에이전트에 ACP를 세팅할 때, 이 순서대로 실행.

### 1-1. Claude Code CLI 설치 및 인증

```bash
# 설치
npm install -g @anthropic-ai/claude-code

# 버전 확인
claude --version

# OAuth 로그인 (Max 구독 계정으로)
claude auth login
```

로그인하면 브라우저가 열리고 Anthropic 계정으로 OAuth 인증. Max 구독이 돼있는 계정으로 로그인해야 ACP에서 구독 차감이 돼.

확인:
```bash
claude auth status
```

### 1-2. ACPX 플러그인 활성화

```bash
openclaw config set plugins.entries.acpx.enabled true
openclaw config set plugins.entries.acpx.config.permissionMode approve-all
openclaw config set plugins.entries.acpx.config.nonInteractivePermissions deny
```

| `permissionMode` 값 | 동작 |
|---|---|
| `approve-all` | 파일 쓰기, 명령어 실행 모두 자동 승인 (권장) |
| `approve-reads` | 읽기만 자동 승인, 쓰기/실행은 프롬프트 |
| `deny-all` | 모든 권한 거부 |

### 1-3. ACP 기본 설정

```bash
openclaw config set acp.enabled true
openclaw config set acp.backend acpx
openclaw config set acp.defaultAgent claude
openclaw config set acp.allowedAgents '["claude", "codex"]'
```

### 1-4. 채널 바인딩 — "어떤 채널에서 오면 ACP로 보내라"

위까지는 ACP 엔진을 켜는 것. 이 단계가 **실제로 메시지가 ACP로 라우팅되게** 만드는 핵심이야.

`openclaw.json`의 `bindings` 배열에 아래 형식으로 추가. 채널/에이전트별로 하나씩.

```json
{
  "type": "acp",
  "agentId": "너의_에이전트_ID",
  "match": {
    "channel": "slack",
    "accountId": "너의_슬랙_계정_ID",
    "peer": { "kind": "channel", "id": "*" }
  },
  "acp": {
    "mode": "persistent",
    "cwd": "~/.openclaw"
  }
}
```

| 필��� | 뭔지 | 예시 |
|------|------|------|
| `agentId` | 바인딩을 처리할 에이전트 | `"mybot"` |
| `channel` | 메시징 채널 | `"slack"`, `"telegram"` |
| `accountId` | OpenClaw에 등록한 채널 계정 ID | `"default"` |
| `peer.kind` | 채널(`channel`) or DM(`direct`) | `"channel"` 또는 `"direct"` |
| `peer.id` | 특정 채널만 매칭하려면 ID, 전부면 `"*"` | `"*"` |

**예시 — 슬랙 채널 + DM 둘 다 ACP로:**

```json
"bindings": [
  {
    "type": "acp", "agentId": "mybot",
    "match": { "channel": "slack", "accountId": "default", "peer": { "kind": "channel", "id": "*" } },
    "acp": { "mode": "persistent", "cwd": "~/.openclaw" }
  },
  {
    "type": "acp", "agentId": "mybot",
    "match": { "channel": "slack", "accountId": "default", "peer": { "kind": "direct", "id": "*" } },
    "acp": { "mode": "persistent", "cwd": "~/.openclaw" }
  }
]
```

슬랙 워크스페이스가 여러 개면 `accountId`를 바꿔서 각각 추가. 텔레그램도 `"channel": "telegram"`으로 같은 패���.

> ⚠️ `openclaw.json`은 런타임 핵심 설정. JSON 문법 틀리면 게이트웨이가 안 뜸.

### 1-5. 게이트웨이 재시작 및 검증

```bash
openclaw gateway restart
openclaw gateway status   # Runtime: running, RPC probe: ok 떠야 정상
openclaw sessions         # ACP 세션이 보이면 성공
```

> **Claude Code Max 구독이 있는 사람만 ACP를 쓸 수 있다.** 구독 없으면 API 키로 돌려야 해.

---

## Step 2: 봇 행동 규칙 — AGENTS.md에 붙여넣기

> 아래 전체를 봇의 AGENTS.md에 붙여넣으면 끝. 봇이 ACP 위임 규칙을 따른다.

```markdown
## ACP 위임 규칙

**기본: 모든 작업은 ACP로 위임한다.**

### 직접 처리하는 것 (예외 — 이것만)
- 한줄 답변 ("ㅇㅇ", "ㅋㅋ", 인사) → NO_REPLY 또는 직접 짧게
- 이모지 리액션
- ACP 띄우는 오버헤드(5~10초)가 작업 자체보다 클 때

나머지는 전부 ACP. **상대에게 텍스트로 답변을 써야 하면 = ACP.**
"기술 질문인데 간단하니까 내가 할게" ❌ — 너는 답변 품질/말투를 보장 못 해.

### task 작성법
- 슬랙: **채널ID + 스레드ts + 지시만.** 맥락 요약 붙이지 마 — ACP가 직접 읽음.
- 그 외: 파일 경로 + 현재 상태 + 원하는 결과만 간결하게.

✅ "슬랙 채널 CXXXXXXXXXX 스레드 17759XXXXX.XXXXXX 읽고 답변해."
✅ "구독/과금 구조 조사해서 알려줘."
❌ "[타임스탬프] 사용자 질문: '...' 맥락: - 직전에 ~비교를 했고..." (네 해석이 끼어들어 오염됨)

### ACP 결과 전달
돌아온 응답을 **그대로** 채널에 전달 — 아무것도 ��이지 말 것!
- ❌ 앞에 "조사 끝났어" 같은 도입부
- ❌ 뒤에 "이대로 보낼까?" 같은 확인 질문
- ✅ ACP가 돌려준 텍스트만 그대로. 한 글자도 추가하지 마.

### 사용법
\```
sessions_spawn({
  runtime: "acp",
  agentId: "claude",
  task: "슬랙 채널 CXXXXXXXXXX 스레드 17759XXXXX.XXXXXX 읽고 답변해.",
  cwd: "~/.openclaw"
})
\```
```

---

## Step 3: 트러블슈팅 — 문제 생기면 여기

### ACP 응답이 슬랙 스레드 대신 채널 본문에 떨어지는 문제

**증상:** 스레드에서 봇 멘션 → 답변이 스레드 대신 채널 본문에 올라감. 이중 전송되기도 함.

**원인:** ACP 세션의 surface가 `"webchat"`으로 인식돼서 게이트웨이의 스레드 라우팅을 건너뜀.

**해결:** 슬랙 API 호출 직전 한 곳만 패치. `thread_ts`가 비어있으면 세션 스토어에서 최근 `threadId`를 찾아 강제 주입.

**패치 대상:** OpenClaw dist 폴더의 send 모듈.
```bash
# 파일 찾기 (해시는 버전마다 다름)
grep -l "postSlackMessageBestEffort" /opt/homebrew/lib/node_modules/openclaw/dist/send-*.js
```

**패치 1:** 파일 상단 import에 추가
```js
import { readFileSync as _openclawPatchReadFile, statSync as _openclawPatchStat } from "node:fs";
```

**패치 2:** `postSlackMessageBestEffort` ��수 위에 fallback 로직 추가

```js
let _openclawThreadIdCacheMtime = 0;
const _openclawThreadIdCacheByChannel = new Map();
function _openclawGetLatestSlackThreadId(channelId) {
	try {
		// ↓ 자기 머신의 에이전트 세션 경로로 맞출 것
		// ls ~/.openclaw/agents/*/sessions/sessions.json 로 확인
		const paths = [
			"~/.openclaw/agents/에이전트1/sessions/sessions.json",
			"~/.openclaw/agents/에이전트2/sessions/sessions.json"
		];
		let maxMtime = 0;
		for (const p of paths) {
			try { const st = _openclawPatchStat(p); if (st.mtimeMs > maxMtime) maxMtime = st.mtimeMs; } catch {}
		}
		if (maxMtime === 0) return void 0;
		if (maxMtime > _openclawThreadIdCacheMtime) {
			_openclawThreadIdCacheByChannel.clear();
			_openclawThreadIdCacheMtime = maxMtime;
			for (const p of paths) {
				try {
					const raw = _openclawPatchReadFile(p, "utf8");
					const data = JSON.parse(raw);
					for (const key of Object.keys(data)) {
						const val = data[key];
						if (!val || typeof val !== "object") continue;
						const dc = val.deliveryContext;
						if (!dc || dc.channel !== "slack") continue;
						const to = String(dc.to || "");
						const m = to.match(/channel:(C[A-Z0-9]+)/i);
						if (!m) continue;
						const chId = m[1].toUpperCase();
						const threadId = dc.threadId || val.lastThreadId;
						if (!threadId) continue;
						const updatedAt = Number(val.updatedAt) || 0;
						const existing = _openclawThreadIdCacheByChannel.get(chId);
						if (!existing || existing.updatedAt < updatedAt) _openclawThreadIdCacheByChannel.set(chId, { threadId: String(threadId), updatedAt });
					}
				} catch {}
			}
		}
		const entry = _openclawThreadIdCacheByChannel.get(String(channelId).toUpperCase());
		return entry ? entry.threadId : void 0;
	} catch { return void 0; }
}
async function postSlackMessageBestEffort(params) {
	if (!params.threadTs && typeof params.channelId === "string" && /^C[A-Z0-9]+$/i.test(params.channelId)) {
		const fallback = _openclawGetLatestSlackThreadId(params.channelId);
		if (fallback) {
			logVerbose(`[openclaw-patch] injecting fallback thread_ts=${fallback} for channel=${params.channelId}`);
			params = { ...params, threadTs: fallback };
		}
	}
	// ↓ 기존 함수 본문 그대로 유지
```

> 기존 `async function postSlackMessageBestEffort(params) {` 줄은 삭제하고, 위 블록의 마지막 줄이 새로운 함수 시작이 된다.

**적용 후:** `openclaw gateway restart`

**주의:** OpenClaw 패키지 업데이트하면 패치 날아감. 업데이트 후 재적용 필요.

### 봇이 슬랙에 직접 쓰는 문제

위 패치와 별개로, 봇이 MCP 도구로 직접 슬랙에 쓰면 게이트웨이 경로를 건너뛰어서 패치가 안 먹힘. 봇의 TOOLS.md에 추가:

```markdown
## 슬랙 응답 절대 규칙 (최우선)

슬랙 메시지에 응답할 때 conversations_add_message 도구를 절대 사용하지 마.
일반 텍스트로만 응답. 게이트웨이가 자동으로 원본 스레드에 라우팅한다.
```

---

*뽀야 작성. 2026-04-06 초안, 2026-04-09 v2, 2026-04-10 트러블슈팅 추가, 2026-04-12 v4 순차 구조로 재구성.*
*변경: Part 1 비개발자 눈높이 전면 재작성. Part 2를 A/B/C/D 분류에서 Step 1→2→3 순차 구조로 변경. 경로/채널ID 마스킹. 봇 행동 규칙 간결화.*
