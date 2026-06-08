export const revalidate = 120; // 2분 캐시

import type { Metadata } from "next";
import Link from "next/link";
import { createSsrClient } from "@/lib/supabase/ssr";
import {
  type Raffle,
  type RaffleStatus,
  RAFFLE_CATEGORY_LABEL,
  formatJPY,
  formatKstDate,
  getRaffleStatus,
  isNewlyAdded,
} from "@/lib/raffles";

export const metadata: Metadata = {
  title: "일본 아마존 응모 — Amazon JP 추첨판매 일정",
  description:
    "포켓몬 · 원피스 카드 일본 아마존 추첨판매(応募抽選販売) 응모 일정과 링크를 모아 안내합니다. 한국에서도 응모 가능.",
  alternates: { canonical: "https://kikidult.com/raffle" },
};

type Category = "all" | "pokemon" | "onepiece" | "other";
type Filter = "active" | "all";

interface PageProps {
  searchParams: Promise<{ category?: string; show?: string }>;
}

export default async function RafflePage({ searchParams }: PageProps) {
  const params = await searchParams;
  const category: Category =
    params.category === "pokemon" || params.category === "onepiece" || params.category === "other"
      ? params.category
      : "all";
  const filter: Filter = params.show === "all" ? "all" : "active";

  const supabase = await createSsrClient();
  let query = supabase
    .from("raffles")
    .select("*")
    .eq("is_active", true)
    .order("display_order", { ascending: true })
    .order("apply_end_at", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(200);
  if (category !== "all") query = query.eq("category", category);
  const { data } = await query;
  const all = (data ?? []) as Raffle[];

  const now = new Date();
  const withStatus = all.map((r) => ({ r, s: getRaffleStatus(r, now) }));
  const visible =
    filter === "active"
      ? withStatus.filter((x) => x.s.status !== "closed")
      : withStatus;

  // 정렬: 응모중 → 예정 → 추첨대기 → 종료, 같은 상태 안에서는 마감 임박 우선
  const ORDER: Record<RaffleStatus, number> = {
    open: 0,
    upcoming: 1,
    awaiting_draw: 2,
    closed: 3,
  };
  visible.sort((a, b) => {
    const so = ORDER[a.s.status] - ORDER[b.s.status];
    if (so !== 0) return so;
    return (a.s.daysTo ?? 9999) - (b.s.daysTo ?? 9999);
  });

  // Hero stat
  const openCount = withStatus.filter((x) => x.s.status === "open").length;
  const urgent = withStatus.filter(
    (x) => x.s.status === "open" && x.s.daysTo !== null && x.s.daysTo <= 3,
  );

  // 곧 마감 (D-3 이내) — 현재 필터/카테고리 무관, 사용자가 놓치지 않게 항상 노출
  const urgentAll = all
    .map((r) => ({ r, s: getRaffleStatus(r, now) }))
    .filter((x) => x.s.status === "open" && x.s.daysTo !== null && x.s.daysTo <= 3)
    .sort((a, b) => (a.s.daysTo ?? 9999) - (b.s.daysTo ?? 9999));

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
            포켓몬 · 원피스 카드의 일본 아마존 <strong>추첨판매(応募抽選販売)</strong> 일정을 모았어요.
            한국 번호로도 응모 가능하고, 당첨 시 한국으로 직배송할 수 있습니다.
          </p>

          {/* Stat */}
          <div className="mt-6 flex flex-wrap items-center gap-3 text-xs">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500 text-white font-bold shadow-sm">
              <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
              지금 응모중 {openCount}건
            </span>
            {urgent.length > 0 && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-500 text-white font-bold shadow-sm">
                🔥 곧 마감 {urgent.length}건
              </span>
            )}
            <span className="opacity-50">· 자동 업데이트 2분</span>
          </div>
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

      {/* === 곧 마감 (D-3 이내) === */}
      {urgentAll.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 mb-6">
          <div className="flex items-end justify-between mb-3">
            <h2 className="text-lg md:text-xl font-black tracking-tight">
              🔥 곧 마감
            </h2>
            <p className="text-[11px] opacity-60">3일 이내 마감 임박</p>
          </div>
          <div
            className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 snap-x snap-mandatory"
            style={{ scrollbarWidth: "thin" }}
          >
            {urgentAll.map(({ r, s }) => (
              <UrgentCard
                key={r.id}
                r={r}
                hint={s.hint}
                isNew={isNewlyAdded(r.created_at)}
              />
            ))}
          </div>
        </section>
      )}

      {/* === 필터 + 리스트 === */}
      <section className="max-w-7xl mx-auto px-4 pb-12">
        <div className="flex flex-wrap items-center gap-2 mb-5 sticky top-14 z-30 bg-[var(--background)]/95 backdrop-blur py-2 -mx-4 px-4 border-b border-[var(--border)]/60">
          <CategoryTab href={hrefFor("all", filter)} active={category === "all"} label="전체" />
          <CategoryTab href={hrefFor("pokemon", filter)} active={category === "pokemon"} label="포켓몬" />
          <CategoryTab href={hrefFor("onepiece", filter)} active={category === "onepiece"} label="원피스" />
          <CategoryTab href={hrefFor("other", filter)} active={category === "other"} label="기타" />
          <div className="ml-auto inline-flex rounded-full border border-[var(--border)] p-0.5 bg-[var(--card-bg)] text-xs font-semibold">
            <Link
              href={hrefFor(category, "active")}
              className={`px-3 py-1.5 rounded-full transition ${
                filter === "active" ? "bg-[var(--primary)] text-white" : "opacity-60 hover:opacity-100"
              }`}
            >
              진행중
            </Link>
            <Link
              href={hrefFor(category, "all")}
              className={`px-3 py-1.5 rounded-full transition ${
                filter === "all" ? "bg-[var(--primary)] text-white" : "opacity-60 hover:opacity-100"
              }`}
            >
              전체
            </Link>
          </div>
        </div>

        {visible.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[var(--border)] py-20 text-center">
            <p className="text-4xl mb-2">🎫</p>
            <p className="text-sm opacity-60">현재 표시할 응모가 없습니다.</p>
            <p className="text-[11px] opacity-40 mt-1">새 응모가 오면 알려드릴게요.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
            {visible.map(({ r, s }) => (
              <RaffleCard
                key={r.id}
                r={r}
                status={s.status}
                statusLabel={s.label}
                hint={s.hint}
                isNew={isNewlyAdded(r.created_at)}
              />
            ))}
          </div>
        )}

        {/* 면책 */}
        <p className="mt-12 text-[11px] opacity-50 leading-relaxed">
          ※ 본 페이지는 일본 아마존(Amazon.co.jp) 의 추첨판매 정보를 안내하는 큐레이션 페이지입니다.
          응모/당첨/결제/배송은 모두 Amazon.co.jp 의 정책을 따르며, 키키덜트는 응모 결과를 보증하지 않습니다.
          아마존 페이지로 이동 후 발생하는 모든 거래의 책임은 사용자 본인에게 있습니다.
        </p>
      </section>
    </div>
  );
}

