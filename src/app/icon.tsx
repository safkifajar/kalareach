import { ImageResponse } from "next/og";

// Favicon Kalareach: petir putih di gradient ungu (mirip logo sidebar)
// Next.js akan auto-generate dari file ini & inject ke <head>.

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #7e22ce 0%, #a855f7 100%)",
          borderRadius: 7,
          boxShadow: "0 2px 6px rgba(126, 34, 206, 0.5)",
        }}
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="white"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      </div>
    ),
    size,
  );
}
