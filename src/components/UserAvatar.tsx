import { Avatar } from "antd";
import { Role, Tender, UserProfile } from "../types/types-file";
import avatar from "../assets/images/avatar.png";
import newbiehat from "../assets/images/newbiehat.svg";

export type UserAvatarProps = {
  user: UserProfile | Tender;
  size?: number;
  showHats?: boolean;
  backgroundColor?: string;
};

export const UserAvatar = ({
  user,
  size = 128,
  showHats = true,
  backgroundColor,
  ...divProps
}: UserAvatarProps & Record<string, unknown>) => {
  const showNewbieHat = showHats && (user.roles?.includes(Role.NEWBIE) ?? false);

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
        src={<img src={user.photoUrl || avatar} loading="lazy" alt="" onError={(e) => { e.currentTarget.src = avatar; }} />}
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
