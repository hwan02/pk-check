import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Kikidult — Pokemon · One Piece TCG Market";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

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
        }}
      >
        <div
          style={{
            fontSize: 72,
            fontWeight: 900,
            color: "#ffffff",
            letterSpacing: "-3px",
          }}
        >
          KIKIDULT
        </div>
        <div
          style={{
            fontSize: 18,
            color: "rgba(255,255,255,0.5)",
            letterSpacing: "8px",
            marginTop: 12,
          }}
        >
          TCG MARKET
        </div>
        <div
          style={{
            fontSize: 24,
            color: "rgba(255,255,255,0.7)",
            marginTop: 60,
          }}
        >
          Pokemon · One Piece Trading Cards
        </div>
        <div
          style={{
            fontSize: 18,
            color: "rgba(255,255,255,0.4)",
            marginTop: 12,
          }}
        >
          Worldwide Shipping · PayPal
        </div>
      </div>
    ),
    { ...size }
  );
}
