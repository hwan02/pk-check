import Link from "next/link";
import { redirect } from "next/navigation";
import { createSsrClient } from "@/lib/supabase/ssr";
import SignupForm from "./signup-form";

export const dynamic = "force-dynamic";

export default async function SignupPage() {
  const supabase = await createSsrClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect("/");

  return (
    <div className="max-w-sm mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold mb-6">회원가입</h1>
      <SignupForm />
      <p className="text-sm opacity-60 mt-4 text-center">
        이미 계정이 있으신가요?{" "}
        <Link href="/login" className="text-[var(--primary)] hover:underline">
          로그인
        </Link>
      </p>
    </div>
  );
}