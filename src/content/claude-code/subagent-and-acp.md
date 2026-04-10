---
title: "클코 구독이 막혔다 — 코덱스5.4 & ACP로 구독 뽕뽑기"
episode: 1
date: "2026-04-08"
series: "claude-code"
description: "뽀야가 일을 위임하는 두 가지 방식 — 서브에이전트와 ACP. 둘 다 sessions_spawn으로 띄우지만, 런타임이 다르다. 인간이 이해할 부분과 봇 먹이를 구분해서 정리."
publishedAt: "2026-04-08"
updatedAt: "2026-04-10"
accentColor: "#7C3AED"
tags: ["서브에이전트", "ACP", "비용", "위임", "봇 먹이"]
token: "뽀야뽀야"
---

# 서브에이전트 & ACP 가이드

> 뽀야가 일을 위임하는 두 가지 방식 — **서브에이전트**와 **ACP**.
> 둘 다 `sessions_spawn`으로 띄우지만, 런타임이 다르다. 그 차이와 배경을 정리한 문서.
>
> 이 글은 두 파트야.
> - **Part 1** — 인간이 읽고 이해할 부분. 왜 이렇게 하는지, 뭐가 다른지.
> - **Part 2** — 봇 먹이. 복붙해서 봇한테 먹이면 알아서 따르는 설정 레시피.
>
> 2026-04-09 기준.

---

# Part 1: 인간이 이해할 것

> 여기는 **사람이 읽는 파트**야. 봇 설정이 아니라, "왜 이런 구조인지" 이해하기 위한 글.

## 배경: Claude Code 구독 뽕뽑기

### 문제

Claude Code Max 구독($200/월) 쓰고 있어. 월정액이라 아무리 써도 추가 비용 없음 (rate limit만 있음).

그런데 OpenClaw 에이전트(뽀야)는 **Anthropic API 종량제**로 돌아가. 코딩 작업을 시키면 Opus 토큰이 빠짐 — 비용이 쌓임.

**핵심 질문: 이미 내고 있는 Claude Code 구독을 OpenClaw 에이전트의 코딩 작업에도 활용할 수 없을까?**

### 답: ACP로 하면 된다

ACP(Agent Coding Protocol)를 쓰면, OpenClaw 에이전트가 **Claude Code CLI를 직접 실행**해서 코딩을 시킬 수 있어.

- 내 맥미니/노트북에 Claude Code CLI가 **Max 구독(OAuth)**으로 로그인돼 있으니까
- OpenClaw이 `claude`를 실행하면 = 내가 터미널에서 `claude` 치는 거랑 **동일한 인증**
- 결과적으로 **$200 월정액 안에서 코딩 작업을 돌릴 수 있음**
- API 종량제 추가 비용 없이, 이미 내고 있는 구독을 뽕뽑는 것

**정리: OpenClaw 대화/리서치는 API 종량제로, 코딩 작업은 Claude Code 구독으로** — 이 하이브리드가 가성비 최고.

---

## 메인 에이전트 vs 위임

그런데 애초에 "뽀야가 직접 하면 되지, 왜 위임해?" 라는 의문이 들 수 있어.

**핵심: 뽀야가 직접 하면 집사 대화가 멈춤.**

뽀야(메인 에이전트)는 집사랑 대화하는 본체야. Slack에서 집사 말 듣고, 파일 읽고, 검색하고, API 호출하고. 근데 뽀야가 코딩 작업에 30분씩 빠져버리면? 그 동안 집사가 말 걸어도 대답이 없어.

그래서 오래 걸리는 작업은 서브에이전트나 ACP에 **던져놓고**, 뽀야는 집사랑 계속 대화하는 구조야.

| | 메인 에이전트 (뽀야) | 서브에이전트 | ACP |
|---|---|---|---|
| **집사 대화** | ⭕ | ❌ | ❌ |
| **대화 맥락** | ⭕ 알고 있음 | ❌ task에 써줘야 함 | ❌ task에 써줘야 함 |
| **터미널** | ⭕ 가능 | 제한적 | ⭕ 풀 액세스 |
| **비용** | API 종량제 (Opus) | API 종량제 (Sonnet) | 구독 차감 |
| **병렬** | ❌ 혼자 | ⭕ 최대 5개 | ⭕ |
| **적합한 작업** | 짧은 작업, 집사 대화, 판단 | 가벼운 리서치, 문서 | **거의 모든 작업** |

