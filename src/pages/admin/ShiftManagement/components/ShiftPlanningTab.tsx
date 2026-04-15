import { PlusOutlined, RocketOutlined } from "@ant-design/icons";
import { Alert, Button, Card, Col, Empty, Popconfirm, Row, Select, Space, Switch } from "antd";
import Text from "antd/es/typography/Text";
import dayjs from "dayjs";
import ShiftConfigInfo from "../../EventManagement/ShiftInfo";
import ShiftAssignmentInfo from "../ShiftInfo";
import { Event, Shift, ShiftPlanningPeriod } from "../../../../types/types-file";

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
  updateShift: (id: string, field: string, value: unknown) => void;
  removeShift: (shift: Shift) => void;
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
  updateShift,
  removeShift,
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
            description="This replaces existing engagements for the selected period's shifts and creates a new unpublished plan. Continue?"
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

      <div>
        <label
          style={{
            display: "block",
            marginBottom: "8px",
            fontWeight: 500,
          }}
        >
          Select Event
        </label>
        <Select
          size="large"
          style={{ width: "100%", maxWidth: "400px" }}
          value={currentEvent?.id ?? undefined}
          onChange={onSelectedEventChange}
          placeholder="Select an event"
          options={selectedPeriodEvents.map((event) => ({
            value: event.id,
            label: `${event.displayName || event.title} - ${dayjs(event.start).format("DD/MM/YYYY")}`,
          }))}
        />
      </div>

      <div
        style={{
          border: "1px solid #eee",
          borderRadius: 8,
          padding: 16,
          background: "#fafafa",
        }}
      >
        <Space direction="vertical" style={{ width: "100%" }} size="middle">
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <Text>Shifts published</Text>
            <Switch
              checked={currentEvent?.shiftsPublished}
              onChange={onToggleShiftsPublished}
              disabled={!currentEvent}
            />
          </div>

          <Space wrap>
            <Button
              icon={<PlusOutlined />}
              onClick={onAddDefaultShifts}
              disabled={shiftsForEvent.length > 0}
            >
              Add default 3 shifts
            </Button>
            <Button icon={<PlusOutlined />} onClick={onOpenCustomShiftModal}>
              Add custom shift
            </Button>
            <Button
              icon={<PlusOutlined />}
              onClick={onAddBigPartyShifts}
              disabled={shiftsForEvent.length > 0}
            >
              Add default Big Party shifts
            </Button>
          </Space>

          {shiftsForEvent.length > 0 ? (
            <Row gutter={[12, 12]}>
              {shiftsForEvent.map((shift) => (
                <Col key={shift.id} xs={24} sm={24} md={12} xl={8}>
                  <Card
                    size="small"
                    title={`${shift.title} (${dayjs(shift.start).format("DD/MM HH:mm")}-${dayjs(shift.end).format("HH:mm")})`}
                    style={{
                      border: "1px solid #d9d9d9",
                      borderRadius: 8,
                      boxShadow: "0 1px 2px rgba(0, 0, 0, 0.04)",
                    }}
                  >
                    <Space direction="vertical" style={{ width: "100%" }} size="middle">
                      <ShiftConfigInfo
                        shift={shift}
                        updateShift={updateShift}
                        removeShift={removeShift}
                      />
                      <ShiftAssignmentInfo shift={shift} />
                    </Space>
                  </Card>
                </Col>
              ))}
            </Row>
          ) : (
            <Empty
              description={
                currentEvent
                  ? `No shifts configured for ${currentEvent.displayName || currentEvent.title}`
                  : "Please select an event"
              }
            />
          )}
        </Space>
      </div>
    </Space>
  );
}
