import { Alert, Card, Radio, Space, Typography } from "antd";

const { Text } = Typography;

type ParticipationStatus = "active" | "passive" | "legacy" | "leave";

type SemesterParticipationCardProps = {
  isCurrentlyLegacy: boolean;
  isCurrentlyPassive: boolean;
  participationStatus: ParticipationStatus | undefined;
  onChange: (status: ParticipationStatus) => void;
};

export default function SemesterParticipationCard({
  isCurrentlyLegacy,
  isCurrentlyPassive,
  participationStatus,
  onChange,
}: SemesterParticipationCardProps) {
  return (
    <Card size="small" title="Semester participation">
      <Space direction="vertical" style={{ width: "100%" }}>
        <Text>How do you want to participate this semester?</Text>
        {isCurrentlyLegacy ? (
          <Radio.Group
            value={participationStatus}
            onChange={(event) => onChange(event.target.value as ParticipationStatus)}
          >
            <Radio value="legacy">Stay legacy</Radio>
            <Radio value="leave">Become implicit member (Leave the bar)</Radio>
          </Radio.Group>
        ) : isCurrentlyPassive ? (
          <>
            <Radio.Group
              value={participationStatus}
              onChange={(event) => onChange(event.target.value as ParticipationStatus)}
            >
              <Radio value="active">Become active member again</Radio>
              <Radio value="passive">Apply to stay passive</Radio>
              <Radio value="legacy">Become legacy member</Radio>
              <Radio value="leave">Become implicit member (Leave the bar)</Radio>
            </Radio.Group>
            {participationStatus === "passive" && (
              <Alert
                type="warning"
                showIcon
                message="Passive exemption required"
                description="According to § 29.1 of our constitution, you must apply for an exemption to stay passive for more than one semester and be approved by at least half of the board. Reasons for exemption can be, but is not limited to Ex. Studying abroad, illness, pregnancy etc."
              />
            )}
          </>
        ) : (
          <Radio.Group
            value={participationStatus}
            onChange={(event) => onChange(event.target.value as ParticipationStatus)}
          >
            <Radio value="active">Active member</Radio>
            <Radio value="passive">Passive member</Radio>
            <Radio value="legacy">Legacy member</Radio>
            <Radio value="leave">Implicit member (Leaving the bar)</Radio>
          </Radio.Group>
        )}
      </Space>
    </Card>
  );
}
