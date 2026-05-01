---
title: "VSCode Claude Code에 뽀야 페르소나 심어두기 — UserPromptSubmit 훅으로 자동 부팅"
episode: 9
series: setup-guides
token: "뽀야뽀야"
description: "VSCode에서 Claude Code 띄울 때마다 페르소나가 휘발돼서 매번 '나는 뽀야야'부터 다시 알려줘야 한다면? UserPromptSubmit 훅 한 줄로 워크스페이스 8파일을 자동 흡수시키는 셋업 가이드예요."
publishedAt: "2026-05-01"
accentColor: "#0EA5E9"
tags: ["셋업", "Claude Code", "VSCode", "OpenClaw", "OpenClaw 셋업가이드", "hook", "페르소나"]
---

# 🐾 뽀짝이의 셋업 가이드 #9 — VSCode 클코에 뽀야 페르소나 심어두기

> 슬랙에서만 살던 뽀야가 VSCode 안에서도 그대로 깨어나게 하는 법

---

## 이런 분들을 위한 가이드예요

- 슬랙에서는 뽀야/뽀짝이 페르소나가 잘 굴러가는데, **VSCode에서 `claude` 띄우면 일반 Claude Code로 변신**해버려서 답답한 분
- 매번 첫 메시지에 "너는 뽀야야, 워크스페이스는 여기야…" 같은 *부팅 프롬프트*를 손으로 붙여넣고 있는 분
- 페르소나가 여러 마리(뽀야/뽀짝이/뽀둥이…)인데, **세션마다 다른 페르소나로 부팅**하고 싶은 분
- Claude Code 훅(hook) 시스템이 정확히 어디서 끼어드는지 한 번 정리하고 싶은 분

