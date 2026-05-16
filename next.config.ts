import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.pokemontcg.io" },
      { protocol: "https", hostname: "images.scrydex.com" },
      { protocol: "https", hostname: "cdn.snkrdunk.com" },
      { protocol: "https", hostname: "cards.image.pokemonkorea.co.kr" },
      { protocol: "https", hostname: "assets.tcgdex.net" },
      { protocol: "https", hostname: "*.supabase.co" },
    ],
  },
  async headers() {
    return [
      {
        // 정적 에셋 (이미지, 폰트, JS/CSS) 장기 캐시
        source: "/:path*(svg|jpg|jpeg|png|gif|ico|webp|woff|woff2|ttf|css|js)",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      {
        // 법적 페이지 1일 캐시
        source: "/legal/:path*",
        headers: [
          { key: "Cache-Control", value: "public, s-maxage=86400, stale-while-revalidate=86400" },
        ],
      },
      {
        // 샵 목록/상품 1분 CDN 캐시 + 백그라운드 재생성
        source: "/shop/:path*",
        headers: [
          { key: "Cache-Control", value: "public, s-maxage=60, stale-while-revalidate=120" },
        ],
      },
      {
        // 메인 페이지
        source: "/",
        headers: [
          { key: "Cache-Control", value: "public, s-maxage=60, stale-while-revalidate=120" },
        ],
      },
    ];
  },
};

export default nextConfig;
