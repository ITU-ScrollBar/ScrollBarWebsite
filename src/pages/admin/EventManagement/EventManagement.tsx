import React from "react";
import { useState } from "react";
import { Button, Tabs, Layout, Space, Segmented } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import useEvents from "../../../hooks/useEvents";
import EventInfo from "./EventInfo";
const { Content } = Layout;

export default function EventManagement() {
  const { addEvent, eventState } = useEvents();
  const [showPreviousEvents, setShowPreviousEvents] = useState<boolean>(false);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  const findNextFridayAt15 = () => {
    const today = new Date();
    const nextFriday = new Date(
      today.setDate(today.getDate() + ((5 - today.getDay() + 7) % 7))
    );
    nextFriday.setHours(15, 0, 0, 0);
    return nextFriday;
  };

  const createEventFromToday = () => {
    const nextFriday = findNextFridayAt15();
    const event = {
      start: nextFriday,
      end: new Date(nextFriday.getTime() + 60 * 60 * 11000),
      description: "No description",
      title: "New Event",
      where: "ScrollBar",
      published: false,
      internal: false,
    };
    addEvent(event).then((e) => {
      if (e.id != null) setSelectedEventId(e.id);
    });
  };

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
              <Button
                type="primary"
                size="large"
                icon={<PlusOutlined />}
                onClick={createEventFromToday}
              >
                Create Event
              </Button>
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
              tabPosition="left"
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
              <Button type="primary" onClick={createEventFromToday}>
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
