import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Kikidult — 메가 스타트덱 100 + 랜덤팩";
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
          alignItems: "center",
          justifyContent: "center",
          background: "#1a1a1a",
        }}
      >
        <img
          src={PRODUCT_IMAGE}
          alt=""
          width={600}
          height={600}
          style={{ objectFit: "contain" }}
        />
      </div>
    ),
    { ...size }
  );
}
