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
        setStatus("번호·이름·등급을 찾지 못했어요. 다시 찍어주세요.");
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

  const hasResult = preview || candidates.length > 0;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
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

      {/* 결과 없을 때: 큰 카메라 버튼 중앙 */}
      {!hasResult && !loading && (
        <div className="flex flex-col items-center justify-center py-20">
          <button
            onClick={() => inputRef.current?.click()}
            className="w-32 h-32 rounded-full bg-[var(--primary)] text-white flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-transform cursor-pointer"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-14 h-14">
              <path d="M12 9a3.75 3.75 0 1 0 0 7.5A3.75 3.75 0 0 0 12 9Z" />
              <path fillRule="evenodd" d="M9.344 3.071a49.52 49.52 0 0 1 5.312 0c.967.052 1.83.585 2.332 1.39l.821 1.317c.24.383.645.643 1.11.71.386.054.77.113 1.152.177 1.432.239 2.429 1.493 2.429 2.909V18a3 3 0 0 1-3 3H4.5a3 3 0 0 1-3-3V9.574c0-1.416.997-2.67 2.429-2.909.382-.064.766-.123 1.151-.178a1.56 1.56 0 0 0 1.11-.71l.822-1.315a2.942 2.942 0 0 1 2.332-1.39ZM6.75 12.75a5.25 5.25 0 1 1 10.5 0 5.25 5.25 0 0 1-10.5 0Zm12-1.5a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z" clipRule="evenodd" />
            </svg>
          </button>
          <p className="mt-4 text-sm opacity-50">카드를 찍어주세요</p>
        </div>
      )}

      {/* 로딩 중 */}
      {loading && (
        <div className="flex flex-col items-center py-16">
          {preview && (
            <div className="mb-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview} alt="preview" className="w-40 rounded-lg border border-[var(--border)] opacity-60" />
            </div>
          )}
          <div className="w-8 h-8 border-3 border-[var(--primary)] border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-sm opacity-60">{status}</p>
        </div>
      )}

      {/* 결과 */}
      {!loading && hasResult && (
        <>
          <div className="flex items-start gap-4 mb-6">
            {preview && (
              <div className="flex-shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={preview} alt="preview" className="w-28 rounded-lg border border-[var(--border)]" />
              </div>
            )}
            <div className="flex-1">
              {status && <p className="text-sm opacity-70 mb-1">{status}</p>}
              {detectedInfo && (
                <p className="text-xs opacity-50">인식: {detectedInfo}</p>
              )}
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => inputRef.current?.click()}
                  className="px-4 py-2 rounded-full bg-[var(--primary)] text-white text-sm font-medium hover:opacity-90 cursor-pointer"
                >
                  다시 찍기
                </button>
                <button
                  onClick={() => {
                    setPreview(null);
                    setCandidates([]);
                    setDetectedInfo("");
                    setStatus("");
                    lastFileRef.current = null;
                  }}
                  className="px-4 py-2 rounded-full border border-[var(--border)] text-sm hover:bg-[var(--border)] cursor-pointer"
                >
                  초기화
                </button>
              </div>
            </div>
          </div>

          {candidates.length > 0 && (
            <div>
              <p className="text-sm opacity-60 mb-3">맞는 카드를 선택하세요</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {candidates.map((c) => (
                  <Link
                    key={c.id}
                    href={`/card/${c.id}`}
                    className="block rounded-lg border border-[var(--border)] bg-[var(--card-bg)] overflow-hidden card-glow transition"
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
                      <p className="text-xs font-medium truncate">{c.region === "jp" || c.region === "kr" ? (c.name_ja ?? c.name) : c.name}</p>
                      <p className="text-[10px] opacity-50 truncate">
                        {c.set?.name} · #{c.number}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
