"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

interface SetOption {
  id: string;
  name: string;
  region: string | null;
}

const RARITY_OPTIONS = [
  "Common", "Uncommon", "Rare", "Double Rare", "Illustration Rare",
  "Special Illustration Rare", "Hyper Rare", "Ultra Rare", "Secret Rare", "ACE SPEC Rare", "Promo",
];

const POKEMON_TYPES = [
  "Colorless", "Darkness", "Dragon", "Fairy", "Fighting", "Fire",
  "Grass", "Lightning", "Metal", "Psychic", "Water",
];

export default function ManualCardForm({ sets }: { sets: SetOption[] }) {
  const router = useRouter();

  // form state
  const [name, setName] = useState("");
  const [nameJa, setNameJa] = useState("");
  const [region, setRegion] = useState<"en" | "jp" | "kr">("kr");
  const [setMode, setSetMode] = useState<"existing" | "new" | "none">("existing");
  const [setId, setSetId] = useState("");
  const [newSetName, setNewSetName] = useState("");
  const [number, setNumber] = useState("");
  const [rarity, setRarity] = useState("");
  const [rarityJa, setRarityJa] = useState("");
  const [supertype, setSupertype] = useState<"" | "Pokémon" | "Trainer" | "Energy">("");
  const [hp, setHp] = useState("");
  const [types, setTypes] = useState<string[]>([]);
  const [artist, setArtist] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState("");
  const [filePreview, setFilePreview] = useState<string | null>(null);

  // submit state
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [success, setSuccess] = useState<string | null>(null);

  // region에 맞는 세트만
  const filteredSets = useMemo(() => sets.filter((s) => (s.region ?? "en") === region), [sets, region]);

  function toggleType(t: string) {
    setTypes((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  }

  function pickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    if (f) {
      setFilePreview(URL.createObjectURL(f));
      setImageUrl("");
    } else {
      setFilePreview(null);
    }
  }

  function validate(): string[] {
    const errs: string[] = [];
    if (!name.trim()) errs.push("카드 이름은 필수");
    if (!["en", "jp", "kr"].includes(region)) errs.push("에디션 선택 필요");
    if (setMode === "new" && !newSetName.trim()) errs.push("새 세트 이름 입력 필요");
    if (setMode === "existing" && !setId) errs.push("세트 선택 필요 (또는 '신규 만들기' / '미지정' 선택)");
    if (hp && !/^\d{1,4}$/.test(hp)) errs.push("HP는 숫자만");
    if (file && file.size > 5 * 1024 * 1024) errs.push("이미지 5MB 이하");
    if (file && !["image/png", "image/jpeg", "image/webp"].includes(file.type)) errs.push("PNG/JPEG/WEBP만 가능");
    if (imageUrl && file) errs.push("이미지 파일 또는 URL 중 하나만 선택");
    if (imageUrl && !/^https?:\/\//.test(imageUrl)) errs.push("이미지 URL은 http(s)://로 시작");
    return errs;
  }

  async function submit() {
    const errs = validate();
    if (errs.length > 0) {
      setErrors(errs);
      return;
    }
    setErrors([]);
    setSuccess(null);
    setSubmitting(true);

    const form = new FormData();
    form.append("name", name.trim());
    if (nameJa.trim()) form.append("name_ja", nameJa.trim());
    form.append("region", region);
    if (setMode === "existing") form.append("set_id", setId);
    else if (setMode === "new") form.append("new_set_name", newSetName.trim());
    if (number.trim()) form.append("number", number.trim());
    if (rarity) form.append("rarity", rarity);
    if (rarityJa.trim()) form.append("rarity_ja", rarityJa.trim());
    if (supertype) form.append("supertype", supertype);
    if (hp.trim()) form.append("hp", hp.trim());
    if (types.length > 0) form.append("types", types.join(","));
    if (artist.trim()) form.append("artist", artist.trim());
    if (file) form.append("image", file);
    else if (imageUrl.trim()) form.append("image_url", imageUrl.trim());

    try {
      const resp = await fetch("/api/cards/manual", { method: "POST", body: form });
      const json = await resp.json();
      if (!resp.ok) {
        setErrors([json.error ?? "추가 실패"]);
      } else {
        setSuccess(json.cardId);
        // 폼 초기화
        setName(""); setNameJa(""); setNumber(""); setRarity(""); setRarityJa("");
        setSupertype(""); setHp(""); setTypes([]); setArtist("");
        setFile(null); setFilePreview(null); setImageUrl("");
        setNewSetName("");
      }
    } catch (e) {
      setErrors([e instanceof Error ? e.message : "네트워크 오류"]);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm opacity-60">필요한 정보만 입력하고 저장하세요. 이름과 에디션만 필수.</p>

      {/* 기본 정보 */}
      <div className="rounded-lg border border-[var(--border)] p-4 bg-[var(--card-bg)]">
        <h3 className="text-sm font-semibold mb-3">기본 정보</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="카드 이름 *">
            <input value={name} onChange={(e) => setName(e.target.value)} className={inp} placeholder="예: 메가개굴닌자 ex" />
          </Field>
          <Field label="현지어/일본어 이름 (선택)">
            <input value={nameJa} onChange={(e) => setNameJa(e.target.value)} className={inp} placeholder="예: メガゲッコウガex" />
          </Field>
          <Field label="에디션 *">
            <select value={region} onChange={(e) => setRegion(e.target.value as "en" | "jp" | "kr")} className={inp}>
              <option value="kr">한국판 (KR)</option>
              <option value="jp">일본판 (JP)</option>
              <option value="en">북미판 (EN)</option>
            </select>
          </Field>
          <Field label="카드 종류 (선택)">
            <select value={supertype} onChange={(e) => setSupertype(e.target.value as "" | "Pokémon" | "Trainer" | "Energy")} className={inp}>
              <option value="">-</option>
              <option value="Pokémon">포켓몬</option>
              <option value="Trainer">트레이너</option>
              <option value="Energy">에너지</option>
            </select>
          </Field>
        </div>
      </div>

      {/* 세트 */}
      <div className="rounded-lg border border-[var(--border)] p-4 bg-[var(--card-bg)]">
        <h3 className="text-sm font-semibold mb-3">세트</h3>
        <div className="flex flex-wrap gap-2 mb-3">
          <ModeBtn active={setMode === "existing"} onClick={() => setSetMode("existing")}>기존 선택</ModeBtn>
          <ModeBtn active={setMode === "new"} onClick={() => setSetMode("new")}>신규 만들기</ModeBtn>
          <ModeBtn active={setMode === "none"} onClick={() => setSetMode("none")}>미지정 (custom)</ModeBtn>
        </div>
        {setMode === "existing" && (
          <select value={setId} onChange={(e) => setSetId(e.target.value)} className={inp}>
            <option value="">{`-- ${region.toUpperCase()} 세트 선택 (${filteredSets.length}개)`}</option>
            {filteredSets.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        )}
        {setMode === "new" && (
          <input
            value={newSetName}
            onChange={(e) => setNewSetName(e.target.value)}
            className={inp}
            placeholder="새 세트 이름 (예: 메가 닌자스피너)"
          />
        )}
      </div>

      {/* 카드 정보 */}
      <div className="rounded-lg border border-[var(--border)] p-4 bg-[var(--card-bg)]">
        <h3 className="text-sm font-semibold mb-3">카드 정보</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="카드 번호">
            <input value={number} onChange={(e) => setNumber(e.target.value)} className={inp} placeholder="예: 045/198 또는 260/SV-P" />
          </Field>
          <Field label="HP (포켓몬일 때)">
            <input value={hp} onChange={(e) => setHp(e.target.value)} className={inp} placeholder="예: 350" inputMode="numeric" />
          </Field>
          <Field label="레어리티 (영문)">
            <select value={rarity} onChange={(e) => setRarity(e.target.value)} className={inp}>
              <option value="">-</option>
              {RARITY_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </Field>
          <Field label="레어리티 약자 (현지)">
            <input value={rarityJa} onChange={(e) => setRarityJa(e.target.value)} className={inp} placeholder="예: SAR, RR, AR" />
          </Field>
          <Field label="일러스트레이터">
            <input value={artist} onChange={(e) => setArtist(e.target.value)} className={inp} placeholder="예: takuyoa" />
          </Field>
        </div>

        {supertype === "Pokémon" && (
          <div className="mt-3">
            <p className="text-xs opacity-60 mb-2">타입 (다중 선택)</p>
            <div className="flex flex-wrap gap-1.5">
              {POKEMON_TYPES.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => toggleType(t)}
                  className={`px-2.5 py-1 text-xs rounded-full border ${
                    types.includes(t) ? "bg-[var(--primary)] text-white border-transparent" : "border-[var(--border)]"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 이미지 */}
      <div className="rounded-lg border border-[var(--border)] p-4 bg-[var(--card-bg)]">
        <h3 className="text-sm font-semibold mb-3">이미지</h3>
        <div className="grid grid-cols-1 md:grid-cols-[160px_1fr] gap-4 items-start">
          <div className="aspect-[2.5/3.5] rounded-lg border border-[var(--border)] bg-gray-50 flex items-center justify-center overflow-hidden">
            {filePreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={filePreview} alt="preview" className="w-full h-full object-contain" />
            ) : imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imageUrl} alt="preview" className="w-full h-full object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
            ) : (
              <span className="text-xs opacity-40">미리보기</span>
            )}
          </div>
          <div className="space-y-3">
            <Field label="파일 업로드 (PNG/JPEG/WEBP, 5MB 이하)">
              <input type="file" accept="image/png,image/jpeg,image/webp" onChange={pickFile} className="text-sm" />
            </Field>
            <p className="text-xs opacity-50 text-center">— 또는 —</p>
            <Field label="이미지 URL">
              <input
                value={imageUrl}
                onChange={(e) => { setImageUrl(e.target.value); setFile(null); setFilePreview(null); }}
                className={inp}
                placeholder="https://..."
              />
            </Field>
          </div>
        </div>
      </div>

      {/* errors / success */}
      {errors.length > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <ul className="list-disc list-inside">
            {errors.map((e) => <li key={e}>{e}</li>)}
          </ul>
        </div>
      )}
      {success && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700 flex items-center justify-between">
          <span>추가 완료: <code className="font-mono text-xs">{success}</code></span>
          <button
            onClick={() => router.push(`/card/${success}`)}
            className="px-3 py-1 rounded bg-green-600 text-white text-xs"
          >
            카드 보기
          </button>
        </div>
      )}

      <div className="flex justify-end gap-2">
        <button
          onClick={submit}
          disabled={submitting}
          className="px-6 py-2.5 rounded-lg bg-[var(--primary)] text-white font-medium hover:opacity-90 disabled:opacity-50"
        >
          {submitting ? "저장 중..." : "카드 추가"}
        </button>
      </div>
    </div>
  );
}

const inp = "w-full px-3 py-2 rounded border border-[var(--border)] bg-[var(--background)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs opacity-60 mb-1">{label}</span>
      {children}
    </label>
  );
}

function ModeBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 text-xs rounded-full border ${active ? "bg-[var(--primary)] text-white border-transparent" : "border-[var(--border)] hover:bg-[var(--border)]"}`}
    >
      {children}
    </button>
  );
}
