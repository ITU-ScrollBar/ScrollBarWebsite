import { Card, Checkbox, Radio, Space, Typography } from "antd";
import { formatIsoDate } from "../../../../utils/dateUtils";

const { Text } = Typography;

type AnchorPreferenceCardProps = {
  wantsAnchor: boolean | undefined;
  isAnchor: boolean;
  anchorOnly: boolean;
  isClosed: boolean;
  anchorSeminarDays: string[];
  periodAnchorSeminarDays: string[];
  onWantsAnchorChange: (value: boolean) => void;
  onAnchorOnlyChange: (value: boolean) => void;
  onAnchorSeminarDaysChange: (value: string[]) => void;
};

export default function AnchorPreferenceCard({
  wantsAnchor,
  isAnchor,
  anchorOnly,
  isClosed,
  anchorSeminarDays,
  periodAnchorSeminarDays,
  onWantsAnchorChange,
  onAnchorOnlyChange,
  onAnchorSeminarDaysChange,
}: AnchorPreferenceCardProps) {
  return (
    <Card size="small" title="Anchor preference">
      <Space direction="vertical" style={{ width: "100%" }}>
        <Text>Do you want to be an anchor for the coming semester?</Text>
        <Radio.Group
          value={wantsAnchor === undefined ? undefined : wantsAnchor ? "yes" : "no"}
          onChange={(event) => {
            const value = event.target.value === "yes";
            onWantsAnchorChange(value);
            if (!value) {
              onAnchorOnlyChange(false);
              onAnchorSeminarDaysChange([]);
            }
          }}
          disabled={isClosed}
        >
          <Radio value="yes">Yes</Radio>
          <Radio value="no">No</Radio>
        </Radio.Group>

        {wantsAnchor === true && isAnchor && (
          <Radio.Group
            value={anchorOnly ? "anchor-only" : "mixed"}
            onChange={(event) => onAnchorOnlyChange(event.target.value === "anchor-only")}
            disabled={isClosed}
          >
            <Radio value="mixed">Mix of anchor and tender shifts</Radio>
            <Radio value="anchor-only">Only anchor shifts</Radio>
          </Radio.Group>
        )}

        {wantsAnchor === true && !isAnchor && periodAnchorSeminarDays.length > 0 && (
          <div>
            <Text type="secondary" style={{ display: "block", marginBottom: 8 }}>
              Which anchor seminar dates can you attend? (select all that apply)
            </Text>
            <Checkbox.Group
              value={anchorSeminarDays}
              onChange={(values) => onAnchorSeminarDaysChange(values.map(String))}
              disabled={isClosed}
            >
              <Space direction="vertical">
                {periodAnchorSeminarDays.map((day) => (
                  <Checkbox key={day} value={day}>
                    {formatIsoDate(day)}
                  </Checkbox>
                ))}
              </Space>
            </Checkbox.Group>
          </div>
        )}
      </Space>
    </Card>
  );
}
