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

  const content = (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <style>{`
        @keyframes sb-fill-simple { from { transform: translateY(100%); } to { transform: translateY(30%); } }
        @keyframes sb-foam-bubble { 0% { transform: translate(0, 0) scale(1); opacity: 1; } 50% { transform: translate(var(--tx), -40px) scale(1.1); opacity: 0.8; } 100% { transform: translate(var(--tx), -80px) scale(0.5); opacity: 0; } }
      `}</style>

      <div
        aria-hidden
        style={{
          width: 64,
          height: 92,
          borderRadius: 10,
          border: "3px solid rgba(0,0,0,0.06)",
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

      <div style={{ minWidth: 120 }}>
        <Text strong style={{ display: "block", marginBottom: 6 }}>
          {message}
        </Text>
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
          background: "rgba(0,0,0,0.16)",
          zIndex: 9999,
        }}
      >
        {content}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", justifyContent: "center", padding: 16 }}>
      {content}
    </div>
  );
};

export default Loading;
