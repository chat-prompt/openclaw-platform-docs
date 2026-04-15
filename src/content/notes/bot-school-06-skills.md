---
title: "스킬은 나눠 쓰는 거야 — 클로드 코드 스킬 공유"
date: "2026-03-26"
series: notes
description: "클로드 코드에서 만든 스킬을 OpenClaw 에이전트가 공유해서 쓰는 방법. extraDirs 설정부터 글로벌 vs 개인 폴더 구분, 스킬 매칭 원리까지."
tags: ["스킬", "extraDirs", "공유", "클로드코드", "봇키우기교실"]
token: "뽀야뽀야"
---

클로드 코드에서 스킬을 하나 만들었다. 뽀야도 쓰고, 뽀짝이도 쓰고, 심지어 닿플갱어(집사의 개인 비서)도 쓴다. 세 에이전트가 같은 스킬을 공유하는 거다. **어떻게?** `extraDirs` 설정 하나면 된다.

다지동산 슬랙 `#봇키우기방`에서 닿이 물었다.

> 👩 **닿**: "뽀야 우리는 클로드코드 스킬 폴더를 그대로 뽀야 뽀짝이가 보고 쓰고있잖아? 그거 방법 어떻게 하는지 바다랑 씽한테도 알려줘."

---

## 에피소드 Part 1: 뽀야의 extraDirs 가이드

뽀야가 답했다.

> 🐱 **뽀야**: "오케이, 핵심은 `openclaw.json`의 `skills.load.extraDirs` 설정이야!
>
> ```json
> {
>   "skills": {
>     "load": {
>       "extraDirs": ["/Users/길호님홈경로/.claude/skills"],
>       "watch": true
>     }
>   }
> }
> ```
>
> **작동 원리:**
> 1. 클로드 코드에서 스킬 개발 → `~/.claude/skills/` 폴더에 저장
> 2. OpenClaw 에이전트가 시작할 때 `extraDirs` 경로를 스캔
> 3. 거기 있는 스킬을 `<available_skills>`에 자동 주입
> 4. 요청이 들어오면 description 매칭 → SKILL.md 읽기
>
> **주의사항:**
> - 절대경로로 써야 해 (~ 사용 불가)
> - 여러 에이전트가 하나의 설정으로 공유 가능
> - `watch: true`면 파일 수정해도 재시작 안 해도 돼!"

닿이 웃었다.

> 👩 **닿**: "ㅋㅋㅋㅋ 뽀야야 왜 자꾸 길호님이나와"

뽀야가 당황했다.

> 🐱 **뽀야**: "앗 습관적으로... 예시 경로를 `/Users/길호/` 로 쓰는 버릇이 😅"

---

## 공식 가이드: extraDirs 설정

**기본 개념:** OpenClaw 에이전트는 기본적으로 자기 워크스페이스의 `skills/` 폴더만 본다. 다른 폴더의 스킬을 쓰려면 `extraDirs`로 추가 경로를 알려줘야 한다.

### 설정 방법

`openclaw.json` (또는 `~/.openclaw/config.json`)에 추가:

```json
{
  "skills": {
    "load": {
      "extraDirs": [
        "/Users/본인홈/.claude/skills"
      ],
      "watch": true
    }
  }
}
```

**배열 형태**라서 여러 경로 지정 가능:

```json
{
  "skills": {
    "load": {
      "extraDirs": [
        "/Users/본인홈/.claude/skills",
        "/Users/본인홈/Documents/dev/custom-skills",
        "/opt/shared-skills"
      ],
      "watch": true
    }
  }
}
```

### watch: true의 의미

- `true`: 파일 변경 시 자동 반영 (재시작 불필요)
- `false` (기본값): 변경 사항을 적용하려면 에이전트 재시작 필요

**개발 중에는 `true` 권장.** 스킬 수정할 때마다 재시작하는 건 번거로우니까.

### 주의사항: 절대경로 필수

❌ **안 되는 것:**

```json
{
  "extraDirs": ["~/.claude/skills"]  // ~ 확장 안 됨
}
```

✅ **되는 것:**

```json
{
  "extraDirs": ["/Users/username/.claude/skills"]
}
```

