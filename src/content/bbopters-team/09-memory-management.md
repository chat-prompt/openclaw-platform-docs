---
title: "에이전트 메모리 관리 가이드"
date: "2026-04-02"
description: "세션 기반 에이전트의 파일 메모리 구조, 계층, 실전 패턴. 뽀야·뽀짝이 운영 데이터 기반."
---

# 에이전트 메모리 관리 가이드

> 세션 기반 에이전트의 파일 메모리 구조, 계층, 실전 패턴. 뽀야·뽀짝이 운영 데이터 기반.
> 2026-04-02 기준.

---

## 1. 왜 파일 기반 메모리인가

OpenClaw 에이전트는 **세션마다 새로 깨어납니다.** 이전 대화의 기억이 없습니다.
따라서 연속성을 확보하려면 **파일에 기록하고, 세션 시작 시 읽어서 맥락을 복구**하는 구조가 필수입니다.

이 구조의 핵심 원칙:
- **파일 = 기억.** 머릿속 메모는 세션 재시작 시 사라짐
- **1가지 정보는 1곳에만.** 나머지는 참조 링크
- **필요한 것만 읽기.** 전부 읽으면 토큰 낭비

---

## 2. 메모리 파일 구조

### 2-1. 공통 3층 구조 (뽀야 & 뽀짝이 공통)

| 계층 | 파일/폴더 | 역할 | 비유 |
|------|-----------|------|------|
| **장기 기억** | `MEMORY.md` | 현재 상태 스냅샷. "지금 뭐가 돌아가고 있는가" | 화이트보드 |
| **일일 기록** | `memory/YYYY-MM-DD.md` | 그날 작업·결정·사건의 날것 기록 | 일기장 |
| **기술 교훈** | `learnings/*.md` | 도구별 삽질 해결 기록 (시도→실패→원인→해결) | 오답노트 |

### 2-2. 뽀야 전체 구조

```
workspace-bboya/
├── MEMORY.md              # 장기 기억 (104줄, 현재 상태)
├── SOUL.md                # 정체성·성격·톤
├── USER.md                # 집사(관리자) 프로필
├── AGENTS.md              # 행동 규칙
├── TOOLS.md               # 도구 레퍼런스
├── HEARTBEAT.md           # 주기적 체크 항목
├── IDENTITY.md            # 기본 신상
├── memory/                # 일일 로그 (16개 날짜 파일 + 상태 파일)
│   ├── 2026-03-16.md ~ 2026-03-31.md
│   ├── heartbeat-state.json    # 하트비트 체크 시각
│   ├── work-profile.md         # 프로젝트/이슈 상세
│   └── work-folders.md         # 작업 폴더 매핑
├── learnings/             # 기술 교훈 (8개 파일, 32KB)
│   ├── cron-patterns.md
│   ├── general.md
│   ├── linear-mcporter.md
│   ├── playwright-capture.md
│   └── ... (총 8개)
├── projects/              # 프로젝트별 작업 폴더
└── shared/team/           # 멀티에이전트 공용 문서
```

**특징:** 범용적이고 단순. memory/에 대부분 넣는 flat 구조.

### 2-3. 뽀짝이 전체 구조

```
workspace-bbojjak/
├── MEMORY.md              # 장기 기억 (102줄)
├── SOUL.md / USER.md / AGENTS.md / TOOLS.md / ...
├── memory/                # 일일 로그 (40개 날짜 파일, 416KB)
│   ├── 2026-02-23.md ~ 2026-03-31.md
│   ├── kakaotalk-last-check.md
│   ├── duckhu-last-check.md
│   └── slack-user-directory.md
├── learnings/             # 기술 교훈 (13개 파일, 84KB)
│   ├── README.md          # ← 색인 파일 (2단계 로딩 게이트)
│   ├── airtable.md
│   ├── channeltalk-cs-cases.md
│   ├── sms-email.md
│   └── ... (총 13개)
├── context/               # ★ 기수 불문 정책·가이드 (16개 + templates/ 8개)
│   ├── policies.md
│   ├── about-ai-study.md
│   ├── cohort-prep-checklist.md
│   ├── cohort-runtime-checklist.md
│   └── templates/         # 메시지 템플릿
├── operations/            # ★ 기수별 운영 데이터
│   ├── 21기/
│   │   ├── 21기-운영정보.md
│   │   ├── 21기-진행현황.md
│   │   ├── 21기-발송내역.md
│   │   └── artifacts/
│   └── 20기/
├── workflows/             # ★ 1회성 절차 (스킬 아닌 것)
├── archives/              # 종료된 기수·레거시
└── shared/team/           # 멀티에이전트 공용 문서
```

**특징:** 업무 유형별 세분화된 구조. `context/`, `operations/`, `workflows/` 분리.

---

## 3. 세션 시작 시 읽는 순서

### 뽀야

```
[시스템 자동 주입] SOUL.md, USER.md, TOOLS.md, AGENTS.md, HEARTBEAT.md, IDENTITY.md, MEMORY.md
           ↓
[에이전트가 직접 읽기] memory/오늘.md + memory/어제.md
           ↓
[필요 시만] learnings/해당도구.md, work-profile.md 등
```

