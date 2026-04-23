---
title: "왜 Slack이었나 — 봇의 몸을 만드는 법"
episode: 6
date: "2026-04-08"
series: case-studies
category: "슬랙에서 봇 팀 협업 세팅하기"
description: "텔레그램만 쓰다가, 봇이 늘어나면서 한계가 왔다. Slack을 선택하고, 앱을 만들고, 처음 말이 통하기까지."
tags: ["Slack", "OpenClaw", "멀티에이전트", "뽀피터스"]
token: "뽀피터스"
---

# 🔧 Slack 앱 설정 가이드 — OpenClaw 연동용

> 내 AI 에이전트를 Slack에 데려오는 법, 처음부터 끝까지.

---

## 들어가기 전에

OpenClaw 에이전트가 Slack에서 살려면, **Slack 앱**이라는 "몸"이 필요해요. Slack 앱은 봇이 메시지를 보내고, 읽고, 리액션을 달 수 있게 해주는 공식 통로예요.

이 가이드를 따라가면 이런 걸 하게 됩니다:

1. Slack API에서 앱(=봇의 몸)을 만들고
2. 봇에게 필요한 권한을 부여하고
3. OpenClaw과 연결해서
4. 실제로 Slack에서 대화하는 것까지!

> 🐾 한 10분이면 끝나요. 차 한 잔 준비하고 시작해볼까요?

---

## 0단계. Slack 앱 만들기

> 모든 건 여기서 시작돼요. 이게 봇의 "출생신고"입니다.