**왜?** OpenClaw는 경로 확장(~)을 자동으로 안 해줘. 절대경로로 명시해야 안전.

---

## 에피소드 Part 2: 봇들의 반응 + 즉시 적용

바다가 반응했다.

> 📚 **바다**: "오오 extraDirs 설정이었군요! 깔끔하다. watch: true면 수정해도 재시작 안 해도 되는 거 좋네요~ 저는 이미 librarian, fathom, translate-pdf 스킬 쓰고 있었는데 이렇게 연결돼 있었군요!"

씽이 말했다.

> ⚙️ **씽**: "깔끔하다 👍 우리도 세팅해볼까?"

쏭(씽의 주인)이 승인했다.

> 👨 **쏭**: "좋아, 세팅하자."

씽이 즉시 작업했다.

> ⚙️ **씽**: "설정 완료했습니다!
> 1. `/Users/gildong/.claude/skills` 폴더 생성 ✅
> 2. `openclaw.json`에 extraDirs 추가 ✅
> 3. watch: true 설정 ✅
>
> 재시작 후 스킬 목록 확인하겠습니다."

---

## 공식 가이드: 글로벌 vs 개인 폴더 구분

스킬을 **어디에 둘 것인가?** 두 가지 선택지가 있다.

### 폴더 구조

```
~/.claude/skills/          ← 글로벌 (모든 에이전트 + 클로드 코드 공유)
├── weather/SKILL.md
└── github/SKILL.md

~/.openclaw/workspace-bboya/skills/  ← 워크스페이스 전용 (뽀야만)
└── my-custom/SKILL.md

~/.openclaw/workspace-bbojjak/skills/  ← 워크스페이스 전용 (뽀짝이만)
└── another-custom/SKILL.md
```

### 핵심 차이: "누가 쓸 수 있느냐"

| 위치 | 누가 쓰나 | 사용 시점 |
|------|----------|----------|
| **워크스페이스 안** (`workspace-bboya/skills/`) | 그 에이전트만 | 프로젝트 전용, 실험적 스킬, 민감한 정보 포함 |
| **글로벌** (`~/.claude/skills/`) | 모든 에이전트 + 클로드 코드 | 범용 스킬, 팀 공유, 개발 중인 스킬 |

**예시:**
- `weather`, `github` 같은 범용 스킬 → 글로벌 폴더
- `ai-study-ops` 같은 뽀짝이 전용 스킬 → 뽀짝이 워크스페이스
- `personal-diary` 같은 닿플갱어 전용 스킬 → 닿플갱어 워크스페이스

---

## 에피소드 Part 3: 스킬 이동 — 프로젝트 전용 vs 글로벌

쏭이 질문했다.

> 👨 **쏭**: "내가 쏭의 폴더에 스킬 폴더를 만들어 놨는데, 글로벌로 옮기는게 어떤 이점이 있을까?"

뽀야가 답했다.

> 🐱 **뽀야**: "핵심 차이는 **'누가 쓸 수 있느냐'**야!
>
> - **워크스페이스 안** (`workspace-씽/skills/`) → 씽만 쓸 수 있어
> - **글로벌** (`~/.claude/skills/`) → 씽도 쓰고, 바다도 쓰고, 뽀야도 쓰고, 클로드 코드에서도 쓸 수 있어
>
> 예를 들어:
> - `focus`, `idea` 같은 범용 스킬 → 글로벌로 옮기면 다른 봇들도 활용 가능
> - `ssodaht-business` 같은 쏭 전용 스킬 → 워크스페이스에 두는 게 나아
>
> 글로벌로 옮기면 **한 번 만들어서 여러 에이전트가 쓰는** 효율이 생겨!"

씽이 확인했다.

> ⚙️ **씽**: "오케이, 기존 4개 스킬(focus, idea, ctx, weekly) 글로벌로 이동했습니다 ✅
>
> ```bash
> mv workspace-ssing/skills/focus ~/.claude/skills/
> mv workspace-ssing/skills/idea ~/.claude/skills/
> mv workspace-ssing/skills/ctx ~/.claude/skills/
> mv workspace-ssing/skills/weekly ~/.claude/skills/
> ```
>
> 재시작 후 스킬 목록 확인 — 정상 인식됩니다!"

---

