import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Kikidult — 메가 스타트덱 100 + 랜덤팩 판매중";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const PRODUCT_IMAGE =
  "https://ixbskjdhodxohfosrqjm.supabase.co/storage/v1/object/public/listing-images/mega-deck/1778824809584-keyvisual-sq.png";

export default function TwitterImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: "#1a1a1a",
          fontFamily: "Arial, Helvetica, sans-serif",
        }}
      >
        <div
          style={{
            width: "45%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "40px",
          }}
        >
          <img
            src={PRODUCT_IMAGE}
            alt=""
            width={400}
            height={400}
            style={{ objectFit: "contain", borderRadius: "16px" }}
          />
        </div>
        <div
          style={{
            width: "55%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: "40px 40px 40px 0",
          }}
        >
          <div style={{ fontSize: 48, fontWeight: 900, color: "#ffffff", letterSpacing: "-2px" }}>
            KIKIDULT
          </div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", letterSpacing: "6px", marginTop: 4 }}>
            TCG MARKET
          </div>
          <div
            style={{
              marginTop: 40,
              padding: "16px 20px",
              background: "rgba(255,255,255,0.08)",
              borderRadius: "12px",
              border: "1px solid rgba(255,255,255,0.12)",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div style={{ fontSize: 24, fontWeight: 800, color: "#ffffff" }}>
              메가 스타트덱 100
            </div>
            <div style={{ fontSize: 18, color: "rgba(255,255,255,0.6)", marginTop: 4 }}>
              배틀컬렉션 + 랜덤팩 1팩 증정
            </div>
            <div style={{ fontSize: 28, fontWeight: 900, color: "#f15746", marginTop: 12 }}>
              $13.33
            </div>
          </div>
          <div style={{ display: "flex", gap: "16px", marginTop: 24, fontSize: 13, color: "rgba(255,255,255,0.3)" }}>
            <span>Worldwide Shipping</span>
            <span>·</span>
            <span>PayPal</span>
            <span>·</span>
            <span>From Korea</span>
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
