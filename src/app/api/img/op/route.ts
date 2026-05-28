import { NextRequest, NextResponse } from "next/server";

/**
 * onepiece-cardgame.com 이미지 프록시.
 * - 원본이 Cross-Origin-Resource-Policy: same-site 를 보내서 브라우저가 native img 차단
 * - 우리 도메인에서 서빙 + 강한 캐시 헤더로 Vercel CDN 캐시
 * - Next/Image 변환 비용 없음
 *
 * 사용법: /api/img/op?p=images/cardlist/card/OP02-001.png
 *   또는: /api/img/op?p=cardlist/card/OP02-001.png  (images/ 자동 prefix)
 */

const BASE = "https://www.onepiece-cardgame.com";
const SAFE_PATH = /^[A-Za-z0-9_\-./]+$/;

export async function GET(req: NextRequest): Promise<Response> {
  const url = new URL(req.url);
  let p = url.searchParams.get("p")?.trim();
  if (!p) return new NextResponse("missing p", { status: 400 });
  // 경로 traversal/외부 호스트 차단
  if (p.includes("..") || p.startsWith("/")) return new NextResponse("invalid path", { status: 400 });
  if (!SAFE_PATH.test(p)) return new NextResponse("invalid path", { status: 400 });
  // images/ 가 빠진 경우 자동 보강
  if (!p.startsWith("images/") && !p.startsWith("onepiececg/") && !p.startsWith("renewal/")) {
    p = `images/${p}`;
  }

  const target = `${BASE}/${p}`;
  const resp = await fetch(target, {
    headers: { "User-Agent": "Mozilla/5.0" },
    // 30일 캐시 (Vercel edge CDN 활용)
    next: { revalidate: 60 * 60 * 24 * 30 },
  });
  if (!resp.ok) return new NextResponse(`upstream ${resp.status}`, { status: resp.status });

  const ct = resp.headers.get("content-type") ?? "image/png";
  const buf = Buffer.from(await resp.arrayBuffer());
  return new NextResponse(buf, {
    headers: {
      "content-type": ct,
      "content-length": String(buf.length),
      // 브라우저 + Vercel CDN 모두 길게 캐시
      "cache-control": "public, max-age=2592000, s-maxage=31536000, immutable",
    },
  });
}