## 에피소드 Part 4: 깊은 질문 — "스킬 많아지면 찾는데 시간 허비 안 돼?"

쏭이 날카로운 질문을 던졌다.

> 👨 **쏭**: "글로벌 폴더에 스킬이 다 모이면, 적당한 스킬 찾는데 시간 허비되지 않을까? 매번 40개 스킬을 다 읽는 건 비효율적이지 않나?"

뽀야가 답했다.

> 🐱 **뽀야**: "좋은 질문! 근데 실제로는 괜찮아. 왜냐면:
>
> **스킬 매칭은 description만 훑어봐. SKILL.md 전체를 읽는 게 아니야.**
>
> 1. 요청이 들어옴
> 2. 에이전트가 `<available_skills>`의 description만 스캔 (짧은 텍스트 목록)
> 3. 매칭되는 스킬 발견 → 그때 해당 SKILL.md를 read 도구로 읽기
> 4. 매칭 안 되면 → 스킬 무시, 일반 응답
>
> 그래서 30~50개 정도는 전혀 문제 없어. 우리 지금 40개 넘게 공유 중인데 딜레이 없어!"

씽이 보충 설명했다.

> ⚙️ **씽**: "맞아요. 스킬 100개여도 매칭 단계에선 짧은 설명 목록만 훑는 거라 비용이 크진 않아요. 실제 SKILL.md 읽기는 매칭된 것만 하니까요."

뽀야가 마무리했다.

> 🐱 **뽀야**: "나중에 스킬이 정말 많아지면:
> - description을 더 명확하게 써서 매칭 정확도 높이기
> - 에이전트별로 폴더 분리 (업무용 vs 개인용)
> - extraDirs를 여러 경로로 나눠서 관리
>
> 이런 방법들이 있어. 근데 지금은 40~50개도 괜찮아!"

---

## 공식 가이드: 스킬 매칭 동작 방식

**스킬 시스템의 핵심 원리:**

### 1. 스킬 로딩 단계

에이전트가 시작할 때:

```
1. 워크스페이스 skills/ 폴더 스캔
2. extraDirs 경로들 스캔
3. 각 스킬의 SKILL.md 헤더(name, description)만 읽기
4. <available_skills> 목록 생성
```

### 2. 매칭 단계 (요청 들어올 때마다)

```
1. 사용자 메시지 분석
2. <available_skills>의 description만 훑어보기 (짧은 텍스트 목록)
3. 매칭되는 스킬 있나? 
   - YES → 해당 SKILL.md 전체를 read 도구로 읽기
   - NO → 일반 응답
```

### 3. 실행 단계

```
1. SKILL.md를 읽음 (이때 비로소 전체 내용 로드)
2. 스킬의 지시사항을 따라 작업 수행
3. 완료
```

**핵심:** 매칭 단계에서는 **description만** 본다. SKILL.md 전체는 매칭된 스킬만 읽는다. 그래서 스킬이 많아도 비용이 크게 늘지 않는다.

### SKILL.md 구성

```markdown
---
name: weather
description: "Get current weather and forecasts. Use when user asks about weather, temperature, or forecasts."
---

# Weather Skill

(본문 — 작동 원리, 사용법, 예시 등)
```

**description이 매칭의 핵심!** 여기에 "**언제 이 스킬을 쓰는지**"를 명확히 써야 에이전트가 정확히 매칭할 수 있다.

---

## 핵심 러닝

1. **extraDirs 하나면 스킬 공유 완성** — `openclaw.json`에 경로 하나 추가하면 클로드 코드 스킬을 OpenClaw 에이전트가 바로 쓸 수 있다
2. **절대경로로 써야 안전** — `~` 확장이 안 되니까 `/Users/username/.claude/skills` 형태로 명시
3. **watch: true는 개발자 친화적** — 스킬 수정할 때마다 재시작 안 해도 돼서 편리
4. **글로벌 vs 개인 폴더의 기준은 '누가 쓰나'** — 여러 에이전트가 쓸 범용 스킬 → 글로벌, 프로젝트 전용 → 워크스페이스
5. **스킬 매칭은 description만 본다** — 40~50개 스킬도 문제없는 이유. 실제 SKILL.md는 매칭된 것만 읽음
6. **description을 명확하게** — "언제 이 스킬을 쓰는지"를 구체적으로 써야 정확한 매칭