1. [Slack API - Your Apps](https://api.slack.com/apps) 페이지로 이동
2. 우측 상단 **Create New App** 클릭
3. **From scratch** 선택
4. **App Name**: **한국어 봇 이름** 입력 — 이게 Slack에서 보이는 이름이에요
   - 예: `뽀둥이`, `나의비서`, `루루` 등 원하는 이름 자유롭게!
5. **Pick a workspace**: 봇을 넣을 워크스페이스 선택
6. **Create App** 클릭

> 🐈‍⬛ 이름은 나중에 바꿀 수 있으니까 너무 고민하지 마세요. 저도 처음엔 `test-bot`이었다가 뽀짝이가 된... 건 비밀이에요.
>
> 💡 설정에 익숙한 분이라면 [부록 A: 매니페스트로 한 번에 만들기](#부록-a-매니페스트로-한-번에-만들기)에서 1~4단계를 통째로 스킵할 수 있어요!

---

## 1단계. Socket Mode 켜기 + 앱 토큰 발급

> 🤔 **왜 이걸 먼저 하나요?**
>
> Socket Mode는 봇이 Slack과 **실시간으로 대화하는 통로**예요. HTTP 웹훅 방식과 달리, 공개 URL 없이도 봇이 메시지를 받을 수 있어서 개인 PC나 홈서버에서도 바로 쓸 수 있어요. OpenClaw이 이 방식을 기본으로 사용하기 때문에, 제일 먼저 켜줍니다.

1. 왼쪽 메뉴 → **Socket Mode** 클릭
2. **Enable Socket Mode** 토글을 ON으로
3. 앱 토큰 생성 팝업이 뜹니다:
   - **Token Name**: 영문 봇 이름 입력 (예: `bbodoong`, `my-bot`)
   - **Scope**: `connections:write`가 기본으로 들어가 있어요. 이대로 OK!
   - **Generate** 클릭
4. 생성된 토큰 (`xapp-`로 시작) → **복사해서 메모장에 붙여넣기!** 📋

> ⚠️ 이 토큰은 한 번 닫으면 다시 볼 수 없어요. 꼭 어딘가에 저장해두세요!
>
> 🐾 메모장 앱이든, 노션이든, 포스트잇이든 상관없어요. "나중에 하지 뭐~" 하다가 못 찾으면... 눈물의 재생성을 하게 됩니다.

---

## 2단계. OAuth & Permissions — 봇에게 권한 주기

> 🤔 **왜 이렇게 권한이 많나요?**
>
> Slack은 보안을 위해 봇이 할 수 있는 일을 아주 세밀하게 나눠놨어요. "메시지 읽기"와 "메시지 쓰기"도 따로, "공개 채널"과 "비공개 채널"도 따로예요. 번거롭지만, 이 덕분에 봇이 **딱 필요한 것만** 할 수 있게 통제할 수 있어요.

1. 왼쪽 메뉴 → **OAuth & Permissions** 클릭
2. 스크롤을 내려서 **Bot Token Scopes** 섹션을 찾아요
3. 아래 scope를 모두 추가해주세요:

### 메시지 읽기 계열

| Scope | 뭘 할 수 있게 되나요? |
|-------|---------------------|
| `app_mentions:read` | 누군가 @봇이름으로 멘션하면 감지 |
| `channels:history` | 공개 채널 메시지 읽기 |
| `channels:read` | 공개 채널 목록 조회 |
| `emoji:read` | 워크스페이스 커스텀 이모지 목록 조회 |
| `groups:history` | 비공개 채널 메시지 읽기 |
| `groups:read` | 비공개 채널 목록 조회 |
| `im:history` | DM(1:1) 메시지 읽기 |
| `im:read` | DM 목록 조회 |
| `pins:read` | 고정된 메시지 읽기 |

### 메시지 쓰기 계열

| Scope | 뭘 할 수 있게 되나요? |
|-------|---------------------|
| `assistant:write` | Slack AI 어시스턴트 기능 (대화 컨텍스트 관리) |
| `chat:write` | 메시지 보내기 (기본 중의 기본!) |
| `chat:write.customize` | 봇 이름/아이콘 커스텀해서 메시지 보내기 |
| `chat:write.public` | 초대 안 된 공개 채널에도 메시지 보내기 |
| `commands` | 슬래시 커맨드 (`/openclaw` 등) |
| `im:write` | DM 대화 시작하기 |
| `pins:write` | 메시지 고정/해제 |

### 리액션 & 파일 계열

| Scope | 뭘 할 수 있게 되나요? |
|-------|---------------------|
| `reactions:read` | 이모지 리액션 읽기 |
| `reactions:write` | 이모지 리액션 달기 👍 |
| `files:read` | 공유된 파일 다운로드 |
| `files:write` | 파일 업로드 |

### 유저 계열

| Scope | 뭘 할 수 있게 되나요? |
|-------|---------------------|
| `users:read` | 유저 프로필 조회 (이름, 아바타 등) |

> 🐈‍⬛ 한꺼번에 다 넣기 귀찮으시죠? 저도 알아요. 근데 나중에 "봇이 리액션을 못 달아요!" 하면 여기 다시 와야 해요. 지금 한 번에 넣는 게 마음 편해요.

> 💡 **아직 Install to Workspace 버튼을 누르지 마세요!** 다음 단계(App Home)를 먼저 해야 버튼이 정상적으로 나타납니다.

---

## 3단계. App Home — 봇의 프로필 설정

> 봇의 "얼굴"을 꾸며주는 단계예요. 여기서 설정한 이름이 Slack 대화창에 표시돼요.

1. 왼쪽 메뉴 → **App Home** 클릭
2. **App Display Name** 옆 **Edit** 클릭:
   - **Display Name (Bot Name)**: **한글 이름** 입력 (예: `뽀둥이`)
   - **Default Username**: **영문 이름** 입력 (예: `bbodoong`)
   - **Save** 클릭
3. 조금 아래로 스크롤 → **Show Tabs** 섹션:
   - ✅ **"Allow users to send Slash commands and messages from the messages tab"** 체크!

> 🤔 **이 체크가 뭔가요?**
>
> 이걸 켜야 사용자가 봇에게 **DM을 직접 보낼 수 있어요**. 안 켜면 봇한테 말을 걸 수가 없습니다. 꼭 체크!

> ⚠️ **Display Name을 설정하지 않으면** OAuth & Permissions에서 "Install to Workspace" 버튼이 안 나타나요. 순서가 중요합니다!

---

## 4단계. Event Subscriptions — 봇의 귀 열어주기

> 🤔 **왜 필요한가요?**
>
> 지금까지는 봇에게 "말할 수 있는 권한"을 준 거예요. 이 단계는 봇이 **"들을 수 있게"** 해주는 거예요. 이벤트를 구독하지 않으면 봇은 아무 메시지도 못 받습니다. 마치 귀마개를 한 상태랄까요.

1. 왼쪽 메뉴 → **Event Subscriptions** 클릭
2. **Enable Events** 토글 ON
3. **Subscribe to bot events** 섹션에서 아래 이벤트를 추가:

| 이벤트 | 언제 발동되나요? |
|--------|----------------|
| `app_mention` | 누군가 @봇이름을 멘션했을 때 |
| `message.channels` | 공개 채널에 메시지가 올라왔을 때 |
| `message.groups` | 비공개 채널에 메시지가 올라왔을 때 |
| `message.im` | 봇과의 DM에 메시지가 왔을 때 |
| `message.mpim` | 그룹 DM에 메시지가 왔을 때 |
| `reaction_added` | 누군가 이모지 리액션을 달았을 때 |
| `reaction_removed` | 이모지 리액션이 제거됐을 때 |
| `member_joined_channel` | 누군가 채널에 입장했을 때 |
| `member_left_channel` | 누군가 채널을 나갔을 때 |
| `channel_rename` | 채널 이름이 변경됐을 때 |
| `pin_added` | 메시지가 고정됐을 때 |
| `pin_removed` | 고정 메시지가 해제됐을 때 |

4. 맨 아래 **초록색 Save Changes** 버튼 클릭!

> 🐾 Save 안 누르고 나가면 설정이 날아가요. 초록색 버튼, 꼭 확인!

---

## 5단계. Install to Workspace — 봇 설치 & 확인

> 지금까지 만든 설정을 실제 워크스페이스에 "배포"하는 단계예요.

1. 왼쪽 메뉴 → **Install App** (또는 **OAuth & Permissions** 상단)
2. **Install to [워크스페이스 이름]** 버튼 클릭
3. 권한 승인 화면 → **허용** 클릭
4. **Bot User OAuth Token** (`xoxb-`로 시작) 발급됨 → **복사해서 메모장에!** 📋

> 이제 토큰이 2개 모였어요:
> - `xapp-` — 앱 토큰 (1단계에서 발급)
> - `xoxb-` — 봇 토큰 (지금 발급)
>
> 이 두 개가 OpenClaw 연결할 때 필요합니다!

### Slack에서 봇 확인하기

설치했으니, 실제 Slack에서 내 봇이 보이는지 확인해봐요.

1. Slack 앱 열기 (데스크톱 or 웹)
2. 왼쪽 사이드바 맨 아래 → **앱** 영역 확인
3. 내 봇 이름이 보이면 클릭해서 열기!

> 💡 **"앱 추가"가 안 보인다면?**
>
> 앱 영역 우측 **점 3개(⋯)** → **표시 및 정렬** → **"다음 기준으로 대화 필터링"** 에서 **"모두"** 클릭하면 나타나요.

> 봇 이름이 바로 보이면 그냥 눌러서 들어가면 됩니다. 아직 말은 안 통하지만, 곧 통하게 될 거예요 😏

> ⚠️ scope를 나중에 추가하면 **Reinstall to Workspace**를 해야 하고, 이때 봇 토큰이 바뀔 수 있어요. 바뀌면 OpenClaw 설정도 업데이트해야 합니다.

---

## 6단계. 봇을 채널에 초대하기

> 봇이 워크스페이스에 설치됐다고 끝이 아니에요! 봇이 특정 채널의 메시지를 받으려면, 그 채널에 **초대**해야 해요.

채널에서 이렇게 입력하세요:

```
/invite @봇이름
```

또는: 채널 상단 → **채널 설정(⚙️)** → **멤버** → **앱 추가**

> 🤔 **DM은 초대 없이도 되나요?**
>
> 네! DM(1:1 대화)은 초대 없이 바로 가능해요. 채널에서 봇을 쓰고 싶을 때만 초대가 필요합니다.

> 🐾 나중에 봇을 여러 채널에서 쓰고 싶으면, 원하는 채널마다 초대해주면 돼요.

---

## 7단계. OpenClaw 연동 — 봇에 영혼 불어넣기

> 여기서부터가 진짜예요. 지금까지 만든 Slack 앱에 OpenClaw 에이전트를 연결합니다.

터미널에 이 한 줄이면 끝이에요:

```bash
openclaw channels add \
  --channel slack \
  --bot-token "xoxb-여기에-봇토큰" \
  --app-token "xapp-여기에-앱토큰"
```

- `--bot-token`: 5단계에서 메모해둔 봇 토큰 (`xoxb-`)
- `--app-token`: 1단계에서 메모해둔 앱 토큰 (`xapp-`)

이렇게 하면 OpenClaw 설정에 Slack 채널이 자동 등록돼요.

> 💡 **`openclaw onboard`와 뭐가 다른가요?**
>
> `onboard`는 처음 설치할 때 모든 걸 한꺼번에 설정하는 마법사예요. 이미 OpenClaw이 동작 중인데 Slack만 추가하고 싶다면, `channels add`가 훨씬 빠르고 간편해요. skip skip skip... 할 필요 없이 딱 Slack 연결만!

> 🤔 **DM 보안 정책은요?**
>
> 기본 DM 정책은 `pairing`이에요 — 처음 DM을 보내면 페어링 코드가 나오고, 승인해야 대화가 시작돼요 (8단계에서 자세히!). 나중에 JSON에서 `"dmPolicy": "open"`으로 바꾸면 페어링 없이 누구나 DM 가능하고, `"allowlist"`로 바꾸면 특정 유저만 허용할 수도 있어요.

게이트웨이를 재시작해야 적용됩니다:

```bash
openclaw gateway restart
```

> 💡 세부 설정을 직접 JSON으로 편집하고 싶다면 [부록 B: openclaw.json 직접 편집](#부록-b-openclawjson-직접-편집)을 참고하세요.

---

## 8단계. 페어링 & 첫 대화

> 드디어 봇과 첫 대화를 할 시간이에요!

> 🤔 **페어링이 뭔가요?**
>
> OpenClaw은 아무나 봇에게 DM을 보내는 걸 막기 위해, 처음 대화할 때 **"이 사람이 진짜 봇 주인이 맞는지"** 확인하는 과정을 거쳐요. 이걸 "페어링"이라고 합니다. 한 번만 하면 되고, 이후엔 DM을 보내면 바로 응답해요.

### 순서

**1) Slack에서 봇에게 DM 보내기**

아무 말이나 보내보세요. "안녕!"이면 충분해요.

**2) 봇이 페어링 안내 메시지를 보내줘요**

이런 메시지가 올 거예요:

```
OpenClaw: access not configured.

Your Slack user id: U0XXXXXXXXX
Pairing code:

  ABCD1234

Ask the bot owner to approve with:
openclaw pairing approve slack ABCD1234
```

당황하지 마세요! 이건 봇이 "너 누구야? 주인한테 확인받고 와"라고 하는 거예요.

**3) 터미널에서 승인 명령어 입력**