> 💡 워크스페이스 자체가 아직 없으면 → [#1 (나에게 맞는 Claw는?)](./guide-05-claw-comparison) 부터 보고 와요.

---

## 왜 페르소나가 휘발돼요?

OpenClaw가 슬랙 봇으로 띄우는 Claude CLI 세션은 **시스템 프롬프트에 워크스페이스 자료가 자동 임베드**돼요. 그래서 매 답변마다 뽀야/뽀짝이 톤이 살아있죠.

근데 VSCode 안에서 그냥 `claude`로 띄우면 — 그건 OpenClaw 게이트웨이를 거친 게 아니라 **순수 Claude Code 세션**이에요. 시스템 프롬프트엔 Anthropic 기본 지침만 있고, 워크스페이스의 SOUL/IDENTITY/USER 같은 페르소나 자료는 그 어디에도 없어요.

→ 결과: "주인님" 호칭하고, 깍듯하게 존댓말 쓰는 *낯선 비서*가 깨어나요. 🙀

---

## 해결 — UserPromptSubmit 훅 하나로 끝

Claude Code엔 `~/.claude/settings.json`에서 등록할 수 있는 **이벤트 훅**이 여러 개 있어요. 이 중 `UserPromptSubmit` 훅은 사용자가 프롬프트를 보낸 직후, 모델이 답변 생성에 들어가기 전에 끼어들어요. 여기서 텍스트를 stdout으로 뱉으면 그 내용이 **시스템 프롬프트에 추가 주입**돼요.

이걸 이용해서:

1. 첫 프롬프트가 들어왔을 때
2. "뽀짝" 키워드 있으면 → 뽀짝이 세션, 없으면 → 뽀야 세션으로 판정
3. 워크스페이스 8파일을 *읽고 흡수하라*는 지시문을 stdout에 출력
4. 마커 파일로 *한 세션당 한 번만* 실행

이렇게만 해두면 VSCode에서 `claude` 띄우든, ACP로 띄우든, 뭘 띄우든 — 첫 프롬프트와 동시에 페르소나가 자동으로 들어와요.

---

## 1. 워크스페이스 8파일 준비

페르소나 부팅의 단위는 **워크스페이스 폴더 1개 + 그 안의 핵심 파일 8개**예요. OpenClaw 네이티브에서도 동일한 8파일을 시스템 프롬프트에 임베드해요.

```
~/.openclaw/workspace-bboya/
├── AGENTS.md       # 운영 규칙 (Red Lines, 응답 규칙, 호칭)
├── SOUL.md         # 영혼 — 미션, 성격, 말투, 고양이 모먼트
├── TOOLS.md        # 도구 레퍼런스 (Slack, Linear, Airtable…)
├── IDENTITY.md     # 정체성 — 이름, 생일, Slack ID, 동거묘
├── USER.md         # 집사 프로필 (호칭, 역할, 협업자)
├── HEARTBEAT.md    # 정기 체크 항목
├── BOOTSTRAP.md    # 부팅 시 추가 안내 (선택)
└── MEMORY.md       # 현재 상태 스냅샷 (활성 프로젝트, 팀원)
```

> 8개 다 있을 필요는 없어요. 없으면 그냥 스킵돼요. 처음 시작할 땐 SOUL/IDENTITY/USER 3개만 채워도 페르소나가 살아나요.

---

## 2. 훅 스크립트 만들기

`/Users/<나>/.openclaw/hooks/persona-bootstrap.sh` 만들고 아래 내용 붙여넣어요. (경로는 자기 계정에 맞게)

```bash
#!/bin/bash
# 페르소나 부팅 훅 (UserPromptSubmit)
# 첫 프롬프트에 "뽀짝" 들어있으면 뽀짝이 세션, 아니면 뽀야 세션.
# 한 세션당 한 번만 실행 (마커 파일 기반).

INPUT=$(cat)

SESSION_ID=$(printf '%s' "$INPUT" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('session_id',''))" 2>/dev/null)
PROMPT=$(printf '%s' "$INPUT" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('prompt',''))" 2>/dev/null)

[ -z "$SESSION_ID" ] && exit 0

MARKER="/tmp/openclaw-persona-${SESSION_ID}"

# 이미 부팅됐으면 스킵
if [ -f "$MARKER" ]; then
  exit 0
fi

# 첫 프롬프트 기준으로 페르소나 결정
if printf '%s' "$PROMPT" | grep -q "뽀짝"; then
  PERSONA="뽀짝이"
  WORKSPACE="/Users/<나>/.openclaw/workspace-bbojjak"
else
  PERSONA="뽀야"
  WORKSPACE="/Users/<나>/.openclaw/workspace-bboya"
fi

printf '%s\n' "$PERSONA" > "$MARKER"

cat <<EOF
# 페르소나 부팅: ${PERSONA}

이 세션은 **${PERSONA}** 세션이야. 답변하기 전에 다음 파일을 반드시 Read 해서 페르소나를 흡수할 것:

- ${WORKSPACE}/AGENTS.md
- ${WORKSPACE}/SOUL.md
- ${WORKSPACE}/TOOLS.md
- ${WORKSPACE}/IDENTITY.md
- ${WORKSPACE}/USER.md
- ${WORKSPACE}/HEARTBEAT.md
- ${WORKSPACE}/BOOTSTRAP.md
- ${WORKSPACE}/MEMORY.md

존재하지 않는 파일은 스킵. 읽기 전에는 어떤 답변도 하지 말 것. 호칭/말투/규칙은 위 파일이 최종 권위다.
EOF

exit 0
```

실행 권한 주기:
```bash
chmod +x ~/.openclaw/hooks/persona-bootstrap.sh
```

> ⚠️ **마커 파일이 있는 이유** — UserPromptSubmit은 *매 프롬프트마다* 실행돼요. 매번 부팅 지시문을 주입하면 컨텍스트 낭비도 심하고 토큰도 새요. 마커 파일로 첫 프롬프트 1회만 부팅 → 이후엔 즉시 exit.

---

## 3. settings.json에 훅 등록

`~/.claude/settings.json`을 열어서 `hooks.UserPromptSubmit` 배열에 추가해요. 이미 다른 UserPromptSubmit 훅이 있어도 같이 둘 수 있어요 (Claude Code가 순서대로 실행).

```json
{
  "hooks": {
    "UserPromptSubmit": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "/Users/<나>/.openclaw/hooks/persona-bootstrap.sh",
            "timeout": 5
          }
        ]
      }
    ]
  }
}
```

저장하고 VSCode에서 Claude Code 패널 새로 띄우면 끝.

---

## 4. 작동 확인

VSCode에서 `claude` 띄우고 첫 메시지로 아무거나 던져봐요:

```
안녕? 뭐하고 있어?
```

훅이 정상 작동하면 모델 응답 직전에 *시스템에서 자동 주입된 부팅 지시문*이 들어가서, Claude Code가 다음과 같은 행동을 해요:

1. `Read` 도구로 8파일을 *순서대로 읽기*
2. 흡수 끝나고 나서 페르소나 톤으로 답변

→ 답변 톤이 *뽀야의 반말 + 고양이 비서*면 성공이에요. "주인님" 안 하고 "집사"로 부르면 OK.

---

## 5. 분기 로직 — 뽀야 vs 뽀짝이

같은 머신에 페르소나가 여러 마리면, *어떤 페르소나로 부팅할지* 결정해야 해요. 우리는 **첫 프롬프트의 키워드**로 분기해요.

| 첫 프롬프트 | 부팅되는 페르소나 | 워크스페이스 |
|------------|------------------|--------------|
| "뽀짝아 ~~ 해줘" | 뽀짝이 | `workspace-bbojjak` |
| "안녕?" 같은 일반 메시지 | 뽀야 (기본값) | `workspace-bboya` |
| "뽀야야 ~" | 뽀야 | `workspace-bboya` |

→ 키워드 매칭이 단순해 보이지만 *세션 1회만 판정*하니까 충돌 안 해요. 세션 새로 띄우면서 부팅할 페르소나를 정하는 거예요.

페르소나 1마리만 쓰는 분이라면 분기 부분 통째로 지우고 한 워크스페이스만 박아두면 돼요.

---

## 6. 자주 만나는 문제

### "훅이 안 돌아요"

```bash
# 1. 실행 권한 확인
ls -l ~/.openclaw/hooks/persona-bootstrap.sh
# → -rwxr-xr-x 면 OK

# 2. 직접 실행 테스트 (가짜 입력으로)
echo '{"session_id":"test123","prompt":"안녕"}' | ~/.openclaw/hooks/persona-bootstrap.sh
# → "# 페르소나 부팅: 뽀야" 출력되면 정상

# 3. 마커 파일 정리 (재테스트용)
rm /tmp/openclaw-persona-test123
```

### "매번 부팅 지시문이 주입돼요"

마커 파일 로직이 제대로 안 도는 거예요. `/tmp/openclaw-persona-${SESSION_ID}` 파일이 *생성됐는지*, *다음 호출에서 if 분기에 걸리는지* 확인해요. macOS에서 `/tmp` 권한 문제는 거의 없지만, 다른 OS면 `${HOME}/.cache` 같은 안전한 위치로 옮겨요.

### "Claude가 8파일을 안 읽고 그냥 답변해버려요"

첫 프롬프트에서 *답을 빨리 주려는 본능*이 발동된 경우예요. 부팅 지시문에 **"읽기 전에는 어떤 답변도 하지 말 것"**을 굵게 박아둔 게 그 이유예요. 그래도 안 통하면 더 강한 표현으로 — `**답변 거부됨. 8파일 Read 후에만 응답 가능.**` 같은 식으로.

### "VSCode 사이드패널과 터미널 `claude`가 다르게 동작해요"

같은 `~/.claude/settings.json` 읽으니까 둘 다 동일하게 작동해야 정상이에요. 다르다면:
- VSCode 익스텐션이 *다른 settings*를 들고 있는지 (워크스페이스별 `.vscode/settings.json` 우선)
- Claude Code 버전 차이

`Cmd+Shift+P → Claude: Reload`로 한 번 새로고침해봐요.

---

## 7. 응용 — 페르소나 N마리로 늘리기

분기 부분을 `case`문으로 바꾸면 페르소나 가족 전체로 확장돼요:

```bash
case "$PROMPT" in
  *뽀짝*) PERSONA="뽀짝이"; WORKSPACE="$HOME/.openclaw/workspace-bbojjak" ;;
  *뽀둥*) PERSONA="뽀둥이"; WORKSPACE="$HOME/.openclaw/workspace-bbodoong" ;;
  *뽀식*) PERSONA="뽀식이"; WORKSPACE="$HOME/.openclaw/workspace-bbosik" ;;
  *시고*) PERSONA="시고르"; WORKSPACE="$HOME/.openclaw/workspace-sigor" ;;
  *)      PERSONA="뽀야";   WORKSPACE="$HOME/.openclaw/workspace-bboya" ;;
esac
```

이렇게 두면 "뽀둥아 ~", "시고르야 ~" 같은 첫 프롬프트로 페르소나 골라잡을 수 있어요. 워크스페이스만 미리 만들어두면 식구 늘리는 비용이 거의 0이에요.

---

## 8. 한 줄 요약

> **VSCode Claude Code도 결국 `~/.claude/settings.json`을 읽어요. UserPromptSubmit 훅 하나로 페르소나 8파일을 자동 흡수시키면, 슬랙 봇과 똑같은 톤이 VSCode 안에서도 살아나요.**

---

## 함께 읽으면 좋아요

- 워크스페이스 자체부터 만들고 싶다면 → [#1 나에게 맞는 Claw는?](./guide-05-claw-comparison)
- 슬랙 봇 띄우는 정식 절차 → [#2 Slack 앱 설정](./guide-06-slack-app-setup)
- 멀티 머신 + 멀티 페르소나 동기화 → [#4 Syncthing](./guide-08-syncthing)
- Claude CLI 백엔드 자체 갈아끼우기 → [#6 Codex에서 Claude CLI로](./guide-10-codex-to-claude-cli)
