import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.pokemontcg.io",
      },
      {
        protocol: "https",
        hostname: "images.scrydex.com",
      },
      {
        protocol: "https",
        hostname: "cdn.snkrdunk.com",
      },
      {
        protocol: "https",
        hostname: "cards.image.pokemonkorea.co.kr",
      },
      {
        protocol: "https",
        hostname: "assets.tcgdex.net",
      },
    ],
  },
};

export default nextConfig;
