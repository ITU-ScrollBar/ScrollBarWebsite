import { PlusOutlined } from "@ant-design/icons";
import { Button, Card, Col, Empty, message, Row, Select, Space, Switch } from "antd";
import Text from "antd/es/typography/Text";
import dayjs from "dayjs";
import { useMemo } from "react";
import { useShiftContext } from "../../../../contexts/ShiftContext";
import { useShiftPlanningContext } from "../../../../contexts/ShiftPlanningContext";
import { useEventContext } from "../../../../contexts/EventContext";
import { Event, Shift } from "../../../../types/types-file";
import ShiftAssignmentInfo from "./ShiftAssignmentInfo";
import ShiftInfo from "./ShiftInfo";

type ShiftEventInformationSectionProps = {
  currentEvent: Event | null;
  onSelectedEventChange: (eventId: string) => void;
  onToggleShiftsPublished: (checked: boolean) => void;
  onAddDefaultShifts: () => void;
  onOpenCustomShiftModal: () => void;
  onAddBigPartyShifts: () => void;
};

export default function ShiftEventInformationSection({
  currentEvent,
  onSelectedEventChange,
  onToggleShiftsPublished,
  onAddDefaultShifts,
  onOpenCustomShiftModal,
  onAddBigPartyShifts,
}: ShiftEventInformationSectionProps) {
  const { shiftState, addShift, updateShift, removeShift } = useShiftContext();
  const { periodState, selectedPeriodId, responseState } = useShiftPlanningContext();
  const { eventState } = useEventContext();

  const selectedPeriod = useMemo(
    () => periodState.periods.find((p) => p.id === selectedPeriodId) ?? null,
    [periodState.periods, selectedPeriodId]
  );

  const allEvents = useMemo(
    () => [...eventState.events, ...eventState.previousEvents],
    [eventState.events, eventState.previousEvents]
  );

  const selectedPeriodEvents = useMemo(() => {
    if (!selectedPeriod) return [];
    const selectedEventIds = new Set(selectedPeriod.eventIds);
    return allEvents
      .filter((event) => selectedEventIds.has(event.id))
      .sort((a, b) => a.start.getTime() - b.start.getTime());
  }, [allEvents, selectedPeriod]);

  const shiftsForEvent = useMemo(
    () =>
      shiftState.shifts
        .filter((shift) => shift.eventId === currentEvent?.id)
        .sort((a, b) => a.start.getTime() - b.start.getTime()),
    [currentEvent?.id, shiftState.shifts]
  );

  const periodResponses = responseState.responses;

  const satelliteByPrimaryId = useMemo(() => {
    const map = new Map<string, Shift>();
    for (const shift of shiftsForEvent) {
      if (shift.linkedShiftId) {
        map.set(shift.linkedShiftId, shift);
      }
    }
    return map;
  }, [shiftsForEvent]);

  const primaryShifts = useMemo(
    () => shiftsForEvent.filter((shift) => !shift.linkedShiftId),
    [shiftsForEvent]
  );

  const handleRemoveShift = async (shift: Shift) => {
    try {
      const satellite = satelliteByPrimaryId.get(shift.id);
      if (satellite) {
        await removeShift(satellite);
      }
      await removeShift(shift);
    } catch {
      message.error("Failed to remove shift.");
    }
  };

  const handleAddSatellite = async (primary: Shift) => {
    try {
      await addShift({
        id: "",
        eventId: primary.eventId,
        title: primary.title,
        location: "Satellite",
        start: primary.start,
        end: primary.end,
        tenders: primary.tenders,
        category: primary.category,
        linkedShiftId: primary.id,
      });
    } catch {
      message.error("Failed to add satellite shift.");
    }
  };

  return (
    <Space direction="vertical" style={{ width: "100%" }} size="middle">
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

          {primaryShifts.length > 0 ? (
            <Row gutter={[12, 12]}>
              {primaryShifts.map((shift) => {
                const satellite = satelliteByPrimaryId.get(shift.id);
                return (
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
                        <ShiftInfo
                          shift={shift}
                          removeShift={handleRemoveShift}
                          isMandatory={selectedPeriod?.mandatoryEventIds?.includes(shift.eventId)}
                          satelliteShift={satellite}
                          onAddSatellite={() => handleAddSatellite(shift)}
                          onRemoveSatellite={() => {
                            if (satellite) {
                              removeShift(satellite).catch(() => message.error("Failed to remove satellite shift."));
                            }
                          }}
                          onUpdateSatellite={(field, value) => {
                            if (satellite) {
                              updateShift(satellite.id, field, value);
                            }
                          }}
                          primaryAssignment={(
                            <ShiftAssignmentInfo
                              shift={shift}
                              periodResponses={periodResponses}
                              eventTitle={currentEvent?.title ?? ""}
                            />
                          )}
                          satelliteAssignment={satellite ? (
                            <ShiftAssignmentInfo
                              shift={satellite}
                              periodResponses={periodResponses}
                              eventTitle={currentEvent?.title ?? ""}
                            />
                          ) : undefined}
                        />
                      </Space>
                    </Card>
                  </Col>
                );
              })}
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
