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

const SITE_URL = "https://kikidult.com";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Kikidult — Pokemon · One Piece TCG Market",
    template: "%s · Kikidult",
  },
  description:
    "포켓몬 · 원피스 트레이딩 카드를 전 세계로. PayPal 결제와 EMS 등기 국제 배송. Authentic Pokemon and One Piece TCG cards shipped worldwide from Korea.",
  keywords: [
    "포켓몬 카드",
    "원피스 카드",
    "Pokemon TCG",
    "One Piece TCG",
    "trading cards",
    "Charizard",
    "Pikachu",
    "Kikidult",
    "TCG market",
    "international shipping",
    "PayPal",
  ],
  openGraph: {
    type: "website",
    url: SITE_URL,
    title: "Kikidult — Pokemon · One Piece TCG Market",
    description:
      "Authentic Pokemon and One Piece TCG cards shipped worldwide from Korea. PayPal · EMS tracking.",
    siteName: "Kikidult",
    locale: "ko_KR",
  },
  twitter: {
    card: "summary_large_image",
    title: "Kikidult — Pokemon · One Piece TCG Market",
    description:
      "Authentic Pokemon and One Piece TCG cards shipped worldwide from Korea.",
  },
  alternates: { canonical: SITE_URL },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
  verification: {
    google: "-GBKhnr3v7rnHBVsa9cM9xnIQ2sjG9p7Vq40l9WhVAA",
  },
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
