import React from "react";
import { Popconfirm } from "antd";

interface UpForGrabsBadgeProps {
  isUpForGrabs: boolean;
  onGrab: () => void;
}

export const UpForGrabsBadge: React.FC<UpForGrabsBadgeProps> = ({
  isUpForGrabs,
  onGrab,
}) => {
  if (!isUpForGrabs) return null;

  return (
    <>
      <style>{`
        @keyframes pulse-hand {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.15); }
        }
      `}</style>
      <Popconfirm
        title="Are you sure you want to grab this shift?"
        description="This action cannot be undone."
        okText="Yes"
        okButtonProps={{ color: "yellow" }}
        onConfirm={onGrab}
      >
        <div
          style={{
            position: "absolute",
            top: -7,
            right: -7,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 28,
            height: 28,
            borderRadius: "50%",
            backgroundColor: "#FFD600",
            border: "3px solid white",
            cursor: "pointer",
            fontSize: 16,
            boxShadow:
              "0 2px 8px rgba(255, 214, 0, 0.4), 0 4px 12px rgba(0,0,0,0.2)",
            lineHeight: 1,
            animation: "pulse-hand 5s ease-in-out infinite",
            zIndex: 12,
          }}
        >
          ✋
        </div>
      </Popconfirm>
    </>
  );
};

export default UpForGrabsBadge;