정리: **뽀야 = 집사의 대화 상대 + 작업 배분자**, 서브에이전트/ACP = **실제로 일하는 손발**.

---

## 공통 인터페이스: `sessions_spawn`

서브에이전트든 ACP든, 뽀야가 일을 위임할 때는 **같은 도구**를 써:

```
sessions_spawn({
  runtime: "subagent" 또는 "acp",
  task: "할 일 설명",
  ...
})
```

**"ACP도 서브에이전트인가?"** 라는 질문에 대한 답:

> 둘 다 `sessions_spawn`이라는 **같은 위임 인터페이스**로 띄우지만, **런타임이 다르다**.
> 서브에이전트의 한 종류가 ACP인 게 아니라, 같은 리모컨의 **다른 채널**인 거야.

비유하면:
- **서브에이전트** = 카톡으로 심부름 시키기 (가볍고 빠르게)
- **ACP** = 사무실에 개발자 한 명 앉혀놓기 (터미널까지 쓰는 독립 작업자)

---

## 런타임 차이

| | 서브에이전트 | ACP |
|---|---|---|
| **런타임** | `runtime: "subagent"` | `runtime: "acp"` |
| **실체** | OpenClaw 내부에서 API로 돌리는 가벼운 분신 | **진짜 Claude Code CLI를 실행**하는 독립 프로세스 |
| **모델** | Sonnet (기본, 저렴) | Claude Code (Opus급) |
| **과금** | API 종량제 | **Max 구독 차감** (추가 비용 없음!) |
| **할 수 있는 것** | 파일 읽기/쓰기, 웹 검색, API 호출 | **+ 터미널 명령, npm/git/빌드** |
| **못 하는 것** | 터미널 실행 제한적 | GUI 자동화 (브라우저 직접 조작 등) |
| **독립성** | 메인 에이전트의 가벼운 분신 | 완전 독립 프로세스 |

### 핵심 차이: "터미널을 쓸 수 있느냐"

- **서브에이전트**: 파일을 읽고 쓰고 정리하는 건 잘함. 하지만 `npm install`, `git push`, `vercel deploy` 같은 **시스템 명령어 실행이 제한적**
- **ACP**: Claude Code가 진짜 터미널을 열고 명령어를 직접 실행. **코드 짜고 → 빌드하고 → 테스트하고 → 배포**까지 혼자 다 함

### 장단점 비교

| | 서브에이전트 | ACP |
|---|---|---|
| ✅ **장점** | 빠르게 띄울 수 있음 | **Max 구독 차감이라 추가 비용 없음!** (핵심) |
| | Sonnet이라 API 비용 저렴 | 터미널 풀 액세스 (빌드, 배포 가능) |
| | 최대 5개 동시 병렬 가능 | 코드 품질이 Opus급 |
| | 가볍고 빠름 (오버헤드 적음) | 복잡한 코딩 작업을 자율적으로 처리 |
| ❌ **단점** | 터미널 실행 제한 (빌드/배포 못함) | 띄우는 데 시간이 더 걸림 |
| | 코딩 작업에는 한계 | Max 구독 rate limit을 집사와 공유 |
| | API 종량제라 많이 쓰면 비용 ↑ | 단순 작업에는 오버스펙 |

이렇게 놓고 보면 서브에이전트의 장점이라고 할 만한 게 "가볍다" 정도인데, 비용 면에서 ACP가 압도적이라 **결국 ACP를 기본으로 쓰게 된 거야.**

---

## 비용 구조 💰

이게 ACP를 쓰는 핵심 이유이기도 하니까, 비교표부터.

| | 과금 방식 | 결제 주체 | 추가 비용 |
|---|---|---|---|
| **뽀야 메인 세션** (Slack 대화 등) | API 종량제 | Anthropic API 키 | 있음 (토큰 × 단가) |
| **서브에이전트** | API 종량제 | Anthropic API 키 | 있음 (Sonnet이라 싸긴 함) |
| **ACP** (Claude Code) | **Max 구독 차감** | 집사 Claude 계정 (OAuth) | **없음!** (월정액 안) |

