"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS: { href: string; label: string; match: (p: string) => boolean }[] = [
  {
    href: "/admin/orders",
    label: "주문 관리",
    match: (p) => p.startsWith("/admin/orders"),
  },
  {
    href: "/admin/inquiries",
    label: "문의 관리",
    match: (p) => p.startsWith("/admin/inquiries"),
  },
  {
    href: "/admin/listings",
    label: "상품 관리",
    match: (p) => p.startsWith("/admin/listings"),
  },
  {
    href: "/admin/hit",
    label: "HIT 관리",
    match: (p) => p.startsWith("/admin/hit"),
  },
  {
    href: "/admin/raffle",
    label: "응모 관리",
    match: (p) => p.startsWith("/admin/raffle"),
  },
  {
    href: "/admin/magazine",
    label: "매거진 관리",
    match: (p) => p.startsWith("/admin/magazine"),
  },
];

export default function AdminNav() {
  const pathname = usePathname() || "";
  return (
    <nav className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] overflow-hidden">
      <ul>
        {ITEMS.map((it) => {
          const active = it.match(pathname);
          return (
            <li key={it.href}>
              <Link
                href={it.href}
                className={`block px-4 py-3 text-sm border-l-2 transition ${
                  active
                    ? "border-[var(--primary)] bg-[var(--surface)] font-semibold"
                    : "border-transparent opacity-70 hover:opacity-100 hover:bg-[var(--surface)]"
                }`}
              >
                {it.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
