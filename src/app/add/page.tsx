export const dynamic = "force-dynamic";

import { createServerClient } from "@/lib/supabase/server";
import AddTabs from "./tabs";

export default async function AddPage() {
  const supabase = createServerClient();
  const { data: sets } = await supabase
    .from("sets")
    .select("id, name, region")
    .order("region", { ascending: true })
    .order("name", { ascending: true });

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <h1 className="text-xl font-bold mb-4">카드 추가</h1>
      <AddTabs sets={sets ?? []} />
    </div>
  );
}
