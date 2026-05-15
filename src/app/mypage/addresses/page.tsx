export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import { createSsrClient } from "@/lib/supabase/ssr";
import AddressesManager from "./addresses-manager";
import type { ShippingAddress } from "@/lib/addresses";

export default async function AddressesPage() {
  const supabase = await createSsrClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirect=/mypage/addresses");

  const { data: addresses } = await supabase
    .from("shipping_addresses")
    .select(
      "id, user_id, label, recipient_name, phone, country, postal_code, address1, address2, is_default, created_at, updated_at",
    )
    .eq("user_id", user.id)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: false });

  return (
    <div className="max-w-xl mx-auto px-4 py-6">
      <nav className="text-xs opacity-60 mb-4 flex items-center gap-1.5">
        <Link href="/mypage" className="hover:opacity-100">My Page</Link>
        <span>/</span>
        <span className="opacity-80">배송지 관리</span>
      </nav>

      <h1 className="text-2xl font-bold tracking-tight mb-6">배송지 관리</h1>

      <AddressesManager initial={(addresses ?? []) as ShippingAddress[]} />
    </div>
  );
}