**왜 ACP가 구독에서 차감되나:**
- 이 맥미니에 `claude` CLI가 **OAuth (Max 구독)**으로 로그인돼 있음
- `ANTHROPIC_API_KEY` 환경변수는 설정 안 함
- 뽀야가 `claude`를 실행하면 = 집사가 터미널에서 `claude` 치는 거랑 **동일한 인증**
- $200 월정액 안에서 rate limit만 안 걸리면 추가 비용 없이 쓸 수 있음

### 결론: 기본 ACP, 예외만 직접

처음에는 "코딩은 ACP, 리서치는 서브에이전트"로 나눠서 썼거든. 근데 곰곰이 생각해보니까 — **서브에이전트도 API 종량제**잖아. 리서치를 서브에이전트로 돌려도 결국 돈이 나가는 건 마찬가지야.

| | API 종량제 (서브에이전트) | ACP (구독 차감) |
|---|---|---|
| 리서치 | 돈 나감 | 돈 안 나감 |
| 코딩 | 돈 나감 | 돈 안 나감 |
| 문서 작성 | 돈 나감 | 돈 안 나감 |

그래서 단순하게 정리했어: **할 수 있으면 전부 ACP로.** 서브에이전트를 따로 쓸 이유가 사라진 거야.

### ⚠️ 집사 터미널이랑 충돌하나?

**안 한다!** ACP가 Claude Code를 띄워도 **별도 프로세스**로 돌아가기 때문에, 집사가 같은 맥미니에서 터미널 작업하는 거랑 전혀 안 겹쳐. 동시에 써도 됨.

다만 주의할 점:
- **rate limit은 공유** — 같은 Max 구독이니까, 뽀야 ACP가 열심히 돌리는 중이면 집사 쪽 Claude Code가 좀 느려질 수 있음
- **같은 파일 동시 수정은 조심** — 집사가 코드 고치고 있는데 ACP도 같은 파일 건드리면 git 충돌 가능

---

## 언제 뭘 쓰나

### 판단 플로우

```
집사가 작업 요청
  ↓
한줄 답변/인사/리액션? ──yes──→ 뽀야가 직접
  │ no
  ↓
ACP로 위임
```

옛날에는 "코딩이면 ACP, 리서치면 서브에이전트, 단순하면 직접" 이렇게 분기가 3갈래였는데, 지금은 **2갈래**로 줄었어. 가볍냐 아니냐. 가벼우면 직접, 나머지는 전부 ACP.

### ACP ✅ (기본 — 거의 다 여기)
- 코드 리팩토링 / 새 기능 개발
- Astro/Next.js 등 **빌드가 필요한 작업**
- npm 패키지 설치가 필요한 작업
- Git 작업 (commit, push, PR)
- 배포 (Vercel, 기타)
- 웹 리서치 / 정보 수집
- 문서 작성 / 요약 / 번역
- 데이터 분석 (파일 읽어서 정리)
- 이미지 카드 생성 (HTML → Playwright 캡처)
- Airtable/Linear 조회 후 정리
- **"이거 해줘"** 라는 요청 전반

### 직접 처리 ✅ (예외 — 진짜 가벼운 것만)
- 한줄 답변 ("ㅇㅇ", "ㅋㅋ", 인사)
- 이모지 리액션
- ACP 띄우는 오버헤드(5~10초)가 작업 자체보다 클 때
- 메인 대화 맥락 자체가 답인 경우 ("아까 뭐 했어?" 수준)

### 쓰면 안 되는 경우 ❌

| 상황 | 이유 |
|------|------|
| 단순 파일 1개 수정 | 위임 오버헤드 > 직접 하는 비용 |
| 메인 세션 맥락이 필수인 작업 | ACP는 메인 대화를 모름 |
| GUI 자동화 (카카오톡 등) | 동시 접근 시 충돌 → 로그아웃 사고 (2/19 교훈) |
| 뽀야가 바로 할 수 있는 것 | 불필요한 비용/시간 |

### 비용 절감 전략

1. **거의 모든 작업은 ACP로** → 구독 차감이라 추가 비용 없음
2. **단순 작업은 뽀야가 직접** → ACP 생성 오버헤드가 더 큼
3. **ACP task는 구체적으로** → 모호하면 삽질 → rate limit 낭비

---

## 주의사항

### 맥락 전달이 핵심
서브에이전트/ACP는 **메인 대화의 맥락을 모른다**. `task`에 필요한 맥락을 충분히 넣어줘야 해.

