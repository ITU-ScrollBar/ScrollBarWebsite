import React from "react";
import { useState } from "react";
import { Button } from "antd";
import useEvents from "../../../hooks/useEvents";
import type { RadioChangeEvent } from "antd";
import EventInfo from "./EventInfo";
import { Radio, Tabs } from "antd";

export default function EventManagement() {
  const { addEvent, eventState } = useEvents();

  const findNextFridayAt15 = () => {
    const today = new Date();
    const nextFriday = new Date(
      today.setDate(today.getDate() + ((5 - today.getDay() + 7) % 7))
    );
    nextFriday.setHours(15, 0, 0, 0); // Set to 3 PM

    return nextFriday;
  };

  const createEventFromToday = () => {
    const nextFriday = findNextFridayAt15();
    const event = {
      start: nextFriday,
      end: new Date(nextFriday.getTime() + 60 * 60 * 11000), // 1 hour later
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

  const [showPreviousEvents, setShowPreviousEvents] = useState<boolean>(false);

  const handleModeChange = (e: RadioChangeEvent) => {
    setShowPreviousEvents(e.target.value);
  };
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  const { events } = eventState;
  const { previousEvents } = eventState;

  events.sort((a, b) => a.start.getTime() - b.start.getTime());
  previousEvents.sort((a, b) => b.start.getTime() - a.start.getTime());

  return (
    eventState.isLoaded && (
      <div>
        <div>
          <Radio.Group
            onChange={handleModeChange}
            value={showPreviousEvents}
            style={{ marginBottom: 8 }}
          >
            <Radio.Button value={false}>Current Events</Radio.Button>
            <Radio.Button value={true}>Previous Events</Radio.Button>
          </Radio.Group>
          <Button type="primary" onClick={() => createEventFromToday()}>
            Create new Event
          </Button>

          <Tabs
            onChange={(key) => setSelectedEventId(key)}
            defaultActiveKey="1"
            activeKey={selectedEventId || undefined}
            tabPosition={"left"}
            style={{}}
            items={Array.from(
              !showPreviousEvents ? events : previousEvents,
              (e, i) => {
                const id = e.id;
                return {
                  label: `${e.title} - ${e.start.toDateString() + " " + e.start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} to ${e.end.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`,
                  key: id,
                  disabled: i === 28,
                  children: <EventInfo event={e}></EventInfo>,
                };
              }
            )}
          />
        </div>
      </div>
    )
  );
}
