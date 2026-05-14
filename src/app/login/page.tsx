import Link from "next/link";
import { redirect } from "next/navigation";
import { createSsrClient } from "@/lib/supabase/ssr";
import LoginForm from "./login-form";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const supabase = await createSsrClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect("/");

  return (
    <div className="max-w-sm mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold mb-6">로그인</h1>
      <LoginForm />
      <p className="text-sm opacity-60 mt-4 text-center">
        계정이 없으신가요?{" "}
        <Link href="/signup" className="text-[var(--primary)] hover:underline">
          회원가입
        </Link>
      </p>
    </div>
  );
}