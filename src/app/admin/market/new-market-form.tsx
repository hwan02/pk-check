"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PARENT_TYPE_OF, PRODUCT_TYPE_LABEL, type ProductType } from "@/lib/market";

interface ParentOpt {
  id: string;
  name: string;
  product_type: "box" | "pack" | "single";
  category: "pokemon" | "onepiece";
}

export default function NewMarketCardForm({ parentOptions = [] }: { parentOptions?: ParentOpt[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const [category, setCategory] = useState<"pokemon" | "onepiece">("pokemon");
  const [productType, setProductType] = useState<ProductType>("single");
  const [parentId, setParentId] = useState("");
  const [name, setName] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [setNameField, setSetNameField] = useState("");
  const [rarity, setRarity] = useState("");
  const [order, setOrder] = useState("0");
  const [listPrice, setListPrice] = useState("");
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // 현재 타입에서 허용되는 부모 타입 (single→pack, pack→box) 만 필터, 같은 카테고리만
  const allowedParents = useMemo(() => {
    const need = PARENT_TYPE_OF[productType];
    if (!need) return [];
    return parentOptions.filter((p) => p.product_type === need && p.category === category);
  }, [productType, category, parentOptions]);

  function pickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    setPreview(f ? URL.createObjectURL(f) : null);
  }

  function reset() {
    setName("");
    setNameEn("");
    setSetNameField("");
    setRarity("");
    setOrder("0");
    setListPrice("");
    setNotes("");
    setFile(null);
    setPreview(null);
    setErrors([]);
    setProductType("single");
    setParentId("");
  }

  function validate(): string[] {
    const errs: string[] = [];
    if (!name.trim()) errs.push("이름 필수");
    if (file) {
      if (file.size > 5 * 1024 * 1024) errs.push("이미지 5MB 이하");
      if (!["image/png", "image/jpeg", "image/webp"].includes(file.type))
        errs.push("PNG/JPEG/WEBP 만");
    }
    return errs;
  }

  async function submit() {
    const errs = validate();
    if (errs.length > 0) {
      setErrors(errs);
      return;
    }
    setErrors([]);
    setSubmitting(true);
    const form = new FormData();
    form.append("category", category);
    form.append("product_type", productType);
    if (parentId) form.append("parent_id", parentId);
    form.append("name", name.trim());
    if (nameEn.trim()) form.append("name_en", nameEn.trim());
    if (setNameField.trim()) form.append("set_name", setNameField.trim());
    if (rarity.trim()) form.append("rarity", rarity.trim());
    if (notes.trim()) form.append("notes", notes.trim());
    form.append("display_order", order);
    if (listPrice.trim()) form.append("list_price_krw", listPrice.trim());
    if (file) form.append("image", file);
    try {
      const resp = await fetch("/api/admin/market", { method: "POST", body: form });
      const json = await resp.json();
      if (!resp.ok) {
        setErrors([json.error ?? "등록 실패"]);
      } else {
        reset();
        setOpen(false);
        router.refresh();
      }
    } catch (e) {
      setErrors([e instanceof Error ? e.message : "네트워크 오류"]);
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="px-4 py-2 rounded-lg bg-[var(--primary)] text-white text-sm font-medium hover:opacity-90"
      >
        + 새 시세 카드 등록
      </button>
    );
  }

  return (
    <div className="rounded-lg border border-[var(--border)] p-4 bg-[var(--card-bg)]">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold">새 시세 카드 등록</h3>
        <button onClick={() => setOpen(false)} className="text-xs opacity-60 hover:opacity-100">
          닫기
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[180px_1fr] gap-4 items-start">
        <div className="aspect-square rounded-lg border border-[var(--border)] bg-gray-50 flex items-center justify-center overflow-hidden">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="preview" className="max-w-full max-h-full object-contain" />
          ) : (
            <span className="text-xs opacity-40">이미지 미리보기</span>
          )}
        </div>
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="카테고리 *">
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as "pokemon" | "onepiece")}
                className={inp}
              >
                <option value="pokemon">포켓몬</option>
                <option value="onepiece">원피스</option>
              </select>
            </Field>
            <Field label="상품 타입 *">
              <select
                value={productType}
                onChange={(e) => {
                  setProductType(e.target.value as ProductType);
                  setParentId("");
                }}
                className={inp}
              >
                {(["single", "pack", "box"] as ProductType[]).map((t) => (
                  <option key={t} value={t}>
                    {PRODUCT_TYPE_LABEL[t]}
                  </option>
                ))}
              </select>
            </Field>
            {PARENT_TYPE_OF[productType] && (
              <Field label={`소속 ${PRODUCT_TYPE_LABEL[PARENT_TYPE_OF[productType]!]} (선택)`}>
                <select value={parentId} onChange={(e) => setParentId(e.target.value)} className={inp}>
                  <option value="">— 없음 —</option>
                  {allowedParents.length === 0 ? (
                    <option disabled>먼저 {PRODUCT_TYPE_LABEL[PARENT_TYPE_OF[productType]!]} 을(를) 등록하세요</option>
                  ) : (
                    allowedParents.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))
                  )}
                </select>
              </Field>
            )}
            <Field label="이름 (한국어) *">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={inp}
                placeholder="메가리자몽Y ex"
              />
            </Field>
            <Field label="이름 (영어/일어)">
              <input
                value={nameEn}
                onChange={(e) => setNameEn(e.target.value)}
                className={inp}
                placeholder="Mega Charizard Y ex"
              />
            </Field>
            <Field label="세트명">
              <input
                value={setNameField}
                onChange={(e) => setSetNameField(e.target.value)}
                className={inp}
                placeholder="메가 진화 / SV3"
              />
            </Field>
            <Field label="등급/레어">
              <input
                value={rarity}
                onChange={(e) => setRarity(e.target.value)}
                className={inp}
                placeholder="SAR"
              />
            </Field>
            <Field label="정가 (원, 선택)">
              <input
                value={listPrice}
                onChange={(e) => setListPrice(e.target.value.replace(/[^0-9]/g, ""))}
                className={inp}
                placeholder="5500"
                inputMode="numeric"
              />
            </Field>
            <Field label="노출 순서">
              <input
                value={order}
                onChange={(e) => setOrder(e.target.value)}
                className={inp}
                placeholder="0"
                inputMode="numeric"
              />
            </Field>
          </div>
          <Field label="메모 (선택)">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className={`${inp} h-16 resize-none`}
              placeholder="최근 급등 / 한정판 등"
            />
          </Field>
          <Field label="이미지 (PNG/JPEG/WEBP, 5MB 이하)">
            <input type="file" accept="image/png,image/jpeg,image/webp" onChange={pickFile} className="text-sm" />
          </Field>
        </div>
      </div>

      {errors.length > 0 && (
        <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-2 text-xs text-red-700">
          <ul className="list-disc list-inside">
            {errors.map((e) => <li key={e}>{e}</li>)}
          </ul>
        </div>
      )}

      <div className="mt-4 flex justify-end gap-2">
        <button
          onClick={() => {
            reset();
            setOpen(false);
          }}
          className="px-4 py-2 text-sm rounded-lg border border-[var(--border)]"
        >
          취소
        </button>
        <button
          onClick={submit}
          disabled={submitting}
          className="px-4 py-2 text-sm rounded-lg bg-[var(--primary)] text-white disabled:opacity-50"
        >
          {submitting ? "저장 중..." : "등록"}
        </button>
      </div>
    </div>
  );
}

const inp =
  "w-full px-3 py-2 rounded border border-[var(--border)] bg-[var(--background)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs opacity-60 mb-1">{label}</span>
      {children}
    </label>
  );
}
