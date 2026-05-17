import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Kikidult — 메가 스타트덱 100 + 랜덤팩 판매중";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const PRODUCT_IMAGE =
  "https://ixbskjdhodxohfosrqjm.supabase.co/storage/v1/object/public/listing-images/mega-deck/1778824809584-keyvisual-sq.png";

export default function OGImage() {
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
          position: "relative",
        }}
      >
        {/* 상품 이미지 크게 */}
        <img
          src={PRODUCT_IMAGE}
          alt=""
          width={480}
          height={480}
          style={{
            objectFit: "contain",
            borderRadius: "20px",
            position: "absolute",
            left: "40px",
            top: "75px",
          }}
        />

        {/* 오른쪽 하단: 텍스트 오버레이 */}
        <div
          style={{
            position: "absolute",
            right: "40px",
            bottom: "40px",
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
          }}
        >
          <div style={{ fontSize: 44, fontWeight: 900, color: "#ffffff", letterSpacing: "-2px" }}>
            KIKIDULT
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: "#ffffff", marginTop: 16 }}>
            메가 스타트덱 100
          </div>
          <div style={{ fontSize: 18, color: "rgba(255,255,255,0.6)", marginTop: 4 }}>
            배틀컬렉션 + 랜덤팩 1팩 증정
          </div>
          <div style={{ fontSize: 36, fontWeight: 900, color: "#f15746", marginTop: 12 }}>
            $13.33
          </div>
        </div>

        {/* 상단 우측: 뱃지 */}
        <div
          style={{
            position: "absolute",
            right: "40px",
            top: "40px",
            display: "flex",
            gap: "8px",
            fontSize: 14,
            color: "rgba(255,255,255,0.4)",
          }}
        >
          <span style={{ padding: "6px 12px", background: "rgba(255,255,255,0.1)", borderRadius: "20px" }}>
            Worldwide Shipping
          </span>
          <span style={{ padding: "6px 12px", background: "rgba(255,255,255,0.1)", borderRadius: "20px" }}>
            PayPal
          </span>
        </div>
      </div>
    ),
    { ...size }
  );
}