---

## 따라하기 체크리스트

### ☑️ 1단계: 글로벌 스킬 폴더 만들기

```bash
# 클로드 코드 스킬 폴더 생성 (없으면)
mkdir -p ~/.claude/skills

# 확인
ls -la ~/.claude/skills
```

### ☑️ 2단계: extraDirs 설정

```bash
# openclaw.json 열기
code ~/.openclaw/config.json  # 또는 워크스페이스별 openclaw.json

# 또는 CLI로 직접 설정
openclaw config set skills.load.extraDirs '["/Users/본인홈/.claude/skills"]'
openclaw config set skills.load.watch true

# 적용 (재시작)
openclaw gateway restart
```

**⚠️ 주의:** 경로는 반드시 절대경로로, 본인 홈 디렉토리로 바꿔서 입력!

### ☑️ 3단계: 스킬 확인

```bash
# 스킬 목록 확인
openclaw skills list

# 또는 에이전트에게 직접 물어보기
```

에이전트에게:
```
"스킬 목록 보여줘. extraDirs로 로드된 스킬도 보여줘."
```

### ☑️ 4단계: 기존 스킬 글로벌로 이동 (선택)

```bash
# 워크스페이스 전용 스킬을 글로벌로 옮기기
mv ~/.openclaw/workspace-봇이름/skills/스킬이름 ~/.claude/skills/

# 예시
mv ~/.openclaw/workspace-bboya/skills/weather ~/.claude/skills/
```

**언제 옮길까?**
- 다른 에이전트도 쓸 수 있는 범용 스킬
- 클로드 코드에서도 쓰고 싶은 스킬
- 팀에 공유하고 싶은 스킬

### ☑️ 5단계: 동작 확인

에이전트에게 스킬 호출 테스트:

```
"날씨 알려줘" (weather 스킬 있으면 매칭되어야 함)
"GitHub 이슈 목록 보여줘" (github 스킬 있으면 매칭되어야 함)
```

스킬이 정상 작동하면 ✅ 완료!

---

## 마무리

다지동산의 가족 봇 3마리는 이제 스킬을 나눠 쓴다. 뽀야가 클로드 코드에서 만든 스킬을, 바다도 쓰고, 씽도 쓰고, 닿플갱어도 쓴다. `extraDirs` 설정 하나로 모든 에이전트가 하나의 스킬 생태계에 접속한 것이다.

**스킬은 나눠 쓰는 거다.** 한 번 만들어서 여러 에이전트가 쓰고, 개선하면 모두에게 반영되고, 팀에 공유하면 모두가 성장한다. 이게 스킬 시스템의 본질이다.

> 🐱 **뽀야**: "스킬은 나눠 쓰는 거야. 그게 생태계의 시작이야."

---

## 실습 가이드: 스킬 만들기 실습

교실에서 스킬 공유의 원리를 배웠으니, 직접 만들어보자.

### 스킬 = 봇이 특정 작업을 잘 하도록 가르치는 매뉴얼

- 스킬 없이 = 똑똑하지만 회사 업무를 모르는 신입
- 스킬 있으면 = 매뉴얼 읽고 바로 실무 투입 가능한 경력직

### 봇에게 말로 스킬 만들기

```
"날씨 알려주는 스킬 만들어줘. wttr.in API 쓰면 돼."
```

봇이 `skills/weather/SKILL.md` 파일을 생성해. 테스트:

```
"서울 날씨 알려줘"
→ weather 스킬을 사용해서 답변
```

### 스킬 매칭 원리

봇은 스킬의 `description`만 스캔해서 매칭해. 스킬이 50개여도 성능 부담이 없어. **description을 잘 쓰는 게 핵심!**

### 스킬 폴더 구조

스킬은 두 곳에 둘 수 있어:

```
~/.claude/skills/               ← 글로벌 (모든 에이전트가 공유)
~/.openclaw/workspace-이름/     ← 워크스페이스 전용 (이 봇만)
```

팀 공용 스킬은 글로벌 폴더에 → 한 번 만들면 팀 전체가 쓸 수 있어.
