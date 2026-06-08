export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import { createSsrClient } from "@/lib/supabase/ssr";
import { createServerClient } from "@/lib/supabase/server";
import type { Raffle } from "@/lib/raffles";
import RaffleAdmin from "./raffle-admin";

interface PageProps {
  searchParams: Promise<{ show?: string }>;
}

export default async function AdminRafflePage({ searchParams }: PageProps) {
  const params = await searchParams;
  const includeHidden = params.show === "all";

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
  let query = admin
    .from("raffles")
    .select("*")
    .order("is_active", { ascending: false })
    .order("display_order", { ascending: true })
    .order("apply_end_at", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(500);
  if (!includeHidden) query = query.eq("is_active", true);
  const { data } = await query;
  const raffles = (data ?? []) as Raffle[];

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-2xl font-bold tracking-tight">응모 관리</h1>
        <div className="flex items-center gap-3">
          <div className="inline-flex rounded-full border border-[var(--border)] p-0.5 bg-[var(--card-bg)] text-xs font-semibold">
            <Link
              href="/admin/raffle"
              className={`px-3 py-1.5 rounded-full transition ${
                !includeHidden ? "bg-[var(--primary)] text-white" : "opacity-60 hover:opacity-100"
              }`}
            >
              노출중
            </Link>
            <Link
              href="/admin/raffle?show=all"
              className={`px-3 py-1.5 rounded-full transition ${
                includeHidden ? "bg-[var(--primary)] text-white" : "opacity-60 hover:opacity-100"
              }`}
            >
              전체
            </Link>
          </div>
          <span className="text-xs opacity-50">{raffles.length}건</span>
        </div>
      </div>

      <RaffleAdmin raffles={raffles} />
    </div>
  );
}