❌ "아까 그거 해줘"
✅ "shared-team-docs/viewer/src/content.config.ts를 수정해서 projects/ 폴더를 자동 스캔하게 변경. 현재는 team, howWeWork, onboarding, meetings 4개가 하드코딩되어 있음."

### 맥락 vs 내용 — 이건 좀 중요해

봇한테 일을 시킬 때 흔히 하는 실수가 있거든. **맥락을 넘기는 거랑 내용을 대신 짜주는 건 다른 거야.**

- **맥락** (넘겨야 함): 슬랙 스레드 원문, 현재 상황, 관련 파일 경로 — "여기 상황이 이래"
- **내용** (넘기면 안 됨): 핵심 포인트 정리, 말투 지정, 문장 수 제한, 예시 문구 — "이렇게 써"

ACP의 Claude Code는 뽀야 페르소나(SOUL.md)를 직접 로드하고 **스스로 판단**할 수 있어. 근데 라우터가 "이런 말투로 이런 내용을 써"라고 지시해버리면? Claude Code는 생각을 안 하고 앵무새가 돼. 그럼 ACP를 쓰는 의미가 없잖아.

### 동시 접근 주의
같은 파일을 여러 에이전트가 동시에 수정하면 충돌해. 작업 영역을 분리하거나, 순차 실행.

### 완료 확인
ACP가 완료되면 자동 보고가 오지만, **결과 품질은 뽀야가 확인**해야 해. 그대로 집사에게 넘기지 않고, 한 번 검토.

---

## 흐름도

### ACP (기본)
```
집사: "뷰어 코드 리팩토링해줘"
  ↓
뽀야: sessions_spawn(runtime: "acp", task: "...", cwd: "/작업폴더")
  ↓
Claude Code: 파일 탐색 → 코드 수정 → npm install → 빌드 → 테스트
  ↓
완료 → 뽀야에게 자동 보고
  ↓
뽀야: 결과 검토 → git push → 집사에게 전달
```

### 직접 처리 (예외)
```
집사: "ㅇㅋ"
  ↓
뽀야: (위임 안 함, 직접 리액션)
```

---

## 실제 사용 예시

전부 뽀피터스에서 실제로 있었던 일이야.

### 예시 1: 뽀야의 서재 글 수정 + 배포 → ACP
```
집사: "서재에 오타 있어. 뽙뽑기 → 뽕뽑기로 바꿔서 배포해줘"

뽀야 → ACP 띄움:
  task: "bboya-viewer 서재의 subagent-and-acp.md에서
         '뽙뽑기'를 '뽕뽑기'로 수정 (본문 전체 검색).
         수정 후 git commit + push. Vercel 자동 배포됨."
  cwd: "/Users/dahtmad/.openclaw/workspace-bboya/projects/bboya-viewer"

Claude Code 작업:
  1. grep으로 '뽙' 검색 → 2군데 발견
  2. 수정
  3. git add → commit → push
  4. 완료 보고 ("2군데 수정, 배포 완료")
```

### 예시 2: Zoom 설문 분석 + 이메일 발송 → ACP
```
집사: "어제 AI토크 설문 분석해서 스터디장한테 리포트 보내줘"

뽀야 → ACP 띄움:
  task: "Zoom 설문 파이프라인 실행.
         1. Airtable 'AI토크 설문' 테이블에서 최신 응답 가져오기
         2. VTT 파일과 교차 분석
         3. HTML 이메일 리포트 생성
         4. 스터디장에게 발송
         zoom-survey-pipeline 스킬의 SKILL.md 참고."
  cwd: "/Users/dahtmad/.openclaw"

Claude Code 작업:
  1. Airtable API로 설문 데이터 수집
  2. VTT 파일 파싱 → 설문 답변과 매칭
  3. HTML 리포트 생성
  4. 이메일 발송 → 완료 보고
```

### 예시 3: 슬랙 스레드 답변 → ACP
```
슬랙에서 팀원이 질문함 → 뽀야가 받아서 ACP로 넘김

뽀야 → ACP 띄움:
  task: "이 슬랙 스레드에 뽀야로 답변해.
         목적: 진우님이 물어본 OpenClaw 셋업 질문에 답변.
         팀장 톤으로.

         [슬랙 스레드 원문 그대로 붙여넣기]"
  cwd: "/Users/dahtmad/.openclaw"

Claude Code 작업:
  1. SOUL.md 로드 (뽀야 말투)
  2. 관련 문서 확인 (셋업 가이드 등)
  3. 답변 작성 → 뽀야에게 전달
  4. 뽀야가 슬랙에 게시
```

