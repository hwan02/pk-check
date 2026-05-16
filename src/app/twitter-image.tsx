import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Kikidult — 100덱 + 랜덤팩 판매중";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function TwitterImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#1a1a1a",
          fontFamily: "Arial, Helvetica, sans-serif",
        }}
      >
        <div
          style={{
            fontSize: 64,
            fontWeight: 900,
            color: "#ffffff",
            letterSpacing: "-3px",
          }}
        >
          KIKIDULT
        </div>
        <div
          style={{
            fontSize: 16,
            color: "rgba(255,255,255,0.4)",
            letterSpacing: "8px",
            marginTop: 8,
          }}
        >
          TCG MARKET
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
            marginTop: 48,
            padding: "20px 40px",
            background: "rgba(255,255,255,0.08)",
            borderRadius: "16px",
            border: "1px solid rgba(255,255,255,0.15)",
          }}
        >
          <div style={{ fontSize: 48 }}>🎴</div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div
              style={{
                fontSize: 28,
                fontWeight: 900,
                color: "#ffffff",
              }}
            >
              100덱 + 랜덤팩
            </div>
            <div
              style={{
                fontSize: 16,
                color: "rgba(255,255,255,0.5)",
                marginTop: 4,
              }}
            >
              포켓몬 · 원피스 트레이딩 카드 판매중
            </div>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            gap: "24px",
            marginTop: 32,
            fontSize: 14,
            color: "rgba(255,255,255,0.35)",
          }}
        >
          <span>Worldwide Shipping</span>
          <span>·</span>
          <span>PayPal</span>
          <span>·</span>
          <span>From Korea</span>
        </div>
      </div>
    ),
    { ...size }
  );
}
