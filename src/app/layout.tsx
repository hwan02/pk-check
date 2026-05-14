import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { Geist, Black_Han_Sans } from "next/font/google";
import Link from "next/link";
import Image from "next/image";
import BottomNav from "@/components/bottom-nav";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const logoFont = Black_Han_Sans({
  variable: "--font-logo",
  weight: "400",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "포포샵 - 포켓몬 / 원피스 카드 해외 직판",
  description: "포켓몬, 원피스 카드를 전 세계로 배송. PayPal 결제 지원.",
};

export const viewport: Viewport = {
  themeColor: "#f0eef6",
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
    <html lang="ko" className={`${geistSans.variable} ${logoFont.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col pb-16">
        <header className="border-b border-[var(--border)] bg-[var(--card-bg)]/90 backdrop-blur-sm sticky top-0 z-50">
          <nav className="max-w-7xl mx-auto px-4 h-12 flex items-center">
            <Link href="/" className="flex items-center gap-2">
              <Image src="/icon.svg" alt="" width={24} height={24} />
              <span className="text-lg logo-text" style={{ fontFamily: "var(--font-logo)" }}>
                포포샵
              </span>
            </Link>
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
