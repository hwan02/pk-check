import type { Metadata } from "next";
import { Geist, Black_Han_Sans } from "next/font/google";
import Link from "next/link";
import Image from "next/image";
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
  title: "포포시세 - 포켓몬카드 시세 검색",
  description: "포켓몬 TCG 카드 시세를 TCGPlayer와 snkrdunk에서 한 눈에 비교하세요.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={`${geistSans.variable} ${logoFont.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <header className="border-b border-[var(--border)] bg-[var(--card-bg)]/80 backdrop-blur-sm sticky top-0 z-50">
          <nav className="max-w-7xl mx-auto px-4 h-14 flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2">
              <Image src="/icon.svg" alt="" width={28} height={28} />
              <span className="text-xl logo-text" style={{ fontFamily: "var(--font-logo)" }}>
                포포시세
              </span>
            </Link>
            <Link
              href="/scan"
              className="text-sm text-[var(--foreground)] opacity-70 hover:opacity-100 transition"
            >
              카드 스캔
            </Link>
            <Link
              href="/add"
              className="text-sm text-[var(--foreground)] opacity-70 hover:opacity-100 transition"
            >
              카드 추가
            </Link>
            <Link
              href="/sets"
              className="text-sm text-[var(--foreground)] opacity-70 hover:opacity-100 transition"
            >
              세트 목록
            </Link>
          </nav>
        </header>
        <main className="flex-1">{children}</main>
        <footer className="border-t border-[var(--border)] py-4 text-center text-xs opacity-50">
          포포시세 - 포켓몬카드 시세 비교
        </footer>
      </body>
    </html>
  );
}
