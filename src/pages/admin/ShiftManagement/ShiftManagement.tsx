import { useState } from "react";
import { Layout, Space, Select, Empty } from "antd";
import { TeamOutlined } from "@ant-design/icons";
import useEvents from "../../../hooks/useEvents";
import { useShiftContext } from "../../../contexts/ShiftContext";
import ShiftInfo from "./ShiftInfo";
const { Content } = Layout;

export default function ShiftManagement() {
  const { eventState } = useEvents();
  const { shiftState } = useShiftContext();
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  const sortedEvents = [...eventState.events].sort(
    (a, b) => a.start.getTime() - b.start.getTime()
  );

  if (sortedEvents.length === 0) {
    return (
      <Layout style={{ minHeight: "100vh", background: "#f5f5f5" }}>
        <Content style={{ padding: "24px" }}>
          <div
            style={{
              background: "white",
              borderRadius: "8px",
              padding: "24px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
            }}
          >
            <h1 style={{ fontSize: "24px", fontWeight: 600, marginBottom: "16px" }}>
              <TeamOutlined style={{ marginRight: "12px" }} />
              Shift Management
            </h1>
            <Empty
              style={{ margin: "60px 0" }}
              description="No events available. Please create an event first."
            />
          </div>
        </Content>
      </Layout>
    );
  }

  const currentEvent =
    sortedEvents.find((e) => e.id === selectedEventId) || sortedEvents[0];

  const shiftsForEvent = shiftState.shifts.filter(
    (shift) => shift.eventId === currentEvent?.id
  ).sort((a, b) => a.start.getTime() - b.start.getTime());

  return eventState.isLoaded && shiftState.isLoaded ? (
    <Layout style={{ minHeight: "100vh", background: "#f5f5f5" }}>
      <Content style={{ padding: "24px" }}>
        <div
          style={{
            background: "white",
            borderRadius: "8px",
            padding: "24px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          }}
        >
          <Space
            direction="vertical"
            style={{ width: "100%", marginBottom: "24px" }}
            size="large"
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <h1 style={{ margin: 0, fontSize: "24px", fontWeight: 600 }}>
                <TeamOutlined style={{ marginRight: "12px" }} />
                Shift Management
              </h1>
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
                value={currentEvent?.id}
                onChange={(value) => setSelectedEventId(value)}
                placeholder="Select an event"
              >
                {sortedEvents.map((event) => (
                  <Select.Option key={event.id} value={event.id}>
                    {event.displayName || event.title} -{" "}
                    {event.start.toLocaleDateString()}
                  </Select.Option>
                ))}
              </Select>
            </div>
          </Space>

          {shiftsForEvent.length > 0 ? (
            shiftsForEvent.map((shift) => (
              <ShiftInfo shift={shift} />
            ))
          ) : (
            <Empty
              style={{ margin: "60px 0" }}
              description={
                currentEvent
                  ? `No shifts found for ${currentEvent.displayName || currentEvent.title}`
                  : "Please select an event"
              }
            />
          )}
        </div>
      </Content>
    </Layout>
  ) : (
    <div style={{ textAlign: "center", padding: "60px 24px" }}>Loading...</div>
  );
}