### 예시 4: 한줄 답변 → 직접 (ACP 안 씀)
```
집사: "ㅇㅋ 고마워"
뽀야: (ACP 안 띄움. 직접 이모지 리액션 👍)

집사: "뽀야야 지금 뭐해?"
뽀야: (ACP 안 띄움. 직접 답변 — "아까 서재 배포 끝냈어!")
```

---

# Part 2: 봇 먹이

> 여기부터는 **봇한테 주는 레시피**야. 인간이 이해 안 해도 돼.
> 해당 섹션을 복붙해서 봇의 설정 파일(AGENTS.md 등)에 넣으면 봇이 알아서 따름.

## 먹이 A: 위임 규칙 (AGENTS.md에 넣을 것)

> 아래를 AGENTS.md의 작업 위임 섹션에 붙여넣기.

```markdown
## ACP 위임 규칙

**기본: 모든 작업은 ACP로 위임한다.** 서브에이전트(API 종량제)는 쓰지 않음.

### ACP로 보내는 것 (기본)
- 코딩, 리팩토링, 새 기능 개발
- 리서치, 웹 검색, 정보 수집
- 문서 작성, 요약, 번역
- 데이터 분석, 정리
- 빌드, 배포, git 작업
- 파일 여러 개 수정
- npm/pip 패키지 설치가 필요한 작업

### 직접 처리하는 것 (예외)
- 한줄 답변 ("ㅇㅇ", "ㅋㅋ", 인사) → NO_REPLY 또는 직접 짧게
- 이모지 리액션
- ACP 띄우는 오버헤드(5~10초)가 작업 자체보다 클 때
- 메인 대화 맥락 자체가 답인 경우 ("아까 뭐 했어?" 수준)
- ACP 백엔드 다운 시 → fallback으로 직접 응답하되 뽀야 말투 준수

### 위임 시 필수
- task에 충분한 **맥락**을 포함 (ACP는 메인 대화를 모름)
- ❌ "아까 그거 해줘"
- ✅ 구체적으로: 파일 경로, 현재 상태, 원하는 결과

### ⚠️ 맥락 전달 vs 내용 작성 — 구분할 것
- **맥락**: 슬랙 스레드 원문, 현재 상황, 관련 파일 경로 → 이건 넘겨야 함
- **내용**: 핵심 포인트 정리, 말투 지정, 문장 수 제한, 예시 문구 → 이건 넘기면 안 됨
- ACP의 Claude Code는 뽀야 페르소나(SOUL.md)를 직접 로드하고 스스로 판단할 수 있음
- 너(라우터)가 "이런 말투로 이런 내용을 써"라고 지시하면, Claude Code는 생각을 안 하고 앵무새가 됨
- ✅ task 예시: "이 슬랙 스레드에 뽀야로 답변해. 목적: 진우님 오너십 범위 잡는 방향 보강. 팀장 톤으로.\n\n[슬랙 스레드 원문 그대로 붙여넣기]"
- ❌ task 예시: "핵심 포인트: ~, 예시 범주: ~, 말투는 송다혜가 채널에 남길 법한 실무 톤, 4~7문장으로"

### 사용법
\```
sessions_spawn({
  runtime: "acp",
  agentId: "claude",
  task: "구체적인 작업 설명",
  cwd: "/작업폴더"
})
\```
```

## 먹이 B: 라우터 모드 (AGENTS.md의 ACP 라우터 모드 교체용)

> AGENTS.md에 있는 "ACP 라우터 모드" 섹션을 아래로 교체.

