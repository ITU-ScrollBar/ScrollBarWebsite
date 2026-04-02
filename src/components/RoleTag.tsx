import { notification, Tag } from "antd";
import { Role } from "../types/types-file";
import { roleToColor, roleToLabel } from "../pages/members/helpers";

type RoleTagProps = {
    role: string;
};

function isRoleKey(value: string): value is keyof typeof Role {
  return Object.prototype.hasOwnProperty.call(Role, value);
}

export default function RoleTag({ role }: RoleTagProps) {
  const key = role.toUpperCase();

  if (!isRoleKey(key)) {
    notification.error({
      message: "Unknown role",
      description: `The role "${role}" is not recognized.`,
    });
    return null;
  }

  // Convert enum name (e.g. "ADMIN") to the enum value (e.g. "admin")
  const roleEnum = Role[key];
  const color = roleToColor(roleEnum);
  const label = roleToLabel(roleEnum);

  return (
    <Tag color={color}>
      {label}
    </Tag>
  );
}
