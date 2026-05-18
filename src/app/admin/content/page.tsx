export const dynamic = "force-dynamic";

import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createSsrClient } from "@/lib/supabase/ssr";
import { createServerClient } from "@/lib/supabase/server";
import type { MarketCard } from "@/lib/market";
import NewArticleForm from "./new-article-form";
import { DeleteArticleButton, PublishToggle } from "./row-actions";

interface Article {
  id: number;
  slug: string;
  title: string;
  subtitle: string | null;
  cover_image: string | null;
  published_at: string;
  is_published: boolean;
  updated_at: string;
}

export default async function AdminContentPage() {
  const supabase = await createSsrClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.role !== "admin") {
    return (
      <div className="max-w-3xl mx-auto px-4 py-10">
        <h1 className="text-xl font-bold mb-2">접근 권한 없음</h1>
        <p className="text-sm opacity-60">관리자만 접근 가능합니다.</p>
      </div>
    );
  }

  const admin = createServerClient();
  const [{ data: arts }, { data: cards }] = await Promise.all([
    admin
      .from("articles")
      .select("id, slug, title, subtitle, cover_image, published_at, is_published, updated_at")
      .order("published_at", { ascending: false })
      .order("id", { ascending: false }),
    admin
      .from("market_cards")
      .select("*")
      .eq("is_active", true)
      .order("category", { ascending: true })
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: false }),
  ]);
  const articles = (arts ?? []) as Article[];
  const marketCards = (cards ?? []) as MarketCard[];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold tracking-tight">매거진 관리</h1>
        <Link href="/content" className="text-sm opacity-70 hover:opacity-100">
          매거진 페이지로 →
        </Link>
      </div>

      <NewArticleForm marketCards={marketCards} />

      <h2 className="text-sm font-semibold mt-8 mb-3">등록 글 ({articles.length})</h2>

      <ul className="space-y-2">
        {articles.length === 0 && (
          <li className="py-8 text-center text-sm opacity-50">등록된 글이 없습니다.</li>
        )}
        {articles.map((a) => (
          <li
            key={a.id}
            className="flex items-center gap-3 p-3 rounded-lg border border-[var(--border)] bg-[var(--card-bg)]"
          >
            <div className="w-20 h-12 relative shrink-0 rounded overflow-hidden bg-gray-50">
              {a.cover_image ? (
                <Image src={a.cover_image} alt={a.title} fill className="object-cover" sizes="80px" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[10px] opacity-40">no cover</div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <PublishToggle id={a.id} published={a.is_published} />
                <Link href={`/content/${a.slug}`} className="text-sm font-medium truncate hover:underline">
                  {a.title}
                </Link>
              </div>
              {a.subtitle && (
                <p className="text-xs opacity-60 truncate mt-0.5">{a.subtitle}</p>
              )}
              <p className="text-[11px] opacity-50 mt-0.5">
                {new Date(a.published_at).toLocaleDateString("ko-KR")} · /{a.slug}
              </p>
            </div>
            <DeleteArticleButton id={a.id} />
          </li>
        ))}
      </ul>
    </div>
  );
}
