export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import { createSsrClient } from "@/lib/supabase/ssr";
import ProfileForm from "./profile-form";
import AddressesManager from "../addresses/addresses-manager";
import type { ShippingAddress } from "@/lib/addresses";

export default async function ProfileEditPage() {
  const supabase = await createSsrClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirect=/mypage/profile");

  const [{ data: profile }, { data: addresses }] = await Promise.all([
    supabase
      .from("profiles")
      .select("name, email, customs_id_no, phone")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("shipping_addresses")
      .select(
        "id, user_id, label, recipient_name, phone, country, postal_code, address1, address2, is_default, created_at, updated_at",
      )
      .eq("user_id", user.id)
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: false }),
  ]);

  return (
    <div className="max-w-xl mx-auto px-4 py-6">
      <nav className="text-xs opacity-60 mb-4 flex items-center gap-1.5">
        <Link href="/mypage" className="hover:opacity-100">My Page</Link>
        <span>/</span>
        <span className="opacity-80">회원정보 수정</span>
      </nav>

      <h1 className="text-2xl font-bold tracking-tight mb-6">회원정보 수정</h1>

      <ProfileForm
        defaultName={profile?.name ?? ""}
        email={profile?.email ?? user.email ?? ""}
        defaultCustomsIdNo={profile?.customs_id_no ?? ""}
        defaultPhone={profile?.phone ?? ""}
      />

      <div className="mt-8">
        <h2 className="text-xs font-semibold tracking-widest uppercase opacity-60 mb-3">배송지</h2>
        <AddressesManager initial={(addresses ?? []) as ShippingAddress[]} />
      </div>
    </div>
  );
}
