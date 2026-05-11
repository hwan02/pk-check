export const dynamic = "force-dynamic";

import { createServerClient } from "@/lib/supabase/server";
import SetLogoEditor from "./editor";

export default async function AdminSetsPage() {
  const supabase = createServerClient();
  const { data: sets } = await supabase
    .from("sets")
    .select("id, name, region, logo_url, symbol_url")
    .order("region", { ascending: true })
    .order("name", { ascending: true });

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-2">세트 로고 관리</h1>
      <p className="text-sm opacity-60 mb-6">
        팩 박스 이미지를 업로드하거나 URL을 붙여넣으세요. 비워두고 저장하면 로고가 삭제됩니다.
      </p>
      <div className="space-y-2">
        {(sets ?? []).map((s) => (
          <SetLogoEditor key={s.id} set={s} />
        ))}
      </div>
    </div>
  );
}
