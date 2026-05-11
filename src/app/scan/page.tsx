"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import Link from "next/link";

interface Candidate {
  id: string;
  name: string;
  name_ja: string | null;
  number: string | null;
  region: string | null;
  rarity: string | null;
  rarity_ja: string | null;
  image_small: string | null;
  set: { id: string; name: string } | null;
}

// 카드 사진을 Vision API 전송 전에 적당히 축소 (긴 변 1600px).
// 카메라 원본은 4000px+라 base64 전송 + Vision 비용 낭비.
async function resizeImage(file: File, maxDim = 1600): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bitmap, 0, 0, w, h);
  return new Promise((resolve) =>
    canvas.toBlob((b) => resolve(b!), "image/jpeg", 0.9)
  );
}

export default function ScanPage() {
  const [preview, setPreview] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("");
  const [detectedInfo, setDetectedInfo] = useState<string>("");
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const lastFileRef = useRef<File | null>(null);

  async function handleFile(file: File) {
    lastFileRef.current = file;
    setLoading(true);
    setCandidates([]);
    setDetectedInfo("");
    setStatus("이미지 전송 준비 중...");
    setPreview(URL.createObjectURL(file));

    try {
      const resized = await resizeImage(file, 1600);

      setStatus("Google Vision으로 텍스트 인식 중...");
      const form = new FormData();
      form.append("file", resized, "card.jpg");
      const vRes = await fetch("/api/scan-vision", { method: "POST", body: form });
      const v = await vRes.json();
      if (!vRes.ok) {
        setStatus(`OCR 실패: ${v.error ?? "unknown"}`);
        setLoading(false);
        return;
      }

      const { number, name, rarity } = v as { number: string; name: string; rarity: string };

      if (!number && !name && !rarity) {
        setStatus("번호·이름·등급을 찾지 못했어요. 카드 전체가 잘 보이게 다시 찍어주세요.");
        setLoading(false);
        return;
      }

      const detected = [number && `번호 ${number}`, name && `이름 "${name}"`, rarity && `등급 ${rarity}`].filter(Boolean).join(" · ");
      setDetectedInfo(detected);
      setStatus("DB 검색 중...");

      const params = new URLSearchParams();
      if (number) params.set("number", number);
      if (name) params.set("name", name);
      if (rarity) params.set("rarity", rarity);

      const resp = await fetch(`/api/scan?${params}`);
      const json = await resp.json();
      if (json.candidates?.length) {
        setCandidates(json.candidates);
        setStatus(`${json.candidates.length}개 후보 발견`);
      } else {
        setStatus("일치하는 카드를 찾지 못했어요.");
      }
    } catch (e) {
      console.error(e);
      setStatus("오류가 발생했어요. 다시 시도해주세요.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-2">카드 스캔</h1>
      <p className="text-sm opacity-60 mb-6">
        카드 사진을 찍으면 카드 이름·번호·등급을 인식해서 후보를 찾아드려요. 카드 전체가 잘 보이게 찍어주세요.
      </p>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
        }}
      />

      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => inputRef.current?.click()}
          disabled={loading}
          className="px-4 py-2 rounded-lg bg-[var(--primary)] text-white font-medium hover:opacity-90 disabled:opacity-50"
        >
          사진 찍기
        </button>
        {lastFileRef.current && !loading && (
          <button
            onClick={() => lastFileRef.current && handleFile(lastFileRef.current)}
            className="px-4 py-2 rounded-lg border border-[var(--border)] hover:bg-[var(--border)]"
          >
            같은 사진 다시 인식
          </button>
        )}
        {(preview || candidates.length > 0) && (
          <button
            onClick={() => {
              setPreview(null);
              setCandidates([]);
              setDetectedInfo("");
              setStatus("");
              lastFileRef.current = null;
            }}
            className="px-4 py-2 rounded-lg border border-[var(--border)] hover:bg-[var(--border)]"
          >
            초기화
          </button>
        )}
      </div>

      {preview && (
        <div className="mb-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="preview" className="max-w-xs rounded-lg border border-[var(--border)]" />
        </div>
      )}

      {status && (
        <p className="text-sm mb-4 opacity-70">
          {status}
          {detectedInfo && <> · 인식: <strong>{detectedInfo}</strong></>}
        </p>
      )}

      {candidates.length > 0 && (
        <div>
          <p className="text-sm opacity-60 mb-3">맞는 카드를 선택하세요</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {candidates.map((c) => (
              <Link
                key={c.id}
                href={`/card/${c.id}`}
                className="block rounded-lg border border-[var(--border)] bg-[var(--card-bg)] overflow-hidden hover:shadow-lg transition"
              >
                <div className="aspect-[2.5/3.5] relative bg-gray-100">
                  {c.region && c.region !== "en" && (
                    <span
                      className={`absolute top-1.5 left-1.5 z-10 px-1.5 py-0.5 rounded text-[10px] font-bold text-white ${
                        c.region === "jp" ? "bg-red-500" : "bg-blue-500"
                      }`}
                    >
                      {c.region.toUpperCase()}
                    </span>
                  )}
                  {c.image_small ? (
                    <Image src={c.image_small} alt={c.name} fill sizes="(max-width: 640px) 50vw, 25vw" className={c.image_small.includes("snkrdunk.com") ? "object-cover" : "object-contain"} />
                  ) : (
                    <div className="flex items-center justify-center h-full text-xs opacity-30">No Image</div>
                  )}
                </div>
                <div className="p-2">
                  <p className="text-xs font-medium truncate">{c.region === "jp" ? (c.name_ja ?? c.name) : c.name}</p>
                  <p className="text-[10px] opacity-50 truncate">
                    {c.set?.name} · #{c.number}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
