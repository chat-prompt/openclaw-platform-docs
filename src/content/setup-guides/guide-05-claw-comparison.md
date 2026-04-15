---
title: "나에게 맞는 Claw는?"
episode: 1
series: setup-guides
token: "뽀야뽀야"
description: "OpenClaw, KimiClaw, NanoClaw, AndClaw, MicroClaw, ZeroClaw, MetaClaw, I-Claw — 8종 Claw 에이전트 완전 비교. 나한테 딱 맞는 Claw를 찾아보세요!"
publishedAt: "2026-03-20"
cover: "/images/team-guides/guide-05/cover.png"
accentColor: "#E8590C"
tags: ["심화", "비교"]
---

# 🐾 뽀짝이의 Claw 가이드 #1 — 나에게 맞는 Claw는?

> 8종 Claw 에이전트 완전 비교 가이드

![커버](/images/team-guides/guide-05/cover.png)

---

## 시작하기 전에

요즘 덕후방에서 이런 질문이 진짜 많아요.

> "OpenClaw이랑 NanoClaw이 뭐가 달라요?"
> "MicroClaw이 더 가볍다던데 그걸로 갈아타야 하나요?"
> "나는 안드로이드인데 쓸 수 있는 거 있어요?"

Claw라는 이름이 붙은 에이전트만 해도 **8종류**나 돼요. 처음 보면 헷갈릴 수밖에 없어요. 그래서 준비했습니다 — **한 편으로 끝내는 Claw 완전 비교**! 🐈‍⬛

---

## 한눈에 보는 Claw 패밀리

먼저 전체 지도부터 펼쳐볼게요.

![8종 비교표](/images/team-guides/guide-05/comparison-table.png)

> 💡 난이도는 **설치부터 첫 대화까지의 허들**이에요. 높다고 나쁜 게 아니라, "어떤 배경지식이 필요한가"의 지표예요.

---

## 🟠 OpenClaw — "원조, 그리고 올라운더"

![OpenClaw](/images/team-guides/guide-05/card-openclaw.png)

**한마디로**: AI 에이전트계의 스위스 아미 나이프

OpenClaw은 Claw 패밀리의 원조이자 가장 기능이 풍부한 프레임워크예요. WhatsApp, Telegram, Slack, Discord, Signal, iMessage... **20개 이상의 채널**을 하나의 게이트웨이로 통합해요.

**셋업 난이도**: ⭐⭐⭐ — `openclaw onboard` 마법사가 대부분 처리해줘요

**비용**: OpenClaw 자체는 **무료**(MIT). AI 모델 API 비용만 별도.

