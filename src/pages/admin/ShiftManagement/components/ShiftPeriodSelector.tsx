import { Button, Select, Space } from "antd";
import dayjs from "dayjs";
import { ShiftPlanningPeriod } from "../../../../types/types-file";
import Text from "antd/es/typography/Text";

type ShiftPeriodSelectorProps = {
  sortedPeriods: ShiftPlanningPeriod[];
  selectedPeriodId?: string;
  onSelectedPeriodChange: (periodId: string) => void;
  onCreatePeriod: () => void;
  onEditPeriod: () => void;
  hasSelectedPeriod: boolean;
};

export default function ShiftPeriodSelector({
  sortedPeriods,
  selectedPeriodId,
  onSelectedPeriodChange,
  onCreatePeriod,
  onEditPeriod,
  hasSelectedPeriod,
}: ShiftPeriodSelectorProps) {
  return (
    <Space direction="vertical" style={{ width: "100%" }} size="small">
      <Text strong style={{ fontSize: 16 }}>
        Shift Planning Period
      </Text>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <Select
          size="large"
          style={{ flex: 1, minWidth: 320 }}
          placeholder="Select planning period"
          value={selectedPeriodId}
          onChange={onSelectedPeriodChange}
          options={sortedPeriods.map((period) => ({
            value: period.id,
            label: `${period.name} (deadline: ${dayjs(period.submissionClosesAt).format("DD/MM/YYYY HH:mm")})`,
          }))}
        />
        <Button size="large" onClick={onCreatePeriod}>
          Create new period
        </Button>
        <Button size="large" onClick={onEditPeriod} disabled={!hasSelectedPeriod}>
          Edit selected period
        </Button>
      </div>
    </Space>
  );
}
