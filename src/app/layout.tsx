import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { Noto_Sans_KR, Inter } from "next/font/google";
import BottomNav from "@/components/bottom-nav";
import TopNav from "@/components/top-nav";
import Footer from "@/components/footer";
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
      <body className="min-h-full flex flex-col pb-16 md:pb-0">
        <Suspense
          fallback={
            <header className="border-b border-[var(--border)] bg-[var(--card-bg)]/95 sticky top-0 z-50 h-14" />
          }
        >
          <TopNav />
        </Suspense>
        <main className="flex-1">{children}</main>
        <Footer />
        <Suspense fallback={<div className="md:hidden fixed bottom-0 left-0 right-0 h-14" />}>
          <BottomNav />
        </Suspense>
      </body>
    </html>
  );
}
