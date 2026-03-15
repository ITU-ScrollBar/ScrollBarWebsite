import React from "react";
import { useState } from "react";
import { Button, Tabs, Layout, Space, Segmented, Popconfirm, notification } from "antd";
import { PlusOutlined, UploadOutlined } from "@ant-design/icons";
import useEvents from "../../../hooks/useEvents";
import EventInfo from "./EventInfo";
import { useWindowSize } from "../../../hooks/useWindowSize";
const { Content } = Layout;

export default function EventManagement() {
  const { addEvent, eventState, updateEvent } = useEvents();
  const [showPreviousEvents, setShowPreviousEvents] = useState<boolean>(false);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const { isMobile } = useWindowSize();
  
  const { events, previousEvents } = eventState;
  const sortedEvents = [...events].sort(
    (a, b) => a.start.getTime() - b.start.getTime()
  );
  const sortedPreviousEvents = [...previousEvents].sort(
    (a, b) => b.start.getTime() - a.start.getTime()
  );
  
  const displayEvents = showPreviousEvents
  ? sortedPreviousEvents
  : sortedEvents;
  
  const findNextAvailableFridayAt15 = () => {
    const lastEvent = sortedEvents.length > 0
      ? sortedEvents[sortedEvents.length - 1].end
      : new Date(); // If no events, start from today
    const nextFriday = new Date(
      lastEvent.setDate(lastEvent.getDate() + ((5 - lastEvent.getDay() + 7) % 7))
    );
    nextFriday.setHours(15, 0, 0, 0);
    return nextFriday;
  };

  const createEventNextAvailableFriday = () => {
    const nextFriday = findNextAvailableFridayAt15();
    const event = {
      start: nextFriday,
      end: new Date(nextFriday.getTime() + 60 * 60 * 11000),
      description: "No description",
      title: "New Event",
      where: "ScrollBar",
      published: false,
      internal: false,
      shiftsPublished: false,
    };
    addEvent(event).then((e) => {
      if (e.id != null) setSelectedEventId(e.id);
    });
  };

  const publishFutureEvents = () => {
    for (const event of sortedEvents) {
      if (!event.published) {
        updateEvent(event.id, "published", true);
      }
      notification.success({
        message: "Success",
        description: "All future events have been published.",
      });
    }
  }

  const tabItems = displayEvents.map((e) => ({
    label: (
      <div style={{ textAlign: "left" }}>
        <div style={{ fontWeight: 600 }}>{e.title}</div>
        <div style={{ fontSize: "0.75em", color: "#666" }}>
          {e.start.toDateString()}{" "}
          {e.start.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </div>
      </div>
    ),
    key: e.id,
    children: <EventInfo event={e} />,
  }));

  return eventState.isLoaded ? (
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
                Event Management
              </h1>
              <div style={{ display: "flex", gap: "12px" }}>
                <Popconfirm
                  title="Are you sure you want to publish all future events?"
                  onConfirm={publishFutureEvents}
                  okText="Yes"
                  cancelText="No"
                >
                  <Button
                    type="default"
                    size="large"
                    icon={<UploadOutlined />}
                  >
                    Publish future events
                  </Button>
                </Popconfirm>
                <Button
                  type="primary"
                  size="large"
                  icon={<PlusOutlined />}
                  onClick={createEventNextAvailableFriday}
                >
                  Create Event
                </Button>
              </div>
            </div>

            <Segmented
              value={showPreviousEvents}
              onChange={(value) => setShowPreviousEvents(value as boolean)}
              options={[
                { label: "Current Events", value: false },
                { label: "Previous Events", value: true },
              ]}
            />
          </Space>

          {displayEvents.length > 0 ? (
            <Tabs
              activeKey={selectedEventId || displayEvents[0]?.id}
              onChange={(key) => setSelectedEventId(key)}
              items={tabItems}
              tabPosition={isMobile ? "top" : "left"}
              style={{ marginTop: "24px" }}
            />
          ) : (
            <div
              style={{
                textAlign: "center",
                padding: "60px 24px",
                color: "#999",
              }}
            >
              <p style={{ fontSize: "16px", marginBottom: "12px" }}>
                No events found
              </p>
              <Button type="primary" onClick={createEventNextAvailableFriday}>
                Create the first event
              </Button>
            </div>
          )}
        </div>
      </Content>
    </Layout>
  ) : (
    <div style={{ textAlign: "center", padding: "60px 24px" }}>Loading...</div>
  );
}
