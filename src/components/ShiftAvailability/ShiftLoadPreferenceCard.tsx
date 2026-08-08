import { Card, Radio, Space, Typography } from "antd";
import { ShiftLoadPreference } from "../../types/types-file";

const { Text } = Typography;

type ShiftLoadPreferenceCardProps = {
  shiftLoadPreference: ShiftLoadPreference;
  onChange: (value: ShiftLoadPreference) => void;
};

export default function ShiftLoadPreferenceCard({
  shiftLoadPreference,
  onChange,
}: ShiftLoadPreferenceCardProps) {
  return (
    <Card size="small" title="Amount of shifts">
      <Space direction="vertical" style={{ width: "100%" }}>
        <Text>How many shifts do you want next semester?</Text>
        <Radio.Group
          value={shiftLoadPreference}
          onChange={(event) => onChange(event.target.value as ShiftLoadPreference)}
        >
          <Space direction="vertical">
            <Radio value="regular">Regular amount of shifts</Radio>
            <Radio value="max">As many shifts as possible</Radio>
          </Space>
        </Radio.Group>
        <Text type="secondary">
          Regular is 3-5 shifts + Big Party shifts. Choosing as many as possible is a wish, not a
          guarantee.
        </Text>
      </Space>
    </Card>
  );
}