// =========================================================
// 컴포넌트
// =========================================================

function hrefFor(c: Category, f: Filter): string {
  const params = new URLSearchParams();
  if (c !== "all") params.set("category", c);
  if (f !== "active") params.set("show", "all");
  const q = params.toString();
  return q ? `/raffle?${q}` : "/raffle";
}

function CategoryTab({ href, active, label }: { href: string; active: boolean; label: string }) {
  return (
    <Link
      href={href}
      className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border transition whitespace-nowrap ${
        active
          ? "bg-[var(--primary)] text-white border-[var(--primary)] shadow-sm"
          : "border-[var(--border)] opacity-70 hover:opacity-100 hover:bg-[var(--surface)]"
      }`}
    >
      {label}
    </Link>
  );
}

const INFO_TONES = {
  emerald: {
    border: "border-emerald-200",
    bg: "bg-emerald-50/60",
    chip: "bg-emerald-500",
  },
  amber: {
    border: "border-amber-200",
    bg: "bg-amber-50/60",
    chip: "bg-amber-500",
  },
  sky: {
    border: "border-sky-200",
    bg: "bg-sky-50/60",
    chip: "bg-sky-500",
  },
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
    <div
      className={`rounded-2xl border ${t.border} ${t.bg} p-4 md:p-5 flex gap-3.5 items-start`}
    >
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

function UrgentCard({
  r,
  hint,
  isNew,
}: {
  r: Raffle;
  hint: string | null;
  isNew: boolean;
}) {
  return (
    <a
      href={r.amazon_url}
      target="_blank"
      rel="noopener noreferrer sponsored"
      className="snap-start shrink-0 w-[240px] sm:w-[260px] rounded-2xl border-2 border-rose-300 bg-white overflow-hidden hover:shadow-md transition group"
    >
      <div className="relative aspect-square bg-gray-50 overflow-hidden">
        {r.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={r.image_url}
            alt={r.title}
            loading="lazy"
            className="absolute inset-0 w-full h-full object-contain p-3 group-hover:scale-[1.04] transition-transform duration-500"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-xs opacity-30">
            이미지 없음
          </div>
        )}
        {hint && (
          <span className="absolute top-2 left-2 px-2 py-1 rounded-full text-[10px] font-bold bg-rose-500 text-white shadow">
            {hint}
          </span>
        )}
        {isNew && (
          <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500 text-white shadow">
            NEW
          </span>
        )}
      </div>
      <div className="p-3">
        <p className="text-[10px] opacity-60 font-semibold tracking-wide">
          {RAFFLE_CATEGORY_LABEL[r.category]}
          {r.price_jpy != null && ` · ${formatJPY(r.price_jpy)}`}
        </p>
        <p className="text-[13px] font-bold leading-snug line-clamp-2 mt-1 min-h-[2.5em]">
          {r.title}
        </p>
      </div>
    </a>
  );
}

function RaffleCard({
  r,
  status,
  statusLabel,
  hint,
  isNew,
}: {
  r: Raffle;
  status: RaffleStatus;
  statusLabel: string;
  hint: string | null;
  isNew: boolean;
}) {
  const badgeCls = {
    open: "bg-emerald-500 text-white",
    upcoming: "bg-sky-500 text-white",
    awaiting_draw: "bg-amber-500 text-white",
    closed: "bg-gray-400 text-white",
  }[status];

  const isClickable = status !== "closed";
  const isUrgent = status === "open" && hint?.startsWith("마감 D-") && /D-(0|1|2|3)$/.test(hint);
  const cta = {
    open: "아마존 JP에서 응모하기",
    upcoming: "응모 페이지 보기",
    awaiting_draw: "응모 페이지 보기",
    closed: "응모 종료",
  }[status];

  return (
    <article
      className={`group rounded-2xl border bg-[var(--card-bg)] overflow-hidden flex flex-col transition hover:shadow-md ${
        isUrgent
          ? "border-rose-300 ring-1 ring-rose-200"
          : "border-[var(--border)]"
      } ${status === "closed" ? "opacity-70" : ""}`}
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
        <span
          className={`absolute top-2 left-2 px-2 py-1 rounded-full text-[10px] font-bold shadow-sm ${badgeCls}`}
        >
          {statusLabel}
        </span>
        {hint && (
          <span
            className={`absolute top-2 right-2 px-2 py-1 rounded-full text-[10px] font-bold shadow-sm ${
              isUrgent ? "bg-rose-500 text-white" : "bg-black/70 text-white"
            }`}
          >
            {hint}
          </span>
        )}
        {isNew && (
          <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500 text-white shadow">
            NEW
          </span>
        )}
      </div>

      {/* 본문 */}
      <div className="p-4 flex flex-col gap-2 flex-1">
        <div className="flex items-center gap-2 text-[10px] opacity-60">
          <span className="font-semibold tracking-wide">{RAFFLE_CATEGORY_LABEL[r.category]}</span>
          {r.price_jpy != null && <span>· {formatJPY(r.price_jpy)}</span>}
        </div>
        <h3 className="text-sm md:text-[15px] font-bold leading-snug line-clamp-2 min-h-[2.5em]">
          {r.title}
        </h3>
        {r.title_ja && (
          <p className="text-[11px] opacity-50 line-clamp-1">{r.title_ja}</p>
        )}

        <dl className="mt-1 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[11px]">
          <dt className="opacity-50">응모 기간</dt>
          <dd className="font-medium">
            {formatKstDate(r.apply_start_at)} ~ {formatKstDate(r.apply_end_at)}
          </dd>
          <dt className="opacity-50">추첨일</dt>
          <dd className="font-medium">{formatKstDate(r.draw_at)}</dd>
          {r.ship_note && (
            <>
              <dt className="opacity-50">발송</dt>
              <dd className="font-medium">{r.ship_note}</dd>
            </>
          )}
        </dl>

        {r.notes && (
          <p className="mt-1 text-[11px] opacity-60 line-clamp-2">{r.notes}</p>
        )}

        <div className="mt-auto pt-3">
          <a
            href={isClickable ? r.amazon_url : undefined}
            target={isClickable ? "_blank" : undefined}
            rel={isClickable ? "noopener noreferrer sponsored" : undefined}
            aria-disabled={!isClickable}
            className={`block text-center px-3 py-2.5 rounded-lg text-xs font-bold transition ${
              isClickable
                ? isUrgent
                  ? "bg-rose-500 text-white hover:bg-rose-600"
                  : "bg-[var(--primary)] text-white hover:opacity-90"
                : "bg-gray-200 text-gray-500 cursor-not-allowed"
            }`}
          >
            {cta}
            {isClickable && (
              <span className="ml-1 opacity-80" aria-hidden>↗</span>
            )}
          </a>
        </div>
      </div>
    </article>
  );
}
