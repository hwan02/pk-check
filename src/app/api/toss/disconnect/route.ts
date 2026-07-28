import { NextRequest, NextResponse } from "next/server";
import { createHash, timingSafeEqual } from "node:crypto";

/**
 * 앱인토스 "연결 끊기(Unlink)" 콜백 수신.
 *
 * 토스는 사용자가 연결을 해제(탈퇴)하면 콘솔에 등록된 콜백 URL을 호출한다.
 *   GET  /api/toss/disconnect?userKey=<사용자키>&referrer=UNLINK
 *   Authorization: <콘솔에 등록한 Basic Auth 헤더 값>
 *
 * 인증: 콘솔에 등록한 값과 동일한 문자열을 환경변수 TOSS_UNLINK_BASIC_AUTH 에 저장해두고,
 *       들어온 Authorization 헤더와 상수시간 비교로 검증한다.
 *
 * 환경변수: TOSS_UNLINK_BASIC_AUTH  (예: "Basic dG9zczou..." — "Basic " 접두사는 있어도 없어도 됨)
 *
 * NOTE: 현재 앱에는 토스 로그인 연동이 아직 없어 userKey ↔ 내부 회원 매핑이 존재하지 않는다.
 *       로그인 연동을 붙이면, 로그인 시 userKey 를 회원 레코드에 저장하고 아래 UNLINK 처리에서
 *       해당 회원의 개인정보/세션을 파기하도록 확장할 것. 지금은 이벤트를 기록하고 200을 반환한다.
 */

export const dynamic = "force-dynamic";

/** "Basic xxx" 또는 "xxx" 어느 쪽이 와도 base64 부분만 뽑아 정규화 */
function normalizeAuth(value: string | null): string {
  if (!value) return "";
  return value.trim().replace(/^Basic\s+/i, "").trim();
}

/** 길이 노출 없이 상수시간 비교 (sha256 다이제스트끼리 비교) */
function safeEqual(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

function authorize(request: NextRequest): boolean {
  const expected = normalizeAuth(process.env.TOSS_UNLINK_BASIC_AUTH ?? null);
  if (!expected) {
    console.error("[toss unlink] TOSS_UNLINK_BASIC_AUTH 미설정 — 인증 불가");
    return false;
  }
  const got = normalizeAuth(request.headers.get("authorization"));
  return got.length > 0 && safeEqual(got, expected);
}

async function handle(request: NextRequest) {
  if (!authorize(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // userKey / referrer 는 GET 쿼리스트링으로 전달됨. POST 대비 body 도 확인.
  const params = request.nextUrl.searchParams;
  let userKey = params.get("userKey") ?? "";
  let referrer = params.get("referrer") ?? "";

  if ((!userKey || !referrer) && request.method === "POST") {
    try {
      const body = (await request.json()) as Record<string, unknown>;
      userKey = userKey || String(body.userKey ?? "");
      referrer = referrer || String(body.referrer ?? "");
    } catch {
      // body 없거나 JSON 아님 — 무시
    }
  }

  if (!userKey) {
    return NextResponse.json({ error: "userKey required" }, { status: 400 });
  }

  // TODO(토스 로그인 연동 후): userKey 로 회원을 찾아 개인정보/세션/토큰 파기.
  //   const db = createServerClient();
  //   await db.from("profiles").delete().eq("toss_user_key", userKey);
  console.log(
    `[toss unlink] userKey=${userKey} referrer=${referrer || "(none)"} — 연결 끊기 이벤트 수신`,
  );

  return NextResponse.json({ ok: true });
}

export async function GET(request: NextRequest) {
  return handle(request);
}

export async function POST(request: NextRequest) {
  return handle(request);
}
