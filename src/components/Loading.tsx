import React from "react";
import { Typography } from "antd";

const { Text } = Typography;

export interface LoadingProps {
  resources?: string[];
  centerOverlay?: boolean;
}

export const Loading: React.FC<LoadingProps> = ({
  resources = [],
  centerOverlay = false,
}) => {
  const message = resources.length
    ? `Loading ${resources.join(", ")}`
    : "Pouring beer";
  const duration = "1.6s";

  // A small panel/backdrop behind the loader content makes white text readable
  // even on white pages. We keep the loader visuals (glass/bubbles) intact,
  // but wrap them and the text in a translucent dark rounded container.
  const content = (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 12,
      }}
    >
      <style>{`
        @keyframes sb-fill-simple { from { transform: translateY(100%); } to { transform: translateY(30%); } }
        @keyframes sb-foam-bubble { 0% { transform: translate(0, 0) scale(1); opacity: 1; } 50% { transform: translate(var(--tx), -40px) scale(1.1); opacity: 0.8; } 100% { transform: translate(var(--tx), -80px) scale(0.9); opacity: 0; } }
      `}</style>

      {/* translucent panel behind the loader (rounded) */}
      <div
        style={{
          background: "rgba(0,0,0,0.56)",
          padding: 16,
          borderRadius: 12,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 12,
          color: "#fff", // ensure descendant text defaults to white
        }}
      >
        <div
          aria-hidden
          style={{
            width: 64,
            height: 92,
            borderRadius: 10,
            border: "3px solid rgba(255,255,255,0.08)",
            position: "relative",
            background: "#fff",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: 0,
              height: "100%",
              background: "linear-gradient(180deg,#FFD600,#FFC200)",
              transform: "translateY(100%)",
              animation: `sb-fill-simple ${duration} ease-in-out infinite`,
              transformOrigin: "bottom",
            }}
          >
            {[0, 1, 2, 3, 4].map((i) => (
              <div
                key={`bubble-${i}`}
                style={
                  {
                    position: "absolute",
                    left: `${15 + i * 15}%`,
                    bottom: `${30 + i * 10}%`,
                    width: 12,
                    height: 12,
                    borderRadius: "50%",
                    background:
                      "radial-gradient(circle at 35% 35%, rgba(255,255,255,0.9), rgba(255,240,100,0.4))",
                    border: "1.5px solid rgba(255,255,255,0.7)",
                    animation: `sb-foam-bubble ${duration} ease-in infinite`,
                    animationDelay: `${i * 0.2}s`,
                    "--tx": `${(Math.random() - 0.5) * 15}px`,
                    opacity: 0.8,
                    pointerEvents: "none",
                  } as React.CSSProperties
                }
              />
            ))}
          </div>
        </div>

        <div style={{ textAlign: "center" }}>
          <Text strong style={{ display: "block", marginBottom: 6, color: "#fff" }}>
            {message}
          </Text>
        </div>
      </div>
    </div>
  );

  if (centerOverlay) {
    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          // fullscreen dimmed overlay so the loader stands out on top of page content
          background: "rgba(0,0,0,0.16)",
          zIndex: 9999,
        }}
      >
        {content}
      </div>
    );
  }

  // when not full-screen, keep the loader centered in a small padded area
  return (
    <div style={{ display: "flex", justifyContent: "center", padding: 16 }}>
      {content}
    </div>
  );
};

export default Loading;
