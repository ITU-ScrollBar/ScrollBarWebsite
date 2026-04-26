import { RocketOutlined } from "@ant-design/icons";
import { Alert, Button, Popconfirm, Space } from "antd";
import Text from "antd/es/typography/Text";
import ShiftEventInformationSection from "./ShiftEventInformationSection";
import { Event, Shift, ShiftPlanningPeriod, ShiftPlanningResponse } from "../../../../types/types-file";

type ShiftPlanningTabProps = {
  selectedPeriod: ShiftPlanningPeriod;
  submissionCount: number;
  expectedSubmissions?: number;
  missingSubmissions?: number;
  shiftsPerMember: string;
  generatingPlan: boolean;
  onGeneratePlan: () => void;
  onPublishSelectedPeriodShifts: () => void;
  generationSummary: string | null;
  generationWarnings: string[];
  currentEvent: Event | null;
  selectedPeriodEvents: Event[];
  onSelectedEventChange: (eventId: string) => void;
  onToggleShiftsPublished: (checked: boolean) => void;
  onAddDefaultShifts: () => void;
  onOpenCustomShiftModal: () => void;
  onAddBigPartyShifts: () => void;
  shiftsForEvent: Shift[];
  addShift: (shift: Shift) => Promise<string>;
  updateShift: (id: string, field: string, value: unknown) => void;
  removeShift: (shift: Shift) => Promise<void>;
  periodResponses: ShiftPlanningResponse[];
};

export default function ShiftPlanningTab({
  selectedPeriod,
  submissionCount,
  expectedSubmissions,
  missingSubmissions,
  shiftsPerMember,
  generatingPlan,
  onGeneratePlan,
  onPublishSelectedPeriodShifts,
  generationSummary,
  generationWarnings,
  currentEvent,
  selectedPeriodEvents,
  onSelectedEventChange,
  onToggleShiftsPublished,
  onAddDefaultShifts,
  onOpenCustomShiftModal,
  onAddBigPartyShifts,
  shiftsForEvent,
  addShift,
  updateShift,
  removeShift,
  periodResponses,
}: ShiftPlanningTabProps) {
  return (
    <Space direction="vertical" style={{ width: "100%" }} size="middle">
      <div
        style={{
          border: "1px solid #eee",
          borderRadius: 8,
          padding: 16,
          background: "#fafafa",
        }}
      >
        <Space direction="vertical" style={{ width: "100%" }} size="middle">
          <Text type="secondary">
            Status: {selectedPeriod.status} · Submitted: {submissionCount}
            {typeof expectedSubmissions === "number" ? ` / ${expectedSubmissions}` : ""}
            {typeof missingSubmissions === "number" ? ` · Missing: ${missingSubmissions}` : ""}
            {` · Shifts per member: ${shiftsPerMember}`}
          </Text>

          <Popconfirm
            title="Generate shift plan"
            description={
              (missingSubmissions ?? 0) > 0
                ? `${missingSubmissions} member(s) have not submitted availability and will be treated as leaving the bar. Generate new engagements for unassigned slots and create a new unpublished plan? Existing engagements are kept.`
                : "Generate new engagements for unassigned slots in the selected period's shifts and create a new unpublished plan? Existing engagements are kept."
            }
            onConfirm={onGeneratePlan}
          >
            <Button type="primary" icon={<RocketOutlined />} loading={generatingPlan}>
              Generate shift plan
            </Button>
          </Popconfirm>

          <Popconfirm
            title={`Publish shifts for ${selectedPeriod.name}?`}
            onConfirm={onPublishSelectedPeriodShifts}
          >
            <Button size="middle">{`Publish shifts for ${selectedPeriod.name}`}</Button>
          </Popconfirm>

          {generationSummary && <Alert type="success" showIcon message={generationSummary} />}
          {generationWarnings.length > 0 && (
            <Alert
              type="warning"
              showIcon
              message="Planner completed with warnings"
              description={
                <ul style={{ margin: 0, paddingLeft: 20 }}>
                  {generationWarnings.map((warning, index) => (
                    <li key={`${index}-${warning}`}>{warning}</li>
                  ))}
                </ul>
              }
            />
          )}
        </Space>
      </div>

      <ShiftEventInformationSection
        selectedPeriod={selectedPeriod}
        currentEvent={currentEvent}
        selectedPeriodEvents={selectedPeriodEvents}
        onSelectedEventChange={onSelectedEventChange}
        onToggleShiftsPublished={onToggleShiftsPublished}
        onAddDefaultShifts={onAddDefaultShifts}
        onOpenCustomShiftModal={onOpenCustomShiftModal}
        onAddBigPartyShifts={onAddBigPartyShifts}
        shiftsForEvent={shiftsForEvent}
        addShift={addShift}
        updateShift={updateShift}
        removeShift={removeShift}
        periodResponses={periodResponses}
      />
    </Space>
  );
}
