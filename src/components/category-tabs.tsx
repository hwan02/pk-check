import Link from "next/link";

interface Props {
  current: string;
  basePath: string;
  sort?: string;
  q?: string;
}

const TABS: { value: string; label: string }[] = [
  { value: "", label: "전체" },
  { value: "pokemon", label: "포켓몬" },
  { value: "onepiece", label: "원피스" },
];

export default function CategoryTabs({ current, basePath, sort, q }: Props) {
  function buildHref(value: string) {
    const sp = new URLSearchParams();
    if (value) sp.set("category", value);
    if (sort) sp.set("sort", sort);
    if (q) sp.set("q", q);
    const s = sp.toString();
    return s ? `${basePath}?${s}` : basePath;
  }

  return (
    <div className="flex items-center gap-1 border-b border-[var(--border)]">
      {TABS.map((t) => {
        const active = current === t.value;
        return (
          <Link
            key={t.value || "all"}
            href={buildHref(t.value)}
            className={`px-4 py-2 text-sm border-b-2 -mb-px transition ${
              active
                ? "border-[var(--primary)] text-[var(--primary)] font-semibold"
                : "border-transparent opacity-60 hover:opacity-100"
            }`}
          >
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}