> 🔗 [OpenClaw 공식 사이트](https://openclaw.ai) · [GitHub](https://github.com/openclaw/openclaw) · [공식 문서](https://docs.openclaw.ai)

---

## 🟤 KimiClaw — "브라우저만 있으면 끝"

![KimiClaw](/images/team-guides/guide-05/card-kimiclaw.png)

**한마디로**: 설치/서버 없이 브라우저에서 원클릭으로 배포하는 클라우드 호스팅 OpenClaw

"OpenClaw 좋긴 한데 설치가 어렵다", "서버 관리는 싫다" — 이런 분들을 위한 솔루션이에요. Moonshot AI가 만든 **클라우드 호스팅 버전**이에요.

**셋업 난이도**: ⭐ — 모든 Claw 중 **가장 쉬움!** 브라우저만 있으면 됨

**비용**: Allegretto 플랜 이상 (유료) — 월 구독제

> 🔗 [KimiClaw 공식 소개](https://www.kimi.com/resources/kimi-claw-introduction)

---

## 🟢 NanoClaw — "코드를 통째로 이해하고 싶다면"

![NanoClaw](/images/team-guides/guide-05/card-nanoclaw.png)

**한마디로**: OpenClaw의 미니멀리스트 버전 — 15개 파일, 3,900줄

OpenClaw이 스위스 아미 나이프라면, NanoClaw은 잘 벼린 **단도** 같아요. 핵심만 남기고 나머지는 필요할 때 직접 추가하는 철학이에요.

**셋업 난이도**: ⭐⭐⭐⭐ — Claude Code가 있어야 하고, 컨테이너 런타임 필요

**독특한 점**: 전통적인 설정 파일(YAML/JSON)이 없어요! 대신 Claude Code에게 "트리거 단어 바꿔줘", "텔레그램 연결해줘" 이런 식으로 말해서 설정해요. AI 네이티브!

> 🔗 [NanoClaw 공식 사이트](https://nanoclaw.dev) · [GitHub](https://github.com/qwibitai/nanoclaw)

---

## 🔵 AndClaw — "안드로이드 폰을 AI가 직접 조작"

![AndClaw](/images/team-guides/guide-05/card-andclaw.png)

**한마디로**: ROOT 없이 안드로이드 앱을 AI가 터치하고 스와이프하는 에이전트

다른 Claw들이 "메시지를 주고받는 에이전트"라면, AndClaw는 "**폰 화면을 직접 조작하는 에이전트**"예요. 근본부터 다릅니다.

**셋업 난이도**: ⭐⭐⭐ — APK 설치 + 권한 허용이면 기본 사용 가능

**주의**: 안드로이드 12+ 전용 (iOS 지원 없음!), 화면이 LLM 서버로 전송됨

> 🔗 [AndClaw 공식 사이트](https://andclaw.app) · [GitHub](https://github.com/andforce/Andclaw)

---

## 🟡 MicroClaw — "5MB 메모리, 10ms 부팅의 극한 경량"

![MicroClaw](/images/team-guides/guide-05/card-microclaw.png)

**한마디로**: Rust로 만든 초고속 에이전트 런타임

"OpenClaw 좋긴 한데 Node.js 무겁고, 부팅 느리고..." 이런 생각 해본 적 있으세요? MicroClaw는 그 불만에 대한 답이에요.

**셋업 난이도**: ⭐⭐⭐⭐ — Rust 빌드 또는 바이너리 다운로드, YAML 설정

**주의**: WhatsApp 지원 없음, iOS/macOS 앱 없음

> 🔗 [MicroClaw 공식 사이트](https://microclaw.ai) · [GitHub](https://github.com/microclaw/microclaw)

---

## 🟣 ZeroClaw — "인터넷 없이도 돌아가는 에이전트"

![ZeroClaw](/images/team-guides/guide-05/card-zeroclaw.png)

**한마디로**: Ollama 연동, 완전 로컬 AI 에이전트

"API 비용 0원"이 가능한 유일한 Claw! ZeroClaw는 Ollama 같은 로컬 LLM과 연동해서 **인터넷 없이도** 에이전트를 돌릴 수 있어요.

**셋업 난이도**: ⭐⭐⭐⭐ — Ollama 설치 + Rust 빌드 필요

**비용**: **완전 무료!** Ollama로 실행하면 소프트웨어도 API도 $0

> 🔗 [ZeroClaw 공식 사이트](https://zeroclaw.net) · [GitHub](https://github.com/openagen/zeroclaw)

---

## 🔴 MetaClaw — "쓸수록 똑똑해지는 AI"

![MetaClaw](/images/team-guides/guide-05/card-metaclaw.png)

**한마디로**: 대화하면서 강화학습(RL)으로 계속 진화하는 에이전트

가장 미래 지향적인 Claw예요. 다른 Claw들이 "정해진 능력으로 일하는 에이전트"라면, MetaClaw는 **"쓸수록 능력이 성장하는 에이전트"**. UNC-Chapel Hill 연구실에서 만들었어요.

**셋업 난이도**: ⭐⭐⭐⭐⭐ — OpenClaw + RL 백엔드 + Python 환경 전부 필요

**주의**: 일반 사용보다는 연구 목적에 더 적합

> 🔗 [MetaClaw 공식 사이트](https://metaclaw.bot) · [GitHub](https://github.com/aiming-lab/MetaClaw) · [논문](https://arxiv.org/html/2602.08234v1)

---

## ⚪ I-Claw — "OpenClaw 리모컨"

![I-Claw](/images/team-guides/guide-05/card-iclaw.png)

**한마디로**: OpenClaw를 스마트폰에서 원격 제어하는 컴패니언 앱

I-Claw는 독립적인 에이전트가 아니라 **OpenClaw의 리모컨**이에요. 이미 OpenClaw를 돌리고 있다면, 폰에서 편하게 제어할 수 있게 해주는 앱이에요.

**셋업 난이도**: ⭐⭐ — 앱 설치 + 페어링이면 끝

**주의**: OpenClaw 없이는 사용 불가 — 리모컨이니까요!

> 🔗 [I-Claw 공식 사이트](https://i-claw.com)

---

## 🎯 나한테 맞는 Claw 찾기 — 5초 플로우차트

결정 못 하겠다면, 이 순서대로 따라오세요!

![5초 플로우차트](/images/team-guides/guide-05/flowchart.png)

---

## 💰 비용 비교

| Claw | 소프트웨어 | API 비용 | 하드웨어 |
|------|----------|---------|---------|
| **OpenClaw** | 무료 (MIT) | 모델별 API | 일반 PC/Mac |
| **KimiClaw** | 유료 구독 | 구독 포함 | 브라우저만 |
| **NanoClaw** | 무료 (MIT) | Claude API | PC + 컨테이너 |
| **AndClaw** | 무료 | Kimi/OpenAI | 안드로이드 폰 |
| **MicroClaw** | 무료 | 모델별 API | 라즈베리파이 OK |
| **ZeroClaw** | 무료 | **$0!** (Ollama) | $10 보드 OK |
| **MetaClaw** | 무료 (MIT) | API + RL | 일반 PC/Mac |
| **I-Claw** | 무료 | OpenClaw 비용 | iPhone/Android |

> 💡 **가장 저렴**: ZeroClaw + Ollama = 전부 무료!
> 💡 **가장 쉬운 시작**: KimiClaw = 브라우저만 있으면 바로!

---

## 마무리

![마무리](/images/team-guides/guide-05/card-closing.png)

8종 Claw를 다 살펴봤어요. 결론은? "**나한테 맞는 게 최고**"예요.

궁금한 점 있으면 덕후방에서 편하게 물어보세요! 뽀짝이가 답해드릴게요 🐾
