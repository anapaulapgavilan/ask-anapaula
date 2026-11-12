import { ImageResponse } from "next/og";

export const alt = "Ask Ana Paula professional profile";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          width: "100%",
          height: "100%",
          padding: "72px",
          background: "#f7f5f0",
          color: "#24211e",
          fontFamily: "Arial, Helvetica, sans-serif",
        }}
      >
        <div style={{ display: "flex", color: "#824328", fontSize: 24, fontWeight: 700 }}>
          PROFESSIONAL PROFILE
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div
            style={{
              display: "flex",
              fontFamily: "Georgia, Times New Roman, serif",
              fontSize: 76,
              letterSpacing: "-3px",
            }}
          >
            Ask Ana Paula
          </div>
          <div style={{ display: "flex", color: "#625e59", fontSize: 32 }}>
            Bilingual professional profile
          </div>
        </div>
        <div style={{ display: "flex", color: "#625e59", fontSize: 22 }}>
          Sign in with Google to chat
        </div>
      </div>
    ),
    size,
  );
}
