import { Alert, Card, Input, Radio, Space, Typography } from "antd";
import { ParticipationStatus } from "../../types/types-file";
import AnchorPreferenceCard from "./AnchorPreferenceCard";

const { Text } = Typography;
const { TextArea } = Input;

type SemesterParticipationCardProps = {
  isCurrentlyLegacy: boolean;
  isCurrentlyPassive: boolean;
  participationStatus: ParticipationStatus | undefined;
  onChange: (status: ParticipationStatus) => void;
  passiveReason: string;
  onPassiveReasonChange: (value: string) => void;
  isAnchor: boolean;
  wantsAnchor: boolean | undefined;
  onWantsAnchorChange: (value: boolean) => void;
  anchorOnly: boolean;
  onAnchorOnlyChange: (value: boolean) => void;
  anchorSeminarDays: string[];
  onAnchorSeminarDaysChange: (value: string[]) => void;
  periodAnchorSeminarDays: string[];
};

export default function SemesterParticipationCard({
  isCurrentlyLegacy,
  isCurrentlyPassive,
  participationStatus,
  onChange,
  passiveReason,
  onPassiveReasonChange,
  isAnchor,
  wantsAnchor,
  onWantsAnchorChange,
  anchorOnly,
  onAnchorOnlyChange,
  anchorSeminarDays,
  onAnchorSeminarDaysChange,
  periodAnchorSeminarDays,
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
              <div>
                <Alert
                  type="warning"
                  showIcon
                  message="Passive exemption required"
                  description="According to § 29.1 of our constitution, you must apply for an exemption to stay passive for more than one semester and be approved by at least half of the board. Reasons for exemption can be, but is not limited to Ex. Studying abroad, illness, pregnancy etc."
                />
                <TextArea
                  rows={3}
                  value={passiveReason}
                  onChange={(e) => onPassiveReasonChange(e.target.value)}
                  placeholder="Please provide a reason for being passive this semester."
                />
              </div>
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
        {participationStatus === "active" && (
          <AnchorPreferenceCard
            wantsAnchor={wantsAnchor}
            isAnchor={isAnchor}
            anchorOnly={anchorOnly}
            anchorSeminarDays={anchorSeminarDays}
            periodAnchorSeminarDays={periodAnchorSeminarDays}
            onWantsAnchorChange={onWantsAnchorChange}
            onAnchorOnlyChange={onAnchorOnlyChange}
            onAnchorSeminarDaysChange={onAnchorSeminarDaysChange}
          />
        )}
      </Space>
    </Card>
  );
}
