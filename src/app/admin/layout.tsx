export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import { createSsrClient } from "@/lib/supabase/ssr";
import AdminNav from "./admin-nav";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createSsrClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirect=/admin/orders");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, name, email")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "admin") {
    return (
      <div className="max-w-3xl mx-auto px-4 py-10">
        <h1 className="text-xl font-bold mb-2">접근 권한 없음</h1>
        <p className="text-sm opacity-60">
          이 페이지는 관리자만 접근 가능합니다.
        </p>
        <Link href="/" className="inline-block mt-4 text-sm underline">
          홈으로
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 grid grid-cols-1 md:grid-cols-[200px_1fr] gap-6">
      <aside className="md:sticky md:top-20 md:self-start">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-4 mb-3">
          <p className="text-[10px] font-semibold tracking-widest uppercase opacity-50">
            관리자
          </p>
          <p className="text-sm font-bold mt-1 truncate">
            {profile?.name || profile?.email}
          </p>
        </div>
        <AdminNav />
      </aside>
      <main className="min-w-0">{children}</main>
    </div>
  );
}
