const PASSWORD = "geneify";
const COOKIE_NAME = "auth_token";
const COOKIE_VALUE = "authenticated_geneify_2026";

export default async function middleware(request: Request) {
  const url = new URL(request.url);

  // Allow auth endpoint
  if (url.pathname === "/__auth") {
    return handleAuth(request);
  }

  // Check cookie
  const cookies = request.headers.get("cookie") || "";
  if (cookies.includes(`${COOKIE_NAME}=${COOKIE_VALUE}`)) {
    return; // pass through to origin
  }

  // Show login page
  return new Response(loginPage(), {
    status: 401,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

async function handleAuth(request: Request) {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const form = await request.formData();
  const password = form.get("password");
  if (password === PASSWORD) {
    return new Response(null, {
      status: 302,
      headers: {
        Location: "/",
        "Set-Cookie": `${COOKIE_NAME}=${COOKIE_VALUE}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=604800`,
      },
    });
  }
  return new Response(loginPage("비밀번호가 틀렸어요!"), {
    status: 401,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

function loginPage(error?: string) {
  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>🔒 비밀번호 필요</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background: #0a0a0a;
      color: #e0e0e0;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
    }
    .card {
      background: #1a1a1a;
      border: 1px solid #333;
      border-radius: 16px;
      padding: 40px;
      max-width: 380px;
      width: 90%;
      text-align: center;
    }
    .lock { font-size: 48px; margin-bottom: 16px; }
    h1 { font-size: 20px; margin-bottom: 8px; }
    p { font-size: 14px; color: #888; margin-bottom: 24px; }
    input {
      width: 100%;
      padding: 12px 16px;
      border: 1px solid #333;
      border-radius: 8px;
      background: #0a0a0a;
      color: #e0e0e0;
      font-size: 16px;
      margin-bottom: 12px;
      outline: none;
    }
    input:focus { border-color: #666; }
    button {
      width: 100%;
      padding: 12px;
      border: none;
      border-radius: 8px;
      background: #fff;
      color: #000;
      font-size: 15px;
      font-weight: 600;
      cursor: pointer;
    }
    button:hover { background: #ddd; }
    .error { color: #ff6b6b; font-size: 13px; margin-bottom: 12px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="lock">🔒</div>
    <h1>비밀번호를 입력해주세요</h1>
    <p>이 페이지는 팀 전용입니다</p>
    ${error ? `<div class="error">${error}</div>` : ""}
    <form method="POST" action="/__auth">
      <input type="password" name="password" placeholder="비밀번호" autofocus required />
      <button type="submit">확인</button>
    </form>
  </div>
</body>
</html>`;
}

export const config = {
  matcher: ["/((?!_astro|favicon).*)"],
};
