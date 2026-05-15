export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import { createSsrClient } from "@/lib/supabase/ssr";
import ProfileForm from "./profile-form";

export default async function ProfileEditPage() {
  const supabase = await createSsrClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirect=/mypage/profile");

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "name, email, customs_id_no, phone, recipient_name, postal_code, address1, address2",
    )
    .eq("id", user.id)
    .maybeSingle();

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
        defaultRecipientName={profile?.recipient_name ?? ""}
        defaultPostalCode={profile?.postal_code ?? ""}
        defaultAddress1={profile?.address1 ?? ""}
        defaultAddress2={profile?.address2 ?? ""}
      />
    </div>
  );
}
