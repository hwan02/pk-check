"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  MARKET_CATEGORY_LABEL,
  PARENT_TYPES_OF,
  PRODUCT_TYPE_LABEL,
  type MarketCard,
  type ProductType,
} from "@/lib/market";
import type { ParentOpt } from "./row-actions";

const TYPE_COLORS: Record<ProductType, string> = {
  box: "bg-amber-100 text-amber-900",
  pack: "bg-sky-100 text-sky-900",
  single: "bg-violet-100 text-violet-900",
};

export default function EditCardModal({
  card,
  parentOptions,
  onClose,
}: {
  card: MarketCard;
  parentOptions: ParentOpt[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [name, setName] = useState(card.name);
  const [nameEn, setNameEn] = useState(card.name_en ?? "");
  const [setNameField, setSetNameField] = useState(card.set_name ?? "");
  const [rarity, setRarity] = useState(card.rarity ?? "");
  const [category, setCategory] = useState(card.category);
  const [productType, setProductType] = useState(card.product_type);
  const [parentId, setParentId] = useState(card.parent_id ?? "");
  const [notes, setNotes] = useState(card.notes ?? "");
  const [listPrice, setListPrice] = useState(
    card.list_price_krw != null ? String(card.list_price_krw) : "",
  );
  const [imageUrl, setImageUrl] = useState(card.image_url);

  const [saving, setSaving] = useState(false);
  const [imgBusy, setImgBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const needTypes = PARENT_TYPES_OF[productType];
  const allowedParents = parentOptions.filter(
    (p) => needTypes.includes(p.product_type) && p.category === category && p.id !== card.id,
  );

  async function uploadImage(file: File) {
    if (file.size > 5 * 1024 * 1024) { alert("이미지 5MB 이하"); return; }
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      alert("PNG/JPEG/WEBP 만");
      return;
    }
    setImgBusy(true);
    const form = new FormData();
    form.append("image", file);
    const resp = await fetch(`/api/admin/market/${card.id}/image`, { method: "POST", body: form });
    setImgBusy(false);
    if (resp.ok) {
      const j = await resp.json();
      setImageUrl(j.image_url);
      router.refresh();
    } else {
      const j = await resp.json().catch(() => ({}));
      alert(`업로드 실패: ${j.error ?? resp.statusText}`);
    }
  }

  async function removeImage() {
    if (!confirm("이미지를 제거할까요?")) return;
    setImgBusy(true);
    const resp = await fetch(`/api/admin/market/${card.id}/image`, { method: "DELETE" });
    setImgBusy(false);
    if (resp.ok) {
      setImageUrl(null);
      router.refresh();
    }
  }

  function diffPayload(): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    if (name.trim() !== card.name) out.name = name.trim();
    if ((nameEn || "").trim() !== (card.name_en ?? "")) out.name_en = nameEn.trim();
    if ((setNameField || "").trim() !== (card.set_name ?? "")) out.set_name = setNameField.trim();
    if ((rarity || "").trim() !== (card.rarity ?? "")) out.rarity = rarity.trim();
    if ((notes || "").trim() !== (card.notes ?? "")) out.notes = notes.trim();
    if (category !== card.category) out.category = category;
    if (productType !== card.product_type) {
      out.product_type = productType;
      if (productType === "box") out.parent_id = null;
    }
    const pid = parentId || null;
    if (pid !== (card.parent_id ?? null)) out.parent_id = pid;
    // 정가
    const lpClean = listPrice.replace(/[^0-9]/g, "");
    const lpVal = lpClean === "" ? null : parseInt(lpClean, 10);
    if (lpVal !== (card.list_price_krw ?? null)) out.list_price_krw = lpVal;
    return out;
  }

  async function save() {
    const payload = diffPayload();
    if (Object.keys(payload).length === 0) { onClose(); return; }
    setSaving(true);
    const resp = await fetch(`/api/admin/market/${card.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSaving(false);
    if (resp.ok) {
      router.refresh();
      onClose();
    } else {
      const j = await resp.json().catch(() => ({}));
      alert(`저장 실패: ${j.error ?? resp.statusText}`);
    }
  }

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      className="fixed inset-0 z-[90] bg-black/60 backdrop-blur-sm flex items-start sm:items-center justify-center p-4 overflow-y-auto"
    >
      <div className="bg-[var(--background)] w-full max-w-2xl rounded-2xl border border-[var(--border)] shadow-xl my-6">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--border)]">
          <h3 className="text-sm font-semibold">시세 카드 수정</h3>
          <button onClick={onClose} className="text-xs opacity-60 hover:opacity-100" aria-label="닫기 (ESC)">
            닫기 (ESC)
          </button>
        </div>

        <div className="p-5 grid grid-cols-1 md:grid-cols-[200px_1fr] gap-5">
          {/* 이미지 영역 */}
          <div>
            <div className="aspect-square rounded-lg overflow-hidden bg-gray-50 border border-[var(--border)] relative">
              {imageUrl ? (
                <Image src={imageUrl} alt={name} fill className="object-contain" sizes="200px" />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-xs opacity-40">
                  이미지 없음
                </div>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) uploadImage(f);
                e.target.value = "";
              }}
            />
            <div className="flex gap-1.5 mt-2">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={imgBusy}
                className="flex-1 text-xs py-1.5 rounded border border-[var(--border)] hover:bg-[var(--surface)] disabled:opacity-50"
              >
                {imgBusy ? "..." : imageUrl ? "교체" : "업로드"}
              </button>
              {imageUrl && (
                <button
                  type="button"
                  onClick={removeImage}
                  disabled={imgBusy}
                  className="text-xs px-3 rounded border border-red-200 text-red-700 hover:bg-red-50 disabled:opacity-50"
                >
                  제거
                </button>
              )}
            </div>
            <p className="text-[10px] opacity-50 mt-2">PNG/JPEG/WEBP · 5MB 이하</p>
          </div>

          {/* 필드 영역 */}
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <Field label="카테고리">
                <select value={category} onChange={(e) => setCategory(e.target.value as MarketCard["category"])} className={inp}>
                  {(["pokemon", "onepiece"] as const).map((c) => (
                    <option key={c} value={c}>{MARKET_CATEGORY_LABEL[c]}</option>
                  ))}
                </select>
              </Field>
              <Field label="상품 타입">
                <select
                  value={productType}
                  onChange={(e) => setProductType(e.target.value as ProductType)}
                  className={`${inp} font-semibold ${TYPE_COLORS[productType]}`}
                >
                  {(["box", "pack", "single"] as ProductType[]).map((t) => (
                    <option key={t} value={t}>{PRODUCT_TYPE_LABEL[t]}</option>
                  ))}
                </select>
              </Field>
            </div>

            <Field label="이름 *">
              <input value={name} onChange={(e) => setName(e.target.value)} className={inp} placeholder="메가리자몽Y ex" />
            </Field>

            <Field label="이름 (영어/일어)">
              <input value={nameEn} onChange={(e) => setNameEn(e.target.value)} className={inp} placeholder="Mega Charizard Y ex" />
            </Field>

            <div className="grid grid-cols-[1.5fr_1fr] gap-2">
              <Field label="세트명">
                <input value={setNameField} onChange={(e) => setSetNameField(e.target.value)} className={inp} placeholder="MEGA 확장팩 「인페르노X」" />
              </Field>
              <Field label="등급/레어">
                <input value={rarity} onChange={(e) => setRarity(e.target.value)} className={inp} placeholder="SAR" />
              </Field>
            </div>

            <Field label="정가 (원, 선택)">
              <input
                value={listPrice}
                onChange={(e) => setListPrice(e.target.value.replace(/[^0-9]/g, ""))}
                className={inp}
                placeholder="5500"
                inputMode="numeric"
              />
            </Field>

            {needTypes.length > 0 && (
              <Field label={`부모 (${needTypes.map((t) => PRODUCT_TYPE_LABEL[t]).join("/")})`}>
                <select value={parentId} onChange={(e) => setParentId(e.target.value)} className={inp}>
                  <option value="">— 미지정 —</option>
                  {allowedParents.map((p) => (
                    <option key={p.id} value={p.id}>
                      [{PRODUCT_TYPE_LABEL[p.product_type]}] {p.name}
                    </option>
                  ))}
                </select>
              </Field>
            )}

            <Field label="메모">
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className={`${inp} h-16 resize-none text-xs`}
                placeholder="최근 급등 / 한정판 등"
              />
            </Field>
          </div>
        </div>

        <div className="px-5 py-3 border-t border-[var(--border)] flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-[var(--border)]">
            취소
          </button>
          <button
            onClick={save}
            disabled={saving || !name.trim()}
            className="px-4 py-2 text-sm rounded-lg bg-[var(--primary)] text-white disabled:opacity-50"
          >
            {saving ? "저장 중..." : "저장"}
          </button>
        </div>
      </div>
    </div>
  );
}

const inp =
  "w-full px-2.5 py-1.5 rounded border border-[var(--border)] bg-[var(--background)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[10px] opacity-60 mb-1">{label}</span>
      {children}
    </label>
  );
}
