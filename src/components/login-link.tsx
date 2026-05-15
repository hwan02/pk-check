"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface Props {
  className?: string;
  children: React.ReactNode;
}

// 현재 경로를 ?redirect= 으로 붙여 로그인 후 원래 자리로 복귀
export default function LoginLink({ className, children }: Props) {
  const pathname = usePathname() || "/";
  const target =
    pathname === "/login" || pathname === "/signup"
      ? "/login"
      : `/login?redirect=${encodeURIComponent(pathname)}`;
  return (
    <Link href={target} className={className}>
      {children}
    </Link>
  );
}
