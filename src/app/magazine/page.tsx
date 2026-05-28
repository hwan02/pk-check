export const revalidate = 60;

import type { Metadata } from "next";
import Link from "next/link";
import { createSsrClient } from "@/lib/supabase/ssr";

export const metadata: Metadata = {
  title: "매거진 — KIKIDULT",
  description: "포켓몬·원피스 카드 시세 인사이트와 이번 주 픽 카드.",
};

interface Article {
  id: number;
  slug: string;
  title: string;
  subtitle: string | null;
  cover_image: string | null;
  published_at: string;
}

export default async function MagazineListPage() {
  const supabase = await createSsrClient();
  const { data } = await supabase
    .from("articles")
    .select("id, slug, title, subtitle, cover_image, published_at")
    .eq("is_published", true)
    .order("published_at", { ascending: false })
    .order("id", { ascending: false });

  const articles = (data ?? []) as Article[];

  return (
    <div className="max-w-5xl mx-auto px-4 pt-6 pb-16">
      <header className="text-center mb-10 md:mb-14">
        <p className="text-[10px] tracking-[0.3em] opacity-50 uppercase">MAGAZINE</p>
        <h1 className="mt-2 text-3xl md:text-5xl font-black tracking-tight">매거진</h1>
        <p className="mt-3 text-sm opacity-60 max-w-xl mx-auto">
          이번 주 시세 트렌드와 픽 카드 인사이트.
        </p>
      </header>

      {articles.length === 0 ? (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-12 text-center">
          <p className="text-sm opacity-60">아직 등록된 매거진 글이 없어요.</p>
        </div>
      ) : (
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-7">
          {articles.map((a) => (
            <li key={a.id}>
              <Link href={`/magazine/${a.slug}`} className="group block">
                <div className="rounded-2xl overflow-hidden bg-white border border-[var(--border)] flex items-center justify-center aspect-[5/7]">
                  {a.cover_image ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={a.cover_image}
                      alt={a.title}
                      loading="lazy"
                      decoding="async"
                      className="max-w-full max-h-full w-auto h-auto object-contain group-hover:scale-[1.03] transition-transform"
                    />
                  ) : (
                    <div className="text-xs opacity-30">no cover</div>
                  )}
                </div>
                <div className="mt-3">
                  <p className="text-[10px] tracking-[0.25em] uppercase opacity-50">
                    {new Date(a.published_at).toLocaleDateString("ko-KR")}
                  </p>
                  <h2 className="text-base md:text-lg font-bold tracking-tight leading-snug mt-1 line-clamp-2 group-hover:underline">
                    {a.title}
                  </h2>
                  {a.subtitle && (
                    <p className="text-xs opacity-60 line-clamp-2 mt-1">{a.subtitle}</p>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