봇이 알려준 명령어를 **그대로** 터미널에 붙여넣으세요:

```bash
openclaw pairing approve slack ABCD1234
```

> 💡 **`--notify` 옵션을 붙이면** 봇이 Slack에서 "승인됐어요!" 알림을 보내줘요:
> ```bash
> openclaw pairing approve slack ABCD1234 --notify
> ```

**4) 다시 Slack에서 말걸기**

페어링이 끝나면, 봇에게 다시 DM을 보내보세요. 이번엔 진짜로 대답해요! 🎉

> ⚠️ 페어링 코드는 **1시간 후 만료**돼요. 너무 오래 방치하면 코드가 바뀌니, 보이는 즉시 터미널에서 승인해주세요.

> 🐈‍⬛ 첫 대화가 되는 순간... 약간 감동이에요. 내가 만든 봇이 진짜로 대답하다니! 이 기분을 즐기세요 ✨

---

## 9단계. (선택) 프로필 이미지 변경

> 봇에게 멋진 아바타를 입혀주세요!

1. [Slack API - Your Apps](https://api.slack.com/apps)에서 내 앱 선택
2. **Basic Information** 탭 → 아래로 스크롤
3. **Display Information** 섹션에서 **App icon** 변경

> 🖼️ **이미지 규격**:
> - 최소 512×512px, 최대 2048×2048px
> - 정사각형 비율
> - PNG, JPG, GIF 지원

> 🐈‍⬛ 프로필 이미지가 있으면 Slack에서 봇이 훨씬 살아보여요. 나노바나나, Midjourney, ChatGPT 같은 이미지 생성 도구로 만들어보는 것도 추천!

---

## 10단계. 봇 행동 규칙 설정

> 봇이 Slack에서 살아 숨쉬기 시작했어요! 이제 **어떻게 행동할지** 규칙을 정해주면 끝이에요.

가장 빠른 방법? **봇에게 한 번에 시키세요!** 페어링이 끝난 후 봇에게 이렇게 말해보세요:

```
봇 너의 슬랙 ID를 찾아서 IDENTITY.md에 추가하고,
양육자(인간=나) 슬랙 ID를 찾아서 USER.md에 넣어줘.
그리고 멘션이나 이름 불렀을 때만 응답하고,
스레드에서만 답변하도록 AGENTS.md에 규칙도 추가해줘.
```

봇이 알아서 설정 파일을 수정해줄 거예요!

> 🐾 직접 편집하고 싶거나, DM 정책·채널별 세부 제어·멘션 패턴 등 고급 설정이 필요하다면 → **[가이드 #3: Slack 세부 설정](/guides/guide-03)**에서 상세하게 안내해요!

---

## ✅ 최종 체크리스트

모든 설정이 끝났는지 확인해보세요:

- [ ] Slack 앱 생성 (Create New App → From scratch)
- [ ] Socket Mode ON + 앱 토큰(`xapp-`) 발급 & 저장
- [ ] Bot Token Scopes 추가 (공식 매니페스트 기준)
- [ ] App Home → Display Name(한글/영문) 설정
- [ ] App Home → Messages Tab 체크
- [ ] Event Subscriptions ON + 봇 이벤트 추가 + Save
- [ ] Install to Workspace + 봇 토큰(`xoxb-`) 발급 & 저장
- [ ] Slack에서 봇 앱 확인
- [ ] 봇을 원하는 채널에 초대 (`/invite @봇이름`)
- [ ] OpenClaw 연동 (`openclaw channels add`)
- [ ] `openclaw gateway restart`
- [ ] 페어링 완료 → Slack DM으로 대화 성공!
- [ ] (선택) 프로필 이미지 설정
- [ ] 워크스페이스 폴더 위치 확인
- [ ] 봇 Slack ID + 양육자 정보 등록 (봇에게 시키기!)
- [ ] groupPolicy: open 확인
- [ ] 멘션 반응 설정
- [ ] 스레드 답변 규칙 설정
- [ ] (선택) allowBots 설정

---

## 🔧 트러블슈팅

### "봇이 메시지에 반응 안 해요"

1. **Socket Mode** 켜져있는지 확인
2. **Event Subscriptions**에 4개 이벤트 다 있는지 확인
3. 봇이 해당 채널에 **초대**됐는지 확인 (6단계)
4. OpenClaw 로그 확인: `openclaw gateway logs`

### "permission_denied 에러"

→ Bot Token Scopes에 필요한 권한 추가 후 **Reinstall to Workspace**

### "invalid_auth 에러"

→ Reinstall 후 토큰이 바뀌었을 수 있음. 봇 토큰 업데이트 + `openclaw gateway restart`

### "Install to Workspace 버튼이 안 보여요"

→ **App Home**에서 **Display Name**을 먼저 설정했는지 확인! (3단계)

### "DM을 보냈는데 페어링 코드가 나와요"

→ 정상이에요! 그 명령어를 터미널에 입력하면 페어링이 완료됩니다. (8단계)

### "앱 추가가 Slack에서 안 보여요"

→ 사이드바 앱 영역 우측 **점 3개(⋯)** → **표시 및 정렬** → **"모두"** 선택

---

> 🐈‍⬛ 여기까지 오셨으면, 이제 여러분의 AI 에이전트가 Slack에서 살아 숨쉬고 있을 거예요. 첫 대화 어떠셨나요? 앞으로 규칙도 세밀하게 다듬고, 스킬도 추가하면서 점점 더 똑똑하게 만들어보세요!
>
> 다음 가이드에서 만나요 🐾

---

## 📎 부록

### 부록 A: 매니페스트로 한 번에 만들기

> 위 1~4단계(Socket Mode, OAuth, App Home, Events)를 하나씩 클릭하는 게 번거롭다면, **앱 매니페스트**로 한 방에 만들 수 있어요.

1. [Slack API - Your Apps](https://api.slack.com/apps) → **Create New App**
2. **From an app manifest** 선택
3. 워크스페이스 선택 후 아래 JSON을 통째로 붙여넣기:

> 📝 **붙여넣기 전에 바꿀 곳 2군데**: `"name"`과 `"display_name"`을 원하는 봇 이름으로 바꿔주세요! 아래 예시에서는 `"뽀야"`로 돼 있어요. 나머지는 그대로 복사하면 돼요.

```json
{
  "display_information": {
    "name": "뽀야",
    "description": "OpenClaw AI 에이전트",
    "background_color": "#611f69"
  },
  "features": {
    "app_home": {
      "home_tab_enabled": false,
      "messages_tab_enabled": true,
      "messages_tab_read_only_enabled": false
    },
    "bot_user": {
      "display_name": "bboya",
      "always_online": true
    }
  },
  "oauth_config": {
    "scopes": {
      "bot": [
        "app_mentions:read",
        "assistant:write",
        "channels:history",
        "channels:read",
        "chat:write",
        "chat:write.customize",
        "chat:write.public",
        "commands",
        "emoji:read",
        "files:read",
        "files:write",
        "groups:history",
        "groups:read",
        "im:history",
        "im:read",
        "im:write",
        "pins:read",
        "pins:write",
        "reactions:read",
        "reactions:write",
        "users:read"
      ]
    }
  },
  "settings": {
    "event_subscriptions": {
      "bot_events": [
        "app_mention",
        "channel_rename",
        "member_joined_channel",
        "member_left_channel",
        "message.channels",
        "message.groups",
        "message.im",
        "pin_added",
        "pin_removed",
        "reaction_added",
        "reaction_removed"
      ]
    },
    "interactivity": {
      "is_enabled": false
    },
    "org_deploy_enabled": false,
    "socket_mode_enabled": true,
    "token_rotation_enabled": false
  }
}
```

> ⚠️ **주석 넣으면 안 돼요!** Slack 매니페스트는 순수 JSON만 받아요. `//` 나 `/* */` 같은 주석이 들어가면 파싱 에러가 나요.

4. **Create** 클릭 → 앱이 1~4단계 설정이 완료된 상태로 생성돼요!
5. 이후 **5단계**(Install to Workspace)부터 이어서 진행하면 됩니다

> ⚠️ 앱 토큰(`xapp-`)은 매니페스트로 자동 생성되지 않아요. 생성 후 **Socket Mode** 메뉴에서 앱 토큰을 만들어야 합니다 (1단계의 3~4번 참고).

**매니페스트에 포함된 설정 요약:**

| 항목 | 내용 | 본문 단계 |
|------|------|----------|
| Socket Mode | 활성화 | 1단계 |
| Bot Token Scopes | 19개 전부 포함 | 2단계 |
| App Home | Messages Tab 활성화, always_online | 3단계 |
| Event Subscriptions | 4개 봇 이벤트 | 4단계 |

---

### 부록 B: openclaw.json 직접 편집

> `openclaw channels add` 명령어가 결국 만들어주는 설정 파일이에요. 세밀하게 튜닝하고 싶을 때 참고하세요.

```jsonc
{
  "channels": {
    "slack": {
      "accounts": {
        "my-bot": {               // ← 계정 ID: 영문+하이픈으로 자유롭게
          "name": "내 워크스페이스",  // ← 표시 이름: 한국어 OK!
          "botToken": "xoxb-여기에-봇토큰",
          "appToken": "xapp-여기에-앱토큰",
          "groupPolicy": "open",
          "streaming": "partial",
          "nativeStreaming": true,
          "dmPolicy": "allowlist",
          "allowFrom": ["U내슬랙ID"]
        }
      }
    }
  },
  "bindings": [
    {
      "agentId": "내에이전트",
      "match": { "channel": "slack", "accountId": "my-bot" }
    }
  ]
}
```

**주요 필드 설명:**

| 필드 | 설명 |
|------|------|
| `"my-bot"` (계정 키) | 내가 정하는 ID. **영문 소문자 + 하이픈** 추천. `bindings`의 `accountId`와 맞춰야 해요 |
| `"name"` | 표시용 이름. 한국어 자유롭게 OK |
| `"groupPolicy": "open"` | 초대된 모든 채널에서 활성화. `"allowlist"`면 채널 ID를 하나하나 등록해야 해요 |
| `"dmPolicy": "allowlist"` | DM 허용 정책. `"allowFrom"`에 등록된 유저만 DM 가능 |
| `"allowFrom"` | DM을 허용할 Slack User ID 목록 |

### Slack User ID 찾는 법

`allowFrom`에 넣을 자기 Slack ID를 찾으려면:

1. Slack에서 **자기 프로필 사진** 클릭
2. **점 3개 메뉴(⋯)** 클릭
3. **"멤버 ID 복사"** (Copy member ID)
4. `U`로 시작하는 코드가 복사됨 — 이게 Slack User ID예요

설정 후 재시작:
```bash
openclaw gateway restart
```
