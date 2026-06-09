export const revalidate = 120; // 2분 캐시

import type { Metadata } from "next";
import Link from "next/link";
import { createSsrClient } from "@/lib/supabase/ssr";
import {
  type Raffle,
  RAFFLE_CATEGORY_LABEL,
  formatJPY,
  isNewlyAdded,
} from "@/lib/raffles";

export const metadata: Metadata = {
  title: "일본 아마존 응모 — 포켓몬 · 원피스 카드",
  description:
    "포켓몬 · 원피스 카드 일본 아마존 응모(추첨판매) 링크 모음. 한국에서도 응모 가능.",
  alternates: { canonical: "https://kikidult.com/raffle" },
};

type Category = "all" | "pokemon" | "onepiece" | "other";

interface PageProps {
  searchParams: Promise<{ category?: string }>;
}

export default async function RafflePage({ searchParams }: PageProps) {
  const params = await searchParams;
  const category: Category =
    params.category === "pokemon" || params.category === "onepiece" || params.category === "other"
      ? params.category
      : "all";

  const supabase = await createSsrClient();
  let query = supabase
    .from("raffles")
    .select("*")
    .eq("is_active", true)
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: false })
    .limit(200);
  if (category !== "all") query = query.eq("category", category);
  const { data } = await query;
  const items = (data ?? []) as Raffle[];

  const total = items.length;
  const counts = {
    pokemon: items.filter((r) => r.category === "pokemon").length,
    onepiece: items.filter((r) => r.category === "onepiece").length,
    other: items.filter((r) => r.category === "other").length,
  };

  return (
    <div>
      {/* === Hero === */}
      <section className="relative overflow-hidden border-b border-[var(--border)]">
        <div
          className="absolute inset-0 opacity-[0.6]"
          style={{
            background:
              "radial-gradient(60% 60% at 30% 0%, rgba(255,158,82,0.35) 0%, transparent 70%)," +
              "radial-gradient(50% 50% at 80% 100%, rgba(96,165,250,0.30) 0%, transparent 70%)," +
              "linear-gradient(180deg, #fff7ed 0%, transparent 100%)",
          }}
          aria-hidden
        />
        <div className="relative max-w-7xl mx-auto px-4 py-10 md:py-16">
          <p className="text-[11px] tracking-[0.3em] uppercase opacity-50 font-semibold">
            Amazon JP · Raffle
          </p>
          <h1 className="text-3xl md:text-5xl font-black tracking-tight mt-2 leading-[1.1]">
            일본 아마존 <span className="text-[var(--primary)]">응모</span>
            <br />
            모음
          </h1>
          <p className="text-sm md:text-base opacity-70 mt-4 leading-relaxed max-w-xl">
            포켓몬 · 원피스 카드의 일본 아마존 <strong>응모(추첨판매)</strong> 링크를 모았어요.
            한국 번호로도 응모 가능하고, 당첨 시 한국으로 직배송할 수 있습니다.
          </p>

          {/* Stat */}
          <div className="mt-6 flex flex-wrap items-center gap-3 text-xs">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500 text-white font-bold shadow-sm">
              <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
              지금 응모중 {total}건
            </span>
          </div>
        </div>
      </section>

      {/* === 어필리에이트 고지 (FTC / Amazon Operating Agreement 준수) === */}
      <section className="border-b border-amber-200/60 bg-amber-50/70">
        <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-start gap-2 text-[11px] md:text-xs leading-relaxed">
          <span aria-hidden className="mt-0.5">💼</span>
          <p className="opacity-80">
            <strong>광고 고지</strong> · 본 페이지는 <strong>Amazon.co.jp 어필리에이트 프로그램</strong> 의
            참가자로서, 페이지 내 링크를 통한 구매 시 소정의 추천 수수료를 받습니다. 응모 자체는 무료이며,
            이로 인해 사용자에게 추가 비용이 발생하지 않습니다.
          </p>
        </div>
      </section>

      {/* === 인포 박스 3개 === */}
      <section className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <InfoCard
            icon="🇰🇷"
            tone="emerald"
            title="한국에서도 응모 가능"
            items={[
              "한국 휴대폰 번호 인증 OK",
              "1번호 1계정 (가족 계정 분리)",
              "당첨 시 한국 직배송 가능",
            ]}
          />
          <InfoCard
            icon="💡"
            tone="amber"
            title="Request invite 버튼이 안 보이면?"
            items={[
              "상품 페이지 우측 하단",
              "「Other sellers on Amazon」 클릭",
              "노란 Request invite 버튼 노출",
            ]}
          />
          <InfoCard
            icon="🎟"
            tone="sky"
            title="아마존 추첨 진행 방식"
            items={[
              "① 초대(invite) 신청",
              "② 아마존이 재고 확보 시 추첨",
              "③ 당첨자에게만 메일 발송",
            ]}
          />
        </div>
      </section>

      {/* === 필터 + 리스트 === */}
      <section className="max-w-7xl mx-auto px-4 pb-12">
        <div className="flex flex-wrap items-center gap-2 mb-5 sticky top-14 z-30 bg-[var(--background)]/95 backdrop-blur py-2 -mx-4 px-4 border-b border-[var(--border)]/60">
          <CategoryTab href={hrefFor("all")} active={category === "all"} label="전체" badge={total} />
          <CategoryTab href={hrefFor("pokemon")} active={category === "pokemon"} label="포켓몬" badge={counts.pokemon} />
          <CategoryTab href={hrefFor("onepiece")} active={category === "onepiece"} label="원피스" badge={counts.onepiece} />
          {counts.other > 0 && (
            <CategoryTab href={hrefFor("other")} active={category === "other"} label="기타" badge={counts.other} />
          )}
        </div>

        {items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[var(--border)] py-20 text-center">
            <p className="text-4xl mb-2">🎫</p>
            <p className="text-sm opacity-60">현재 표시할 응모가 없습니다.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
            {items.map((r) => (
              <RaffleCard key={r.id} r={r} isNew={isNewlyAdded(r.created_at)} />
            ))}
          </div>
        )}

        {/* 면책 + 어필리에이트 상세 고지 */}
        <div className="mt-12 rounded-xl border border-[var(--border)] bg-[var(--surface)]/40 p-4 text-[11px] opacity-70 leading-relaxed space-y-2">
          <p>
            <strong>※ 어필리에이트 안내</strong> &nbsp; 키키덜트는 Amazon.co.jp 어필리에이트(Amazon Associates JP)
            프로그램의 참가자이며, 본 페이지의 모든 아마존 링크는 어필리에이트 링크입니다.
            링크를 통해 발생한 자격 구매에 대해 Amazon 으로부터 일정 광고 수수료를 받을 수 있습니다.
            (사용자 추가 부담 없음)
          </p>
          <p>
            <strong>※ 책임 한계</strong> &nbsp; 본 페이지는 Amazon.co.jp 에 게시된 추첨판매(応募抽選販売)
            정보를 한국 사용자가 쉽게 접근할 수 있도록 큐레이션해 안내합니다.
            응모/당첨/결제/배송/환불 등 모든 거래는 Amazon.co.jp 의 약관과 정책을 따르며,
            당첨 결과 · 재고 · 가격은 키키덜트가 보증하지 않습니다.
            아마존 페이지로 이동 후 발생하는 모든 거래의 책임은 사용자 본인에게 있습니다.
          </p>
        </div>
      </section>
    </div>
  );
}

