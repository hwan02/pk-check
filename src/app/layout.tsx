import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { Noto_Sans_KR, Inter } from "next/font/google";
import Link from "next/link";
import BottomNav from "@/components/bottom-nav";
import "./globals.css";

// KREAM이 쓰는 Pretendard와 가장 비슷한 Noto Sans KR + 영문 워드마크용 Inter
const notoSansKr = Noto_Sans_KR({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "700", "900"],
});

const inter = Inter({
  variable: "--font-brand",
  subsets: ["latin"],
  weight: ["700", "900"],
});

export const metadata: Metadata = {
  title: "Kikidult — 포켓몬 · 원피스 카드 마켓",
  description: "Kikidult. 포켓몬·원피스 트레이딩 카드의 실시간 시세와 거래.",
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={`${notoSansKr.variable} ${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col pb-16">
        <header className="border-b border-[var(--border)] bg-[var(--card-bg)]/95 backdrop-blur-sm sticky top-0 z-50">
          <nav className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between gap-6">
            <Link href="/" className="flex items-center shrink-0">
              <span
                className="text-2xl font-black tracking-tight"
                style={{ fontFamily: "var(--font-brand), sans-serif", letterSpacing: "-0.04em" }}
              >
                KIKIDULT
              </span>
            </Link>
            <div className="hidden md:flex items-center gap-6 text-sm font-semibold">
              <Link href="/shop" className="opacity-80 hover:opacity-100 tracking-wide">SHOP</Link>
              <Link href="/shop?category=pokemon" className="opacity-80 hover:opacity-100 tracking-wide">POKÉMON</Link>
              <Link href="/shop?category=onepiece" className="opacity-80 hover:opacity-100 tracking-wide">ONE PIECE</Link>
              <Link href="/content" className="opacity-80 hover:opacity-100 tracking-wide">MAGAZINE</Link>
            </div>
            <div className="md:hidden flex items-center gap-3 text-xs">
              <Link href="/shop" className="opacity-80">SHOP</Link>
              <Link href="/content" className="opacity-80">MAGAZINE</Link>
            </div>
          </nav>
        </header>
        <main className="flex-1">{children}</main>
        <Suspense fallback={<div className="fixed bottom-0 left-0 right-0 h-14" />}>
          <BottomNav />
        </Suspense>
      </body>
    </html>
  );
}
