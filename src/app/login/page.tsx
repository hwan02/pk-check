import Link from "next/link";
import { redirect } from "next/navigation";
import { createSsrClient } from "@/lib/supabase/ssr";
import LoginForm from "./login-form";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<Record<string, string | undefined>>;
}

function safeRedirect(value: string | undefined): string {
  if (!value) return "/";
  // 내부 경로만 허용 (open-redirect 방지)
  if (!value.startsWith("/") || value.startsWith("//")) return "/";
  return value;
}

export default async function LoginPage({ searchParams }: Props) {
  const params = await searchParams;
  const target = safeRedirect(params.redirect);

  const supabase = await createSsrClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect(target);

  return (
    <div className="max-w-sm mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold mb-6">로그인</h1>
      <LoginForm redirectTo={target} />
      <p className="text-sm opacity-60 mt-4 text-center">
        계정이 없으신가요?{" "}
        <Link href="/signup" className="text-[var(--primary)] hover:underline">
          회원가입
        </Link>
      </p>
    </div>
  );
}
