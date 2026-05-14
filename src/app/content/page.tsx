export const dynamic = "force-dynamic";

import Image from "next/image";
import Link from "next/link";
import { createSsrClient } from "@/lib/supabase/ssr";

interface Article {
  id: number;
  slug: string;
  title: string;
  subtitle: string | null;
  cover_image: string | null;
  published_at: string;
}

export default async function ContentListPage() {
  const supabase = await createSsrClient();
  const { data } = await supabase
    .from("articles")
    .select("id, slug, title, subtitle, cover_image, published_at")
    .eq("is_published", true)
    .order("published_at", { ascending: false })
    .limit(40);
  const articles: Article[] = data ?? [];

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <header className="mb-8">
        <p className="text-xs tracking-[0.3em] opacity-50 uppercase">Content</p>
        <h1 className="text-3xl md:text-4xl font-black tracking-tight mt-1">매거진</h1>
        <p className="text-sm opacity-70 mt-2">시세, 신규 발매, 컬렉팅 가이드.</p>
      </header>

      {articles.length === 0 ? (
        <p className="py-20 text-center text-sm opacity-50">아직 등록된 글이 없습니다.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-8">
          {articles.map((a) => (
            <Link key={a.id} href={`/content/${a.slug}`} className="group block">
              <div className="aspect-[16/10] rounded-xl overflow-hidden bg-[var(--surface)] border border-[var(--border)] relative">
                {a.cover_image ? (
                  <Image
                    src={a.cover_image}
                    alt={a.title}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    className="object-cover group-hover:scale-[1.02] transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs opacity-40">no image</div>
                )}
              </div>
              <div className="mt-3">
                <p className="text-[10px] tracking-widest uppercase opacity-50">
                  {new Date(a.published_at).toLocaleDateString("ko-KR")}
                </p>
                <h2 className="text-base font-bold mt-1 line-clamp-2 group-hover:underline">{a.title}</h2>
                {a.subtitle && <p className="text-xs opacity-60 mt-1 line-clamp-2">{a.subtitle}</p>}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