// =========================================================
// 컴포넌트
// =========================================================

function hrefFor(c: Category): string {
  if (c === "all") return "/raffle";
  return `/raffle?category=${c}`;
}

function CategoryTab({
  href,
  active,
  label,
  badge,
}: {
  href: string;
  active: boolean;
  label: string;
  badge?: number;
}) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold border transition whitespace-nowrap ${
        active
          ? "bg-[var(--primary)] text-white border-[var(--primary)] shadow-sm"
          : "border-[var(--border)] opacity-70 hover:opacity-100 hover:bg-[var(--surface)]"
      }`}
    >
      {label}
      {typeof badge === "number" && (
        <span className={`text-[10px] ${active ? "opacity-80" : "opacity-60"}`}>
          {badge}
        </span>
      )}
    </Link>
  );
}

const INFO_TONES = {
  emerald: { border: "border-emerald-200", bg: "bg-emerald-50/60", chip: "bg-emerald-500" },
  amber:   { border: "border-amber-200",   bg: "bg-amber-50/60",   chip: "bg-amber-500" },
  sky:     { border: "border-sky-200",     bg: "bg-sky-50/60",     chip: "bg-sky-500" },
} as const;

function InfoCard({
  icon,
  tone,
  title,
  items,
}: {
  icon: string;
  tone: keyof typeof INFO_TONES;
  title: string;
  items: string[];
}) {
  const t = INFO_TONES[tone];
  return (
    <div className={`rounded-2xl border ${t.border} ${t.bg} p-4 md:p-5 flex gap-3.5 items-start`}>
      <div
        className={`shrink-0 w-10 h-10 rounded-full ${t.chip} text-white text-xl flex items-center justify-center shadow-sm`}
        aria-hidden
      >
        {icon}
      </div>
      <div className="min-w-0">
        <h3 className="text-sm font-bold mb-1.5">{title}</h3>
        <ul className="text-[12px] leading-relaxed opacity-80 space-y-0.5">
          {items.map((it) => (
            <li key={it} className="flex items-start gap-1.5">
              <span className="opacity-50 mt-0.5">·</span>
              <span>{it}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function RaffleCard({ r, isNew }: { r: Raffle; isNew: boolean }) {
  return (
    <a
      href={r.amazon_url}
      target="_blank"
      rel="noopener noreferrer sponsored"
      className="group rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] overflow-hidden flex flex-col transition hover:shadow-md hover:border-[var(--primary)]/40"
    >
      {/* 이미지 */}
      <div className="relative aspect-[4/3] bg-gray-50 overflow-hidden">
        {r.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={r.image_url}
            alt={r.title}
            loading="lazy"
            className="absolute inset-0 w-full h-full object-contain p-2 group-hover:scale-[1.05] transition-transform duration-500"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-xs opacity-30">
            이미지 없음
          </div>
        )}
        {isNew && (
          <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500 text-white shadow">
            NEW
          </span>
        )}
        <span className="absolute top-2 right-2 px-2 py-1 rounded-full text-[10px] font-bold bg-black/60 text-white backdrop-blur-sm">
          {RAFFLE_CATEGORY_LABEL[r.category]}
        </span>
      </div>

      {/* 본문 */}
      <div className="p-4 flex flex-col gap-2 flex-1">
        <h3 className="text-sm md:text-[15px] font-bold leading-snug line-clamp-3 min-h-[3.6em]">
          {r.title}
        </h3>
        {r.title_ja && (
          <p className="text-[11px] opacity-50 line-clamp-1">{r.title_ja}</p>
        )}

        {(r.price_jpy != null || r.ship_note) && (
          <div className="text-[11px] opacity-70 space-y-0.5">
            {r.price_jpy != null && <p>· 정가 {formatJPY(r.price_jpy)}</p>}
            {r.ship_note && <p>· 발송 {r.ship_note}</p>}
          </div>
        )}

        {r.notes && (
          <p className="mt-1 text-[11px] opacity-60 line-clamp-2">{r.notes}</p>
        )}

        <div className="mt-auto pt-3">
          <span className="block text-center px-3 py-2.5 rounded-lg text-xs font-bold bg-[var(--primary)] text-white group-hover:opacity-90 transition">
            아마존 JP에서 응모하기
            <span className="ml-1 opacity-80" aria-hidden>↗</span>
          </span>
        </div>
      </div>
    </a>
  );
}
