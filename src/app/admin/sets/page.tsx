export const dynamic = "force-dynamic";

import { createServerClient } from "@/lib/supabase/server";
import SetLogoEditor from "./editor";
import NewSetForm from "./new-set-form";

export default async function AdminSetsPage() {
  const supabase = createServerClient();
  const { data: sets } = await supabase
    .from("sets")
    .select("id, name, region, logo_url, symbol_url")
    .order("region", { ascending: true })
    .order("name", { ascending: true });

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-2">세트 관리</h1>
      <p className="text-sm opacity-60 mb-6">
        새 세트를 추가하거나 기존 세트의 로고를 갱신할 수 있어요.
      </p>

      <NewSetForm />

      <div className="space-y-2">
        {(sets ?? []).map((s) => (
          <SetLogoEditor key={s.id} set={s} />
        ))}
      </div>
    </div>
  );
}