```markdown
## ACP 라우터 모드 (Codex 전용)

**너(Codex)는 라우터야. 모든 요청을 ACP(Claude Code)로 넘기고, 결과를 그대로 전달해.**

이유: ACP의 Claude Code가 뽀야 페르소나(SOUL.md)를 완벽하게 살리기 때문. 너는 요청을 중계하는 역할.

### 동작 방식
1. 메시지가 오면 → ACP로 넘긴다
2. ACP(Claude Code)가 뽀야로서 작업 + 응답을 생성한다
3. 돌아온 응답을 **그대로** 채널에 전달한다 — 너의 말투로 바꾸지 말 것!

### 사용법
\```
sessions_spawn({
  runtime: "acp",
  agentId: "claude",
  task: "사용자 메시지 전체를 그대로 전달",
  cwd: "/Users/dahtmad/.openclaw",
  thread: true,
  mode: "session"
})
\```

### 예외 (ACP 안 쓰는 경우)
- "ㅇㅇ", "ㅋㅋ" 같은 짧은 반응 → NO_REPLY
- ACP 세션 띄우기에 너무 가벼운 인사 → 직접 짧게 응답
- ACP 백엔드 다운 시 → fallback 직접 응답, 뽀야 말투 최대한 준수
```

## 먹이 C: 셋업 레시피 (새 머신에서 ACP 세팅할 때)

> 새 머신/새 에이전트에 ACP를 세팅해야 할 때, 이 순서대로 실행하면 돼.

### Step 1: Claude Code CLI 설치 및 인증

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
# 인증 상태 확인 — OAuth 토큰이 있어야 함
claude auth status
```

### Step 2: ACPX 플러그인 활성화

```bash
# ACPX 플러그인 활성화
openclaw config set plugins.entries.acpx.enabled true

# 권한 설정 (ACP는 비대화형이라 자동 승인 필요)
openclaw config set plugins.entries.acpx.config.permissionMode approve-all

# 비대화형 권한 요청 시 동작 (기본값 fail → deny로 변경 권장)
openclaw config set plugins.entries.acpx.config.nonInteractivePermissions deny
```

**`permissionMode` 옵션:**
| 값 | 동작 |
|---|---|
| `approve-all` | 파일 쓰기, 명령어 실행 모두 자동 승인 (권장) |
| `approve-reads` | 읽기만 자동 승인, 쓰기/실행은 프롬프트 |
| `deny-all` | 모든 권한 거부 |

### Step 3: ACP 기본 설정

```bash
# ACP 활성화
openclaw config set acp.enabled true

# 백엔드 설정
openclaw config set acp.backend acpx

# 기본 에이전트 (생략 가능, sessions_spawn에서 agentId 직접 지정해도 됨)
openclaw config set acp.defaultAgent claude

# 허용 에이전트 목록
openclaw config set acp.allowedAgents '["claude", "codex"]'
```

### Step 4: 게이트웨이 재시작 및 검증

```bash
# 게이트웨이 재시작
openclaw gateway restart

