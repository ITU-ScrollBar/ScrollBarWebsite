import { Card, Checkbox, Col, Empty, Radio, Row, Space, Tag, Typography } from "antd";
import dayjs from "dayjs";
import { Shift } from "../../../../types/types-file";

const { Text } = Typography;

type EventGroup = {
  eventId: string;
  event?: { id: string; title: string; start: Date };
  shifts: Shift[];
};

type EventChoice = "can" | "cannot";

type EventAvailabilityGridProps = {
  groupedShifts: EventGroup[];
  mandatoryEventIds: Set<string>;
  eventChoices: Partial<Record<string, EventChoice>>;
  eventCanShiftIds: Record<string, string[]>;
  onEventChoiceChange: (eventId: string, value: EventChoice) => void;
  onCanShiftIdsChange: (eventId: string, shiftIds: string[]) => void;
};

export default function EventAvailabilityGrid({
  groupedShifts,
  mandatoryEventIds,
  eventChoices,
  eventCanShiftIds,
  onEventChoiceChange,
  onCanShiftIdsChange,
}: EventAvailabilityGridProps) {
  if (groupedShifts.length === 0) {
    return <Empty description="No shifts are connected to this planning period." />;
  }

  return (
    <Row gutter={[16, 16]}>
      {groupedShifts.map((group) => {
        const choice = eventChoices[group.eventId];
        const canShiftIds = eventCanShiftIds[group.eventId] ?? [];

        return (
          <Col key={group.eventId} xs={24} md={12} xl={8}>
            <Card
              size="small"
              style={{ height: "100%" }}
              title={
                <Space>
                  <span>{group.event?.title ?? "Event"}</span>
                  {mandatoryEventIds.has(group.eventId) && <Tag color="gold">Big party</Tag>}
                </Space>
              }
            >
              <Space direction="vertical" style={{ width: "100%" }}>
                <Text type="secondary">
                  {group.event?.start ? dayjs(group.event.start).format("DD/MM/YYYY") : "-"} ·{" "}
                  {group.shifts.length} shift{group.shifts.length === 1 ? "" : "s"}
                </Text>

                <Radio.Group
                  value={choice}
                  onChange={(event) =>
                    onEventChoiceChange(group.eventId, event.target.value as EventChoice)
                  }
                >
                  <Radio.Button value="can">Can work</Radio.Button>
                  <Radio.Button value="cannot">Cannot work</Radio.Button>
                </Radio.Group>

                {choice === "cannot" && (
                  <div>
                    <Text>Select shifts you can still attend for this event:</Text>
                    <Checkbox.Group
                      style={{ width: "100%", marginTop: 8 }}
                      value={canShiftIds}
                      onChange={(values) =>
                        onCanShiftIdsChange(group.eventId, values.map(String))
                      }
                    >
                      <Space direction="vertical">
                        {group.shifts.map((shift) => (
                          <Checkbox key={shift.id} value={shift.id}>
                            {shift.title} ({shift.location}) ·{" "}
                            {dayjs(shift.start).format("HH:mm")} -{" "}
                            {dayjs(shift.end).format("HH:mm")}
                          </Checkbox>
                        ))}
                      </Space>
                    </Checkbox.Group>
                  </div>
                )}
              </Space>
            </Card>
          </Col>
        );
      })}
    </Row>
  );
}
