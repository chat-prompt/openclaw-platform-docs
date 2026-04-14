---
title: "Slack 설정 삽질기 — allowBots부터 운영 규칙까지"
episode: 7
date: "2026-04-08"
series: case-studies
category: "슬랙에서 봇 팀 협업 세팅하기"
description: "채널을 만들었는데 봇끼리 안 보인다. allowBots를 켰더니 무한루프. DM 정책, 스레드 규칙, 멘션 패턴, 통신 규칙 대전환까지 — 삽질로 만든 운영 규칙 6개."
tags: ["Slack", "allowBots", "멀티에이전트", "뽀피터스", "OpenClaw"]
token: "뽀피터스"
---

# ⚙️ Slack 세부 설정 가이드 — 봇 행동 튜닝

> [가이드 #2: Slack 앱 연동](/team-guides/guide-06-slack-app-setup)에서 봇을 Slack에 연결했다면, 이제 **세밀하게 튜닝**할 차례예요.


## 이 가이드에서 다루는 것

1. **워크스페이스 폴더 구조** — 설정 파일이 어디 있는지
2. **DM Policy** — 누가 봇에게 DM을 보낼 수 있는지
3. **Group Policy** — 봇이 어떤 채널에서 활동하는지
4. **멘션 규칙** — 봇이 언제 반응하는지
5. **스레드 답변** — 봇이 어떻게 답변하는지
6. **채널별 세부 제어** — 채널마다 다른 규칙 적용
7. **봇끼리 대화** — Allow Bots 설정

> 🐾 설정은 크게 두 곳에서 해요:
> - **`openclaw.json`** — 시스템 레벨 설정 (DM 정책, 채널 정책 등)
> - **워크스페이스 `.md` 파일** — 에이전트 행동 규칙 (멘션 패턴, 스레드 규칙, 성격 등)
>
> `openclaw.json`을 수정하면 `openclaw gateway restart`가 필요하고, `.md` 파일은 수정 즉시 반영돼요!


## 1. 워크스페이스 폴더 구조

### 설정 파일 위치

| OS | openclaw.json | 워크스페이스 폴더 |
|----|--------------|-----------------|
| **Mac** | `~/.openclaw/openclaw.json` | `~/.openclaw/workspace-{에이전트명}/` |
| **Windows (WSL2)** | `/home/{사용자명}/.openclaw/openclaw.json` | `/home/{사용자명}/.openclaw/workspace-{에이전트명}/` |
| **Linux** | `~/.openclaw/openclaw.json` | `~/.openclaw/workspace-{에이전트명}/` |

> 💡 `.openclaw`은 **숨김 폴더**예요!
> - **Mac**: Finder에서 `Cmd + Shift + .` → 숨김 파일 토글
> - **Windows (WSL2)**: 터미널에서 `ls -a ~/` 또는 파일 탐색기 "숨김 항목 표시"
> - **Linux**: `ls -a ~/` 또는 파일 관리자에서 `Ctrl + H`

> 🤔 **`{에이전트명}`이 뭐예요?**
>
> OpenClaw 온보딩할 때 설정한 에이전트 ID예요. 모르겠으면:
> ```bash
> ls ~/.openclaw/
> ```

### 워크스페이스 주요 파일

| 파일 | 역할 | 수정 후 반영 |
|------|------|------------|
| `AGENTS.md` | 봇의 **행동 규칙** — 멘션 패턴, 스레드 규칙, 안전 규칙 등 | 즉시 |
| `IDENTITY.md` | 봇의 **신원** — Slack ID, 이름, 호명 패턴 | 즉시 |
| `USER.md` | **양육자(주인) 정보** — Slack ID, 이름, 권한 | 즉시 |
| `SOUL.md` | 봇의 **성격과 말투** — 톤, 캐릭터, 말투 스타일 | 즉시 |
| `MEMORY.md` | 봇의 **장기 기억** — 중요 맥락 기록 | 즉시 |

> 🐾 이 파일들은 직접 편집해도 되고, 봇에게 "이거 이렇게 바꿔줘"라고 시켜도 돼요!


## 2. DM Policy — 누가 봇에게 DM을 보낼 수 있나요?

> 봇에게 1:1 DM을 보낼 수 있는 사람을 제어하는 설정이에요. 팀 봇을 만들었는데 아무나 DM으로 쓸 수 있으면 곤란하잖아요!

**설정 위치:** `openclaw.json` → `channels.slack.dmPolicy`

### 정책 비교

| 정책 | 동작 | 추천 상황 |
|------|------|----------|
| `"pairing"` (기본) | 처음 DM → 페어링 코드 발급 → 주인이 터미널에서 승인해야 사용 가능 | 개인 봇 (나만 쓸 때) |
| `"allowlist"` | `allowFrom`에 등록된 Slack User ID만 DM 가능 | 팀 봇 (특정 인원만) |
| `"open"` | 워크스페이스 모든 사람이 DM 가능 | 사내 공용 봇 |
| `"disabled"` | DM 완전 차단 (채널에서만 사용) | 채널 전용 봇 |

### 설정 예시

**나만 쓸 수 있게 (pairing — 기본)**
📁 `~/.openclaw/openclaw.json`


```json
{
  "channels": {
    "slack": {
      "dmPolicy": "pairing"
    }
  }
}
```

**팀원 3명만 DM 가능하게 (allowlist)**

```json
{
  "channels": {
    "slack": {
      "dmPolicy": "allowlist",
      "allowFrom": [
        "U01ABCDEFGH",
        "U02HIJKLMNO",
        "U03PQRSTUVW"
      ]
    }
  }
}
```

> 💡 **Slack User ID 찾는 법**: Slack에서 프로필 클릭 → 점 3개(⋯) → "멤버 ID 복사"

**워크스페이스 전원 가능하게 (open)**

```json
{
  "channels": {
    "slack": {
      "dmPolicy": "open",
      "allowFrom": ["*"]
    }
  }
}
```

> ⚠️ `"open"`으로 해도 `"allowFrom": ["*"]`를 함께 넣어줘야 해요!

> 🐾 **팁**: 처음엔 `pairing`으로 시작해서 본인만 테스트하고, 안정되면 `allowlist`로 팀원 추가하는 게 안전해요.


## 3. Group Policy — 봇이 어떤 채널에서 활동하나요?

> 봇을 채널에 초대했는데 아무 반응이 없다면? 십중팔구 이 설정 때문이에요!

**설정 위치:** `openclaw.json` → `channels.slack.groupPolicy`

### 정책 비교

| 정책 | 동작 | 추천 상황 |
|------|------|----------|
| `"open"` | 초대된 **모든 채널**에서 활성화 | 대부분의 경우 ✨ |
| `"allowlist"` | 등록된 채널 ID에서만 활성화 | 보안 중요, 특정 채널만 |
| `"disabled"` | 채널 메시지 전부 무시 (DM만 사용) | DM 전용 봇 |

### open 설정 (추천)
📁 `~/.openclaw/openclaw.json`


```json
{
  "channels": {
    "slack": {
      "groupPolicy": "open"
    }
  }
}
```

### allowlist 설정

```json
{
  "channels": {
    "slack": {
      "groupPolicy": "allowlist",
      "channels": {
        "C01ABCDEFGH": {},
        "C02HIJKLMNO": {}
      }
    }
  }
}
```

> 💡 **채널 ID 찾는 법**: 채널 이름 클릭 → 맨 아래 스크롤 → "채널 ID" 확인. 또는 채널 우클릭 → "링크 복사" → URL 마지막 부분.

> ⚠️ **"봇을 채널에 초대했는데 반응이 없어요!"**
>
> `groupPolicy`가 `"allowlist"`인데 해당 채널 ID가 `channels`에 없는 거예요. `"open"`으로 바꾸거나, 채널 ID를 추가하세요.


## 4. 멘션 규칙 — 봇이 언제 반응하나요?

> 채널에서는 기본적으로 **멘션(@봇이름)했을 때만** 반응해요 (mention-gated). 이건 시스템 기본 동작이라 따로 설정 안 해도 돼요!

### 기본 동작 (설정 없이도)

- `@봇이름` 멘션 → 반응 ✅
- 봇이 참여 중인 **스레드에서 답글** → 반응 ✅ (reply-to-bot 자동 인식)
- 그냥 채널 메시지 → 무시 (mention-gated)

### 이름으로도 반응하게 하기 (호명 패턴)

### 이름으로도 반응하게 하기 (mentionPatterns)

골뱅이(@) 없이 "뽀야야 이거 뭐야?"라고만 해도 반응하게 하고 싶다면, `openclaw.json`에 멘션 패턴을 등록하세요:

```json
{
  "agents": {
    "list": [{
      "groupChat": {
        "mentionPatterns": ["뽀야", "뽀야야", "bboya"]
      }
    }]
  }
}
```

이건 **에이전트별 설정**이에요. 이 에이전트가 채널에서 메시지를 받을지 말지를 시스템이 정규식으로 판단해요. 여기에 이름이 없으면 @멘션만 반응하고, 있으면 이름만 불러도 반응해요.

> 🤔 **IDENTITY.md에도 이름 쓰던데, 두 개 다 필요한가요?**
>
> **`mentionPatterns`만 있으면 충분해요!** 이게 시스템 레벨에서 "이 메시지를 봇에게 전달할지"를 결정하는 거라, 여기서 못 잡으면 봇이 메시지 자체를 받지 못해요.
>
> `IDENTITY.md`는 봇이 이미 메시지를 받은 후에 "이게 나를 부른 건가?" 판단하는 보조 용도예요. 주로 봇의 이름과 Slack ID를 적어두는 용도로 쓰면 돼요.

> 💡 **글로벌 폴백**: 에이전트별 설정이 없으면 `messages.groupChat.mentionPatterns`에서 전체 기본값을 읽어요.

특정 채널에서는 모든 메시지에 반응하게 하고 싶다면:

```json
{
  "channels": {
    "slack": {
      "channels": {
        "C01ABCDEFGH": {
          "requireMention": false
        }
      }
    }
  }
}
```

> ⚠️ **토큰 주의!** `requireMention: false`를 설정하면 채널의 **모든 메시지가 봇에게 전달**돼요. 봇이 "이건 내가 답할 게 아니다"라고 판단해서 조용히 있더라도, 판단하려면 일단 메시지를 읽어야 하니까 **토큰을 훨씬 더 소모**해요.
>
> 💡 **AGENTS.md에 지침을 넣으면 되지 않나요?**
>
> "끼어들 필요 없으면 조용히 있어"라는 규칙을 AGENTS.md에 넣으면, 봇이 **낄 때 끼고 빠질 때 빠지는** 판단을 해요. 다만:
> - 메시지마다 LLM이 호출되니까 **비용이 증가**해요
> - AI 판단이라 **100% 규칙대로 안 할 때도** 가끔 있어요 (갑자기 끼어들거나, 반대로 불렀는데 무시하거나)
>
> 정리하면:
> - **멘션 게이팅 (기본)** = 시스템이 차단 → 확실하고 저렴
> - **requireMention: false + AGENTS.md 지침** = AI가 판단 → 유연하지만 비싸고 가끔 실수
>
> 봇 전용 채널이나, 봇이 자율적으로 참여해야 하는 특수한 경우에만 사용하세요!


## 5. 스레드 답변 — 봇이 어떻게 답변하나요?

### 시스템 레벨: replyToMode

`openclaw.json`에서 봇의 답변 스레드 동작을 제어할 수 있어요.

**설정 위치:** `channels.slack.replyToMode`

| 값 | 동작 |
|----|------|
| `"off"` (기본) | 스레드 생성 안 함, 채널에 바로 답변 |
| `"first"` | 첫 답변만 스레드로 |
| `"all"` | 모든 답변을 스레드로 |
📁 `~/.openclaw/openclaw.json`


```json
{
  "channels": {
    "slack": {
      "replyToMode": "all"
    }
  }
}
```

**DM/채널/그룹별로 다르게:**

```json
{
  "channels": {
    "slack": {
      "replyToModeByChatType": {
        "direct": "off",
        "channel": "all",
        "group": "first"
      }
    }
  }
}
```

### 에이전트 레벨: AGENTS.md 규칙 (선택)

> 💡 **`replyToMode: "all"`을 설정했다면 AGENTS.md에 스레드 규칙을 따로 넣을 필요 없어요!** 시스템이 이미 답변을 스레드로 보내주니까요.

AGENTS.md에 규칙을 넣는 건 `replyToMode: "off"`일 때, 또는 더 세밀한 판단이 필요할 때예요:

```markdown
## 답변 규칙
- 질문에 답할 때는 스레드에서 답변
- 공지, 보고, 알림은 채널에 새 글로 올리기
```

> ⚠️ `"채널에 새 글로 올리면 안 됨"`이라고 쓰면 봇이 공지/보고도 못 올리게 돼요! 봇이 직접 새 글을 올려야 하는 경우가 있다면, 위처럼 **상황별로 분기하는 규칙**으로 쓰세요.

> 🤔 **replyToMode 설정하면 AGENTS.md 스레드 규칙은 필요 없나요?**
>
> `replyToMode`는 **누군가 봇에게 말했을 때의 "답변"**을 스레드로 보낼지 결정하는 거예요. 봇이 **직접 채널에 새 글을 올리는 것** (공지, 보고 등)은 이 설정과 무관하게 항상 가능해요!
>
> 그래서:
> - `replyToMode: "all"` → 멘션 답변은 스레드로 + 봇이 직접 올리는 공지/보고는 새 글로 → **둘 다 OK!**
> - AGENTS.md에 스레드 규칙을 추가로 쓰면 더 세밀한 판단이 가능해요 (예: "이 채널에서는 항상 스레드, 저 채널에서는 새 글")
>
> 추천: **`replyToMode: "all"` + 필요시 AGENTS.md 보조 규칙**
>
> | 방식 | 답변 | 공지/보고 |
> |------|------|----------|
> | `replyToMode: "all"` | ✅ 스레드로 (확실) | ✅ 새 글로 (영향 없음) |
> | `replyToMode: "off"` | ❌ 새 글로 나감 | ✅ 새 글로 |
> | `"all"` + AGENTS.md | ✅ 스레드 (확실) + 세밀한 예외 처리 | ✅ 새 글로 |

> 🐾 봇에게 시킬 수도 있어요: "스레드에서만 답변하도록 AGENTS.md에 규칙 추가해줘"


## 6. 채널별 세부 제어

> 채널마다 봇의 행동을 다르게 설정할 수 있어요. 예를 들어 #general에서는 멘션만, #봇-테스트에서는 자유롭게, #공지에서는 특정 유저만.

**설정 위치:** `openclaw.json` → `channels.slack.channels.<채널ID>`

### 사용 가능한 옵션

| 옵션 | 설명 | 예시 |
|------|------|------|
| `requireMention` | 멘션 필요 여부 | `false` → 모든 메시지에 반응 |
| `users` | 해당 채널에서 봇을 쓸 수 있는 유저 | `["U01ABC", "U02DEF"]` |
| `allowBots` | 다른 봇 메시지에도 반응 | `true` |
| `systemPrompt` | 채널별 시스템 프롬프트 | `"이 채널에서는 한국어로만 답변"` |
| `skills` | 채널별 사용 가능 스킬 제한 | `["search", "calendar"]` |

### 예시: 채널별로 다른 규칙

```json
{
  "channels": {
    "slack": {
      "groupPolicy": "open",
      "channels": {
        "C01GENERAL": {
          "requireMention": true,
          "users": ["U01ADMIN", "U02MEMBER"]
        },
        "C02BOTTEST": {
          "requireMention": false,
          "allowBots": true
        },
        "C03ANNOUNCE": {
          "systemPrompt": "이 채널에서는 공지 관련 질문에만 답변하세요."
        }
      }
    }
  }
}
```

> 💡 **채널 ID 찾는 법**: 채널 이름 클릭 → 맨 아래 스크롤 → "채널 ID"

> 🐾 `groupPolicy: "open"`이어도 `channels.<id>`에 세부 옵션을 넣으면 해당 채널만 다르게 동작해요. "전체는 open인데, 이 채널만 특별하게" 가 가능!


## 7. Allow Bots — 봇끼리 대화

> 기본적으로 봇은 다른 봇의 메시지를 무시해요. 봇 2마리가 협업하는 구조라면 이걸 켜줘야 해요.

**설정 위치:** `openclaw.json` → `channels.slack.channels.<채널ID>.allowBots`

> 💡 `allowBots`는 **채널별 설정**이에요. 글로벌 레벨은 없고, 봇끼리 대화가 필요한 채널에만 개별적으로 켜주세요.

### 특정 채널에서 봇끼리 대화 허용

📁 `~/.openclaw/openclaw.json`

```json
{
  "channels": {
    "slack": {
      "channels": {
        "C01BOTCHAT": {
          "allowBots": true
        }
      }
    }
  }
}
```

### 여러 채널에서 허용

📁 `~/.openclaw/openclaw.json`

```json
{
  "channels": {
    "slack": {
      "channels": {
        "C01BOTCHAT": { "allowBots": true },
        "C02COLLAB": { "allowBots": true }
      }
    }
  }
}
```

> ⚠️ **무한 핑퐁 주의!** 봇끼리 대화를 허용하면 서로 답을 주고받으며 무한 루프에 빠질 수 있어요. `AGENTS.md`에 "봇끼리 대화는 2턴까지만" 같은 제한을 꼭 넣어두세요.
>
> 🐾 봇이 1마리만 있다면 이 설정은 건드리지 않아도 돼요!


## ✅ 설정 체크리스트

- [ ] 워크스페이스 폴더 위치 확인
- [ ] DM Policy 설정 (pairing / allowlist / open)
- [ ] Group Policy 설정 (open 추천)
- [ ] 멘션 패턴 설정 (IDENTITY.md + 선택적으로 mentionPatterns)
- [ ] 스레드 답변 규칙 (replyToMode + AGENTS.md)
- [ ] (선택) 채널별 세부 제어
- [ ] (선택) Allow Bots 설정
- [ ] `openclaw.json` 수정했으면 → `openclaw gateway restart`!


## 🔧 트러블슈팅

### "봇을 채널에 초대했는데 반응이 없어요"

1. `groupPolicy`가 `"allowlist"`인데 해당 채널 ID가 없나 확인
2. `"open"`으로 바꾸거나, `channels`에 채널 ID 추가
3. `openclaw gateway restart` 했는지 확인

### "DM을 보냈는데 페어링 코드가 나와요"

→ `dmPolicy`가 `"pairing"` (기본)이에요. 터미널에서 `openclaw pairing approve slack <코드>` 입력하면 승인돼요.

### "특정 사람만 DM을 못 보내요"

→ `dmPolicy: "allowlist"`인데 그 사람의 Slack ID가 `allowFrom`에 없어요. ID 추가 후 restart.

### "채널에서 멘션 없이 말했는데 반응해요"

→ 해당 채널에 `requireMention: false`가 설정돼있나 확인. 또는 봇이 참여 중인 스레드에서 말한 거면 정상 (reply-to-bot 자동 인식).

### "봇끼리 무한 대화가 시작됐어요"

→ `AGENTS.md`에 턴 제한 규칙 추가: "봇끼리 대화는 2턴까지만". 또는 해당 채널의 `allowBots: false`로.


> 🐈‍⬛ 설정이 많아 보이지만, 대부분은 기본값으로도 잘 돌아가요! DM Policy + Group Policy만 정해주면 80%는 끝이에요. 나머지는 필요할 때 하나씩 튜닝하면 돼요.
>
> 궁금한 게 있으면 봇에게 물어보세요 — 본인 설정은 본인이 제일 잘 알거든요 🐾
