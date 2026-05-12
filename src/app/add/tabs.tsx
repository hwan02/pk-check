"use client";

import { useState } from "react";
import SnkrSearch from "./snkr-search";
import ManualCardForm from "./manual-form";

interface SetOption {
  id: string;
  name: string;
  region: string | null;
}

export default function AddTabs({ sets }: { sets: SetOption[] }) {
  const [tab, setTab] = useState<"manual" | "snkr">("manual");

  return (
    <div>
      <div className="flex gap-2 mb-6 border-b border-[var(--border)]">
        <TabBtn active={tab === "manual"} onClick={() => setTab("manual")}>직접 입력</TabBtn>
        <TabBtn active={tab === "snkr"} onClick={() => setTab("snkr")}>snkrdunk 검색</TabBtn>
      </div>

      {tab === "manual" ? <ManualCardForm sets={sets} /> : <SnkrSearch />}
    </div>
  );
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 text-sm font-medium border-b-2 -mb-[2px] transition ${
        active
          ? "border-[var(--primary)] text-[var(--primary)]"
          : "border-transparent opacity-60 hover:opacity-100"
      }`}
    >
      {children}
    </button>
  );
}
