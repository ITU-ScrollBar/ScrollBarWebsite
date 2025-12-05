import { notification, Tag } from "antd";
import { Role } from "../types/types-file";
import { roleToColor, roleToLabel } from "../pages/members/helpers";

type RoleTagProps = {
    role: string;
};

export default function RoleTag({ role }: RoleTagProps) {
    const key = role.toUpperCase();

    if (!(key in Role)) {
        notification.error({
            title: "Unknown role",
            description: `The role "${role}" is not recognized.`,
        });
        return null;
    }

    // Convert enum name (e.g. "ADMIN") to the enum value (e.g. "admin")
    const roleEnum = (Role as any)[key] as Role;
    const color = roleToColor(roleEnum);
    const label = roleToLabel(roleEnum);

    return (
        <Tag color={color}>
            {label}
        </Tag>
    );
}