- 메인 세션(집사 1:1)에서만 MEMORY.md 로드
- 그룹챗/외부 세션에서는 MEMORY.md 스킵 (개인정보 보호)

### 뽀짝이

```
[시스템 자동 주입] SOUL.md, USER.md, TOOLS.md, AGENTS.md, HEARTBEAT.md, IDENTITY.md
           ↓
[에이전트가 직접 읽기]
  1. MEMORY.md
  2. shared/team/TEAM.md (팀 헌장)
  3. shared/team/COLLAB-RULES.md (협업 규칙)
           ↓
[필요 시만] memory/오늘.md, learnings/해당도구.md, context/policies.md 등
```

- "추가 컨텍스트가 필요할 때만 읽을 것" — 항상 전부 읽지 않음
- learnings/ 폴더는 README.md를 먼저 읽고 필요한 파일만 선택 (2단계 로딩)

---

## 4. 각 파일의 역할과 운영 규칙

### MEMORY.md — 장기 기억 (화이트보드)

| 항목 | 뽀야 | 뽀짝이 |
|------|------|--------|
| 크기 | 104줄 | 102줄 |
| 담는 것 | 활성 프로젝트, 팀 구성, 크론 체계, 블로커 | 21기 현황, 핵심 인프라, TODO |
| 갱신 시점 | 세션 정리 시 | 세션 정리 시 |

**규칙:**
- "지금 돌아가고 있는 것"만 기록. 과거 이벤트 상세는 memory/날짜.md에
- 교훈은 learnings/에. MEMORY.md에 교훈 넣지 않음
- 정기적 다이어트 필요 (완료된 프로젝트, 오래된 블로커 정리)

### memory/YYYY-MM-DD.md — 일일 기록 (일기장)

| 항목 | 뽀야 | 뽀짝이 |
|------|------|--------|
| 파일 수 | 16개 | 40개 |
| 전체 크기 | 440KB | 416KB |
| 기간 | 3/16 ~ 3/31 | 2/23 ~ 3/31 |
| 최대 1일 | ~149줄 | ~71KB (3/4) |
| 최소 1일 | ~11줄 | ~980B (3/16) |

**규칙:**
- h2 제목은 구체적으로: `## Airtable` ❌ → `## Airtable 마케팅DB 날짜 검증` ✅
- "이거 기억해" → 바로 오늘 날짜 파일에 기록
- 뽀짝이는 `write` 도구만 사용 (`edit` 도구 사용 시 에러 발생)

**⚠️ 현재 미비한 점:** 보관 주기 규칙 없음. 오래된 파일이 flat하게 쌓이는 중.

### learnings/*.md — 기술 교훈 (오답노트)

| 항목 | 뽀야 | 뽀짝이 |
|------|------|--------|
| 파일 수 | 8개 | 13개 |
| 전체 크기 | 32KB | 84KB |
| 색인 | 없음 | README.md로 색인 |

**뽀야 교훈 목록:** cron-patterns, general, image-card-design, linear-mcporter, openclaw-infra, playwright-capture, team-collab, telegram

**뽀짝이 교훈 목록:** airtable, bettermode, channeltalk-cs-cases, general, hedra-api, kakaotalk, linear-mcporter, lms, openclaw-infra, playwright-capture, prompt-injection, sms-email + README.md

**규칙:**
- 삽질 구조: 시도 → 실패 → 원인 → 해결
- 작업 전 해당 도구 learnings 파일을 먼저 읽으면 과거 삽질 반복 방지
- 뽀짝이는 README.md 게이트: 폴더 진입 시 ls 대신 README 먼저 읽기

### context/ — 정책·가이드 (뽀짝이 전용)

뽀짝이만 가진 레이어. 기수에 관계없이 적용되는 운영 규칙·체크리스트·메시지 템플릿.

- `policies.md` — 운영 정책 (환불, 양도, 대기 등)
- `cohort-prep-checklist.md` — 기수 준비 허브
- `cohort-runtime-checklist.md` — 기수 운영 허브
- `templates/` — 문자/이메일 메시지 템플릿

### operations/기수별/ — 운영 데이터 (뽀짝이 전용)

현재 기수의 실시간 운영 데이터. 기수가 끝나면 archives/로 이동.

- `21기-운영정보.md` — 날짜, 시간, 금액 등 팩트 데이터
- `21기-진행현황.md` — 현재까지 진행 상황
- `21기-발송내역.md` — 문자/이메일 발송 아카이브

---

## 5. 잘 되고 있는 것 vs 아쉬운 것

### ✅ 잘 되고 있는 것 (양쪽 공통)

| 포인트 | 설명 |
|--------|------|
| **3층 구조 분리** | MEMORY.md(스냅샷) + memory/(일일) + learnings/(교훈)로 역할 분리 → MEMORY.md 비대화 방지 |
| **세션 시작 시 맥락 복구** | MEMORY.md → 오늘 memory/ 읽으면 바로 이어서 작업 가능 |
| **learnings/ 독립** | 도구별 삽질 교훈이 분리되어, 해당 작업 시에만 선택적 로드 → 토큰 절약 |
| **일일 기록의 추적성** | "3/12에 뭘 했지?" → 바로 해당 파일 참조 가능 |

