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

export default function ScanPage() {
  const [preview, setPreview] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("");
  const [detectedNumber, setDetectedNumber] = useState<string>("");
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setLoading(true);
    setCandidates([]);
    setDetectedNumber("");
    setStatus("이미지 분석 중...");
    setPreview(URL.createObjectURL(file));

    try {
      const Tesseract = (await import("tesseract.js")).default;
      const { data } = await Tesseract.recognize(file, "eng", {
        logger: (m) => {
          if (m.status === "recognizing text") {
            setStatus(`텍스트 인식 중... ${Math.round(m.progress * 100)}%`);
          }
        },
      });

      // 카드 번호 패턴: "045/198", "045 / 198", "045/", etc.
      const text = data.text;
      const numMatch = text.match(/(\d{1,3})\s*\/\s*(\d{1,3})/);
      let number = "";
      if (numMatch) {
        number = `${numMatch[1].padStart(3, "0")}/${numMatch[2].padStart(3, "0")}`;
      } else {
        // fallback: 3자리 숫자 만이라도
        const looseMatch = text.match(/\b(\d{3})\b/);
        if (looseMatch) number = looseMatch[1];
      }

      if (!number) {
        setStatus("카드 번호를 찾지 못했어요. 번호(예: 045/198)가 잘 보이게 다시 찍어주세요.");
        setLoading(false);
        return;
      }

      setDetectedNumber(number);
      setStatus(`번호 ${number} 검색 중...`);

      const resp = await fetch(`/api/scan?number=${encodeURIComponent(number)}`);
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
        카드를 찍으면 번호로 후보를 찾아드려요. 좌하단의 카드 번호(예: 045/198)가 선명하게 보이게 찍어주세요.
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
        {(preview || candidates.length > 0) && (
          <button
            onClick={() => {
              setPreview(null);
              setCandidates([]);
              setDetectedNumber("");
              setStatus("");
            }}
            className="px-4 py-2 rounded-lg border border-[var(--border)] hover:bg-[var(--border)]"
          >
            다시 하기
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
          {detectedNumber && <> · 인식된 번호: <strong>{detectedNumber}</strong></>}
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
                    <Image src={c.image_small} alt={c.name} fill sizes="(max-width: 640px) 50vw, 25vw" className="object-contain" />
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
