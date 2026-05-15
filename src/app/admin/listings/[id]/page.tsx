export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import type { Listing } from "@/lib/shop";
import EditListingForm from "./edit-listing-form";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function AdminEditListingPage({ params }: Props) {
  const { id } = await params;
  const db = createServerClient();

  const { data } = await db
    .from("listings")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!data) notFound();
  const listing = data as Listing;

  return (
    <div>
      <nav className="text-xs opacity-60 mb-4 flex items-center gap-1.5">
        <Link href="/admin/listings" className="hover:opacity-100">
          상품 관리
        </Link>
        <span>/</span>
        <span className="opacity-80 truncate">{listing.title}</span>
      </nav>

      <h1 className="text-2xl font-bold tracking-tight mb-6">상품 수정</h1>

      <EditListingForm listing={listing} />
    </div>
  );
}