### ✅ 뽀짝이만의 강점

| 포인트 | 설명 |
|--------|------|
| **README.md 2단계 로딩** | 폴더 진입 시 ls 대신 README로 색인 → 필요한 파일만 선택 → 토큰 60~90% 절약 |
| **문서 레이어 가이드** | AGENTS.md에 "어디에 뭘 쓸지" 표가 있어서 정보 배치 고민 없음 |
| **RTK (토큰 절약 접두어)** | CLI 실행 시 `rtk` 접두어로 출력 압축 (git status, ls, curl 등) |
| **write만 사용 규칙** | memory/ 파일 저장 시 edit 도구 대신 write만 사용 → 에러 방지 |
| **세션 크기 관리** | 10만 토큰 → compact, 15만 → 메모리 기록 후 세션 정리 |
| **context/operations/ 분리** | 정책(불변)과 운영 데이터(기수별 가변)를 분리 → 깔끔한 라이프사이클 |

### ⚠️ 양쪽 공통 과제

| 과제 | 현황 | 개선 아이디어 |
|------|------|---------------|
| **memory/ 파일 쌓임** | 뽀야 16개·440KB, 뽀짝이 40개·416KB. 오래된 건 안 읽히는데 계속 남아있음 | 2주 지난 일일 로그 → archives/memory/로 자동 이동 크론 |
| **일일 로그 용량 편차** | 뽀짝이 3/4 하루짜리가 71KB, 3/16은 980B | 바쁜 날 로그는 당일 끝나면 요약 압축 |
| **MEMORY.md ↔ memory/ 중복** | 일일 로그에 쓴 걸 MEMORY.md에도 요약 → 같은 정보 두 곳 | MEMORY.md는 "현재 활성"만, 완료된 건 즉시 삭제 |
| **보관 주기 규칙 부재** | AGENTS.md에 명시적 보관 주기가 정의 안 됨 | 월 1회 MEMORY.md 다이어트 + memory/ 아카이브 규칙 명시 |
| **context/ 갱신 지연** (뽀짝이) | 정책 변경이 일일 로그에만 남고 context/policies.md에 바로 반영 안 되는 경우 | 정책 변경 시 일일 로그 + context/ 동시 갱신 규칙 |

---

## 6. 누가 세팅했는가

| 영역 | 설계자 | 시점 | 설명 |
|------|--------|------|------|
| **3층 구조 아키텍처** | 닿 (송다혜, 관리자) | 2026년 2월 | AGENTS.md에 문서 레이어 가이드로 정의 |
| **세부 운영 규칙** | 뽀야/뽀짝이 (자율) | 2월~3월 | h2 제목 규칙, 상태 추적 파일, heartbeat 등 점진적 추가 |
| **뽀짝이 확장 구조** | 닿 + 뽀짝이 | 2월 말~ | context/, operations/, workflows/ 추가, README.md 게이트 |
| **RTK 토큰 절약** | 뽀짝이 | 운영 중 발견 | CLI 출력 압축 접두어 |
| **세션 크기 관리** | 닿 (3/28 추가) | 2026년 3월 | 10만/15만 토큰 기준 규칙 |

**요약:** 아키텍처(뼈대)는 관리자가 잡아주고, 세부 운영(살)은 에이전트가 자율적으로 붙여온 형태.

---

## 7. 수치 요약

| 메트릭 | 뽀야 | 뽀짝이 |
|--------|------|--------|
| MEMORY.md 크기 | 104줄 | 102줄 |
| memory/ 파일 수 | 16 + 4상태 | 40 + 5상태 |
| memory/ 전체 크기 | 440KB | 416KB |
| learnings/ 파일 수 | 8개 | 13개 |
| learnings/ 전체 크기 | 32KB | 84KB |
| AGENTS.md 줄 수 | ~200줄 | ~284줄 |
| 운영 시작일 | 2026-02-14 | 2026-02-23 |
| 고유 폴더 | - | context/, operations/, workflows/ |

---

## 8. 권장 개선사항

1. **memory/ 아카이브 자동화**: 2주 지난 일일 로그를 `archives/memory/`로 이동하는 크론 스크립트
2. **MEMORY.md 월간 다이어트**: 매월 1일 완료된 프로젝트·오래된 블로커 정리
3. **일일 로그 용량 캡**: 바쁜 날 50KB 넘으면 당일 내 요약 압축
4. **뽀야에도 README.md 게이트 도입**: learnings/ 폴더에 README.md 색인 추가
5. **정책 변경 동시 갱신 규칙**: 일일 로그 + 정본(context/ 또는 AGENTS.md) 동시 업데이트

---

*이 문서는 뽀야와 뽀짝이가 실제 운영 데이터를 기반으로 공동 작성했습니다.*
*작성일: 2026-03-31*
