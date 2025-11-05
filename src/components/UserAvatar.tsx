import {
  Avatar,
  notification,
  Upload,
  Modal,
  Slider,
  Button,
  Space,
} from "antd";
import { Tender, UserProfile } from "../types/types-file";
import avatar from "../assets/images/avatar.png";
import newbiehat from "../assets/images/newbiehat.svg";
import {
  deleteFileFromStorage,
  uploadProfilePicture,
} from "../firebase/api/authentication";
import useTenders from "../hooks/useTenders";
import { useState } from "react";

type UserAvatarProps = {
  user: UserProfile | Tender;
  size?: number;
  showHats?: boolean;
  backgroundColor?: string;
};

type UserAvatarWithUploadProps = UserAvatarProps & {
  onChange: (url: string) => void;
};

export const UserAvatar = ({
  user,
  size = 128,
  showHats = true,
  backgroundColor,
  ...divProps
}: UserAvatarProps & Record<string, unknown>) => {
  const showNewbieHat = showHats && (user.roles?.includes("newbie") ?? false);

  const passedStyle = divProps.style || {};
  const combinedStyle: React.CSSProperties = {
    position: "relative",
    display: "inline-block",
    width: size + 3,
    height: size + 3,
    backgroundColor: backgroundColor || "transparent",
    borderRadius: "50%",
    ...(passedStyle as React.CSSProperties),
  };

  const restProps = { ...divProps };
  delete restProps.style;

  return (
    <div {...restProps} style={combinedStyle}>
      <Avatar
        src={user.photoUrl || avatar}
        size={size}
        style={{ display: "block", left: 1.5, top: 1.5, zIndex: 9 }}
      />
      {showNewbieHat && (
        <img
          src={newbiehat}
          alt="Newbie Hat"
          style={{
            position: "absolute",
            left: "50%",
            top: -size * 0.55,
            transform: "translateX(-50%)",
            width: size * 0.85,
            height: "auto",
            pointerEvents: "none",
            zIndex: 10,
          }}
        />
      )}
    </div>
  );
};

export const UserAvatarWithUpload = ({
  user,
  onChange,
}: UserAvatarWithUploadProps) => {
  const { updateTender } = useTenders();
  const [api] = notification.useNotification();
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [imageSrc, setImageSrc] = useState<string>("");
  const [cropPosition, setCropPosition] = useState(0);
  const [cropPositionY, setCropPositionY] = useState(0);
  const [zoom, setZoom] = useState(0.4);
  const tokenRegex = /(\?alt=media&token=[\w-]+)$/;

  const resetModal = () => {
    setCropModalOpen(false);
    setImageSrc("");
    setCropPosition(0);
    setCropPositionY(0);
    setZoom(0.4);
  };

  const handleBeforeUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      setImageSrc(e.target?.result as string);
      setCropModalOpen(true);
    };
    reader.readAsDataURL(file);
    return false;
  };

  const cropImage = () => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Set canvas to circle dimensions (256x256)
      canvas.width = 256;
      canvas.height = 256;

      // Match the preview transform logic
      // The preview uses: translate(-50%, -50%) translateX(cropPosition * 2px) translateY(cropPositionY * 2px) scale(zoom)
      // We need to apply the same transformations to the source image

      const scaledWidth = img.width * zoom;
      const scaledHeight = img.height * zoom;

      // Position the image at center, then apply the translation offsets
      const centerX = 128;
      const centerY = 128;
      const offsetX = cropPosition * 2;
      const offsetY = cropPositionY * 2;

      // Draw circular image
      ctx.beginPath();
      ctx.arc(centerX, centerY, 128, 0, Math.PI * 2);
      ctx.clip();

      // Draw scaled and positioned image to match preview
      ctx.drawImage(
        img,
        centerX - scaledWidth / 2 + offsetX,
        centerY - scaledHeight / 2 + offsetY,
        scaledWidth,
        scaledHeight
      );

      // Convert to blob and upload
      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], "avatar.png", { type: "image/png" });
          uploadProfilePicture(file, user.email)
            .then((url) => {
              onChange(url);
              const previousUrl = user.photoUrl;
              updateTender(user.uid, "photoUrl", url);

              if (
                previousUrl &&
                previousUrl.replace(tokenRegex, "") !==
                  url.replace(tokenRegex, "")
              ) {
                deleteFileFromStorage(previousUrl);
              }

              resetModal();
            })
            .catch((error) => {
              api.error({
                message: "Error",
                description:
                  "Failed to upload profile picture: " + error.message,
                placement: "top",
              });
            });
        }
      });
    };
    img.src = imageSrc;
  };

  return (
    <>
      <Upload
        customRequest={({ file }: { file: unknown }) => {
          handleBeforeUpload(file as File);
        }}
        showUploadList={false}
        accept="image/*"
      >
        <UserAvatar user={user} />
      </Upload>

      <Modal
        title="Crop Profile Picture"
        open={cropModalOpen}
        onCancel={resetModal}
        footer={[
          <Button key="cancel" onClick={resetModal}>
            Cancel
          </Button>,
          <Button key="submit" type="primary" onClick={cropImage}>
            Use Photo
          </Button>,
        ]}
      >
        <Space direction="vertical" style={{ width: "100%" }} size="large">
          {imageSrc && (
            <div style={{ display: "flex", justifyContent: "center" }}>
              <div
                style={{
                  position: "relative",
                  width: "200px",
                  height: "200px",
                  borderRadius: "50%",
                  background: "#f0f0f0",
                  overflow: "hidden",
                  border: "2px solid #e0e0e0",
                  flexShrink: 0,
                }}
              >
                <img
                  src={imageSrc}
                  alt="Preview"
                  style={{
                    position: "absolute",
                    top: "50%",
                    left: "50%",
                    transform: `translate(-50%, -50%) translateX(${cropPosition * 2}px) translateY(${cropPositionY * 2}px) scale(${zoom})`,
                    transition: "transform 0.2s",
                    minWidth: "100%",
                    minHeight: "100%",
                  }}
                />
              </div>
            </div>
          )}

          <div>
            <label style={{ display: "block", marginBottom: "8px" }}>
              Position X: {cropPosition}%
            </label>
            <Slider
              min={-50}
              max={50}
              value={cropPosition}
              onChange={setCropPosition}
            />
          </div>

          <div>
            <label style={{ display: "block", marginBottom: "8px" }}>
              Position Y: {cropPositionY}%
            </label>
            <Slider
              min={-50}
              max={50}
              value={cropPositionY}
              onChange={setCropPositionY}
            />
          </div>

          <div>
            <label style={{ display: "block", marginBottom: "8px" }}>
              Zoom: {(zoom * 100).toFixed(0)}%
            </label>
            <Slider
              min={0.1}
              max={3}
              step={0.1}
              value={zoom}
              onChange={setZoom}
            />
          </div>
        </Space>
      </Modal>
    </>
  );
};
