import { NextResponse } from "next/server";
import { createSsrClient } from "@/lib/supabase/ssr";

export async function POST(request: Request) {
  const supabase = await createSsrClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/", request.url), { status: 303 });
}