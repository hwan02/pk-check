"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import type { Worker } from "tesseract.js";

// 페이지 단위로 워커 1개 재사용 (첫 호출 후 init 비용 회피)
let workerPromise: Promise<Worker> | null = null;
async function getWorker(onProgress: (msg: string) => void): Promise<Worker> {
  if (workerPromise) return workerPromise;
  workerPromise = (async () => {
    const Tesseract = await import("tesseract.js");
    onProgress("OCR 엔진 초기화 중...");
    const w = await Tesseract.createWorker(["eng", "jpn"], 1, {
      logger: (m: { status: string; progress: number }) => {
        if (m.status === "loading language traineddata") {
          onProgress(`언어 데이터 로딩 ${Math.round(m.progress * 100)}%`);
        }
      },
    });
    return w;
  })();
  return workerPromise;
}

// 카드 사진을 OCR 전에 적당히 축소 (긴 변 1280px). 카메라 원본은 4000px+라 느림.
async function resizeImage(file: File, maxDim = 1280): Promise<Blob> {
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
    setStatus("이미지 분석 중 (다국어 OCR 로딩, 첫 실행은 30초+)...");
    setPreview(URL.createObjectURL(file));

    try {
      // 1) 이미지 리사이즈 (긴 변 1280px) — OCR 속도 크게 향상
      setStatus("이미지 전처리 중...");
      const resized = await resizeImage(file, 1280);

      // 2) 워커 재사용 (eng+jpn). 처음만 30초 정도, 이후 즉시
      const worker = await getWorker((m) => setStatus(m));

      setStatus("텍스트 인식 중...");
      const { data } = await worker.recognize(resized);

      const text = data.text;

      // 1) 카드 번호 패턴
      const numMatch = text.match(/(\d{1,3})\s*\/\s*(\d{1,3})/);
      let number = "";
      if (numMatch) {
        number = `${numMatch[1].padStart(3, "0")}/${numMatch[2].padStart(3, "0")}`;
      } else {
        const looseMatch = text.match(/\b(\d{2,3})\b/);
        if (looseMatch) number = looseMatch[1];
      }

      // 2) 레어리티: 알려진 약자 토큰 매칭 (단어 경계 단독으로 등장하는 경우)
      const RARITY_TOKENS = ["SAR","SSR","SR","RRR","RR","AR","UR","HR","ACE","ACESPEC","CHR","TR","C","U","R","P","PR"];
      let rarity = "";
      // 우선 번호 직후의 토큰 찾기
      if (numMatch) {
        const after = text.slice(text.indexOf(numMatch[0]) + numMatch[0].length, text.indexOf(numMatch[0]) + numMatch[0].length + 20);
        const m = after.match(/\b([A-Z]{1,4})\b/);
        if (m && RARITY_TOKENS.includes(m[1])) rarity = m[1];
      }
      // 폴백: 텍스트 전체에서 가장 긴 매칭 (긴 SAR > SR > R 우선)
      if (!rarity) {
        for (const t of RARITY_TOKENS) {
          const re = new RegExp(`(?:^|[^A-Z])${t}(?:[^A-Z]|$)`);
          if (re.test(text)) {
            rarity = t;
            break; // RARITY_TOKENS가 긴 토큰부터 정렬돼있음
          }
        }
      }

      // 3) 일본어/한국어 카드명 후보 추출 (가장 긴 CJK 문자열)
      const cjkChunks = text.match(/[぀-ゟ゠-ヿ一-鿿가-힯]+(?:[ ・]*[぀-ゟ゠-ヿ一-鿿가-힯]+)*/g) ?? [];
      const longestName = cjkChunks.sort((a, b) => b.length - a.length)[0] ?? "";
      const name = longestName.length >= 2 ? longestName : "";

      if (!number && !name && !rarity) {
        setStatus("번호/이름/등급을 찾지 못했어요. 카드 전체가 잘 보이게 다시 찍어주세요.");
        setLoading(false);
        return;
      }

      const detected = [number && `번호 ${number}`, name && `이름 "${name}"`, rarity && `등급 ${rarity}`].filter(Boolean).join(" · ");
      setDetectedInfo(detected);
      setStatus(`검색 중...`);

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
        {lastFileRef.current && (
          <button
            onClick={() => lastFileRef.current && handleFile(lastFileRef.current)}
            disabled={loading}
            className="px-4 py-2 rounded-lg border border-[var(--border)] hover:bg-[var(--border)] disabled:opacity-50"
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
