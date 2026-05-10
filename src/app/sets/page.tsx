export const dynamic = "force-dynamic";

import { createServerClient } from "@/lib/supabase/server";
import SetsList from "@/components/sets-list";

export const metadata = {
  title: "세트 목록 - 포포시세",
};

export default async function SetsPage() {
  const supabase = createServerClient();

  const { data: sets } = await supabase
    .from("sets")
    .select("*")
    .order("release_date", { ascending: false });

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">세트 목록</h1>
      <SetsList sets={sets ?? []} />
    </div>
  );
}