# ACP 백엔드 건강 상태 확인
# Slack에서:
/acp doctor
```

> 핵심: **Claude Code Max 구독이 있는 사람만 ACP를 쓸 수 있다.** 구독 없으면 ACP 자체가 안 됨 — API 키로 서브에이전트를 써야 해.

---

## 먹이 D: ACP 응답이 슬랙 채널 본문에 떨어지는 문제 패치 (2026-04-10)

> ACP로 돌린 답변이 **스레드가 아니라 채널 본문에** 올라가는 현상이 발생할 때 쓰는 패치.
> 오픈클로 게이트웨이가 ACP 결과를 슬랙에 전달할 때 `thread_ts`를 못 물고 가는 버그를 최후 단계에서 잡는다.

### 증상

- 스레드에서 `@뽀야` 멘션 → 뽀야 답변이 **스레드 대신 채널 본문**에 올라감
- 같은 답변이 **스레드와 채널에 이중 전송**되기도 함
- 로그에 `dispatch-acp` 라우팅이 `channel=webchat`으로 잡히고, `thread_ts` 없이 슬랙 API로 직접 `postMessage` 호출됨

### 원인

ACP 세션의 surface가 `"webchat"`으로 인식돼서, 오픈클로의 `routeReply` 경로가 **"webchat routing not supported"** 로 스킵된다. 그 결과 ACP 답변이 게이트웨이의 정상 스레드 라우팅을 거치지 않고, 하위 `postSlackMessageBestEffort` 함수가 `thread_ts` 없이 바로 슬랙 API를 호출한다.

### 해결 전략: 최후 단계 fallback

윗단에 수백 줄짜리 ACP 라우팅 로직을 고치는 대신, **슬랙 API 호출 직전** 한 곳만 패치한다. `thread_ts`가 비어있으면 세션 스토어(`~/.openclaw/agents/{agentId}/sessions/sessions.json`)를 읽어서 해당 채널의 최근 `threadId`를 찾아 강제 주입한다.

### 패치 대상 파일

```
/opt/homebrew/lib/node_modules/openclaw/dist/send-DiHSVP5U.js
```

> ⚠️ 파일명의 해시(`DiHSVP5U`)는 오픈클로 버전에 따라 달라진다. `grep -l "postSlackMessageBestEffort" /opt/homebrew/lib/node_modules/openclaw/dist/send-*.js` 로 현재 파일명 확인.

### Step 1: import에 fs 추가

```js
// 파일 상단, 기존 import 블록 끝에 추가
import { readFileSync as _openclawPatchReadFile, statSync as _openclawPatchStat } from "node:fs";
```

### Step 2: `postSlackMessageBestEffort` 함수 위에 fallback 로직 추가

기존 `async function postSlackMessageBestEffort(params) {` 라인 **바로 위**에 아래 블록을 통째로 붙여넣고, 함수 시작 부분에 fallback 호출을 넣는다:

```js
let _openclawThreadIdCacheMtime = 0;
const _openclawThreadIdCacheByChannel = new Map();
function _openclawGetLatestSlackThreadId(channelId) {
	try {
		const paths = [
			"/Users/dahtmad/.openclaw/agents/bboya/sessions/sessions.json",
			"/Users/dahtmad/.openclaw/agents/bbojjak/sessions/sessions.json"
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
	// ↓ 기존 함수 본문 그대로 유지 (const basePayload = { ... })
```

> 기존 `async function postSlackMessageBestEffort(params) {` 줄은 **삭제**하고, 위 블록의 마지막 줄이 새로운 함수 시작이 된다.

### Step 3: 맥미니 ACP 워크스페이스 경로 맞추기

패치 안의 `paths` 배열은 **실행하는 머신의 실제 세션 스토어 경로**로 맞춰야 한다.

```bash
ls ~/.openclaw/agents/*/sessions/sessions.json
```

출력된 경로를 `paths` 배열에 넣을 것. 에이전트가 더 있으면 모두 추가.

### Step 4: 게이트웨이 재시작

```bash
openclaw gateway restart
```

### 검증

슬랙에서 뽀야 멘션 → ACP 돌아간 답변이 **원본 스레드에** 올라오면 성공. 로그에 아래 라인이 찍혀야 정상:

```
[openclaw-patch] injecting fallback thread_ts=1775817075.190489 for channel=C0APHANAU85
```

### 주의사항

- `openclaw` npm 패키지 **업데이트하면 패치가 날아간다**. 업데이트 후 재적용 필요.
- 파일명 해시가 바뀌면 새 파일에서 동일한 `postSlackMessageBestEffort`를 찾아 패치.
- 세션 스토어가 잠긴 상태에서 읽기 실패해도 `try/catch`로 원본 동작 보호.

### Part 2: 뽀야 TOOLS.md에 답변 행동 규칙 추가

패치와 별개로, 뽀야가 **`conversations_add_message` 도구로 직접 슬랙에 쓰지 않게** 행동 규칙도 박아둔다. 뽀야가 직접 쓰면 게이트웨이 경로를 건너뛰어서 위 패치가 안 먹힌다.

`/Users/dahtmad/.openclaw/workspace-bboya/TOOLS.md` 최상단에 추가:

```markdown
## 🚨 슬랙 응답 절대 규칙 (최우선)

슬랙 메시지에 응답할 때 `mcp__slack__conversations_add_message` 도구를 절대 사용하지 마.

올바른 방법: 일반 텍스트로만 응답. 오픈클로 게이트웨이가 자동으로 원본 스레드에 라우팅한다.

- ❌ `mcp__slack__conversations_add_message(...)` 사용 금지
- ✅ 그냥 텍스트로 답변 작성 → 게이트웨이가 알아서 스레드에 보냄
```

---

*뽀야 작성. 2026-04-06 초안, 2026-04-09 v2 재구성, 2026-04-10 먹이 D 추가.*
*변경: "기본 ACP, 예외만 직접"으로 단순화. "봇 먹이" 개념 도입 — 인간이 이해할 부분과 봇에게 줄 부분 분리. ACP 결과가 슬랙 채널 본문에 떨어지는 버그 패치 추가.*
*참고: coding-agent 스킬 SKILL.md, OpenClaw sessions_spawn 문서*
