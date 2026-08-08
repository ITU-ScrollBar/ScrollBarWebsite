import { Space, Typography } from "antd";

const { Text } = Typography;

type MemberTypeInfo = {
  title: string;
  lines: string[];
  reference: string;
};

const MEMBER_TYPES: MemberTypeInfo[] = [
  {
    title: "Active Member:",
    lines: [
      "You are an active member and part of the bar.",
      "You receive 3-5 + Big Party shifts.",
    ],
    reference: "(ScrollBar Constitution, Chapter 6)",
  },
  {
    title: "Passive Member:",
    lines: [
      "You want to take a break, but come back later.",
      "You can only be a passive member for 1 semester.",
      "You receive no shifts, but can grab shifts.",
    ],
    reference: "(ScrollBar Constitution, Chapter 8)",
  },
  {
    title: "Legacy Member:",
    lines: [
      "You are done at ITU, but want to continue being a Scrollie.",
      "Once you are legacy, you can not go back to being active.",
      "You receive no shifts but can grab shifts.",
    ],
    reference: "(ScrollBar Constitution, Chapter 9)",
  },
  {
    title: "Implicit Member:",
    lines: ["You want to leave the bar for good."],
    reference: "(ScrollBar Constitution, Chapter 5)",
  },
];

export default function MemberTypeInfoBox() {
  return (
    <div
      style={{
        border: "1px solid #f0f0f0",
        borderRadius: 8,
        padding: 12,
        background: "#fafafa",
        width: "100%",
      }}
    >
      <Space direction="vertical" size="middle" style={{ width: "100%" }}>
        {MEMBER_TYPES.map((memberType) => (
          <div key={memberType.title}>
            <Text strong style={{ display: "block" }}>
              {memberType.title}
            </Text>
            {memberType.lines.map((line) => (
              <Text key={line} style={{ display: "block" }}>
                {line}
              </Text>
            ))}
            <Text style={{ display: "block" }}>{memberType.reference}</Text>
          </div>
        ))}
      </Space>
    </div>
  );
}
