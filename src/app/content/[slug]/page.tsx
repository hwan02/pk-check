export const dynamic = "force-dynamic";

import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { marked } from "marked";
import { createSsrClient } from "@/lib/supabase/ssr";

interface Props {
  params: Promise<{ slug: string }>;
}

interface Article {
  id: number;
  slug: string;
  title: string;
  subtitle: string | null;
  cover_image: string | null;
  body_md: string;
  published_at: string;
}

export default async function ContentDetailPage({ params }: Props) {
  const { slug } = await params;
  const supabase = await createSsrClient();
  const { data } = await supabase
    .from("articles")
    .select("*")
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();

  if (!data) notFound();
  const article = data as Article;
  const html = await marked.parse(article.body_md, { gfm: true, breaks: true });

  return (
    <article className="max-w-3xl mx-auto px-4 py-8">
      <nav className="text-xs opacity-60 mb-4">
        <Link href="/content" className="hover:opacity-100">← 매거진</Link>
      </nav>

      <header className="mb-8">
        <p className="text-[10px] tracking-[0.3em] uppercase opacity-50">
          {new Date(article.published_at).toLocaleDateString("ko-KR")}
        </p>
        <h1 className="text-3xl md:text-4xl font-black tracking-tight leading-tight mt-2">
          {article.title}
        </h1>
        {article.subtitle && <p className="text-base opacity-70 mt-3">{article.subtitle}</p>}
      </header>

      {article.cover_image && (
        <div className="aspect-[16/9] relative rounded-2xl overflow-hidden bg-[var(--surface)] border border-[var(--border)] mb-8">
          <Image src={article.cover_image} alt={article.title} fill sizes="(max-width: 768px) 100vw, 768px" className="object-cover" priority />
        </div>
      )}

      <div
        className="prose prose-sm md:prose-base max-w-none article-body"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </article>
  );
}
