import React, { useState } from "react";
import { Event } from "../../../types/types-file";
import Title from "antd/es/typography/Title";
import useEvents from "../../../hooks/useEvents";
import {
  Button,
  DatePicker,
  Tabs,
  Space,
  message,
  Modal,
  Input,
  InputNumber,
} from "antd";
import dayjs from "dayjs";
import TextArea from "antd/es/input/TextArea";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import useShifts from "../../../hooks/useShifts";
import ShiftInfo from "./ShiftInfo";
import { PlusOutlined } from "@ant-design/icons";

export default function EventInfo(props: { event: Event }) {
  const { updateEvent, removeEvent } = useEvents();
  const [activeTab, setActiveTab] = useState("edit");
  const { shiftState, updateShift, addShift, removeShift } = useShifts();
  const [isCustomShiftModalOpen, setIsCustomShiftModalOpen] = useState(false);
  const [customShiftTitle, setCustomShiftTitle] = useState("");
  const [customShiftLocation, setCustomShiftLocation] = useState(
    props.event.where || "Main bar"
  );
  const [customShiftStart, setCustomShiftStart] = useState<Date>(
    new Date(props.event.start)
  );
  const [customShiftEnd, setCustomShiftEnd] = useState<Date>(
    new Date(props.event.start.getTime() + 5 * 60 * 60 * 1000)
  );
  const [customShiftAnchors, setCustomShiftAnchors] = useState(1);
  const [customShiftTenders, setCustomShiftTenders] = useState(4);

  const handleDescriptionChange = (
    e: React.ChangeEvent<HTMLTextAreaElement>
  ) => {
    updateEvent(props.event.id, "description", e.target.value);
  };

  const shifts = shiftState.shifts.filter(
    (shift) => shift.eventId === props.event.id
  );

  const addDefaultShifts = () => {
    const eventStart = new Date(props.event.start);
    const eventEnd = new Date(props.event.end);

    // Calculate opening shift (event start time to start + 5 hours)
    const openingEnd = new Date(eventStart.getTime() + 5 * 60 * 60 * 1000);

    // Calculate middle shift (opening end to middle end + 4 hours)
    const middleEnd = new Date(openingEnd.getTime() + 4 * 60 * 60 * 1000);

    // Calculate closing shift (middle end to event end)

    const defaultShifts = [
      {
        id: "",
        eventId: props.event.id,
        title: "Opening",
        location: props.event.where || "Main bar",
        start: eventStart,
        end: openingEnd,
        anchors: 1,
        tenders: 4,
      },
      {
        id: "",
        eventId: props.event.id,
        title: "Middle",
        location: props.event.where || "Main bar",
        start: openingEnd,
        end: middleEnd,
        anchors: 1,
        tenders: 7,
      },
      {
        id: "",
        eventId: props.event.id,
        title: "Closing",
        location: props.event.where || "Main bar",
        start: middleEnd,
        end: eventEnd,
        anchors: 1,
        tenders: 7,
      },
    ];

    Promise.all(defaultShifts.map((shift) => addShift(shift)))
      .then(() => message.success("Default shifts added successfully"))
      .catch(() => message.error("Failed to add shifts"));
  };

  const addBigPartyShifts = () => {
    const eventStart = new Date(props.event.start);
    const eventEnd = new Date(props.event.end);

    // Opening: event start to start + 5 hours
    const openingEnd = new Date(eventStart.getTime() + 5 * 60 * 60 * 1000);

    // Closing: opening end to event end

    const bigPartyShifts = [
      {
        id: "",
        eventId: props.event.id,
        title: "Opening",
        location: props.event.where || "Main bar",
        start: eventStart,
        end: openingEnd,
        anchors: 1,
        tenders: 4,
      },
      {
        id: "",
        eventId: props.event.id,
        title: "Closing",
        location: props.event.where || "Main bar",
        start: openingEnd,
        end: eventEnd,
        anchors: 1,
        tenders: 7,
      },
    ];

    Promise.all(bigPartyShifts.map((shift) => addShift(shift)))
      .then(() => message.success("Big party shifts added successfully"))
      .catch(() => message.error("Failed to add shifts"));
  };

  const handleAddCustomShift = () => {
    if (!customShiftTitle) {
      message.error("Please enter a shift title");
      return;
    }

    const newShift = {
      id: "",
      eventId: props.event.id,
      title: customShiftTitle,
      location: customShiftLocation,
      start: customShiftStart,
      end: customShiftEnd,
      anchors: customShiftAnchors,
      tenders: customShiftTenders,
    };

    addShift(newShift)
      .then(() => {
        message.success("Custom shift added successfully");
        setIsCustomShiftModalOpen(false);
        setCustomShiftTitle("");
        setCustomShiftLocation(props.event.where || "Main bar");
        setCustomShiftStart(new Date(props.event.start));
        setCustomShiftEnd(
          new Date(props.event.start.getTime() + 5 * 60 * 60 * 1000)
        );
        setCustomShiftAnchors(1);
        setCustomShiftTenders(4);
      })
      .catch(() => message.error("Failed to add custom shift"));
  };

  return (
    <div>
      <Button type="primary" danger onClick={() => removeEvent(props.event.id)}>
        Delete Event
      </Button>
      <Title
        level={3}
        editable={{
          onChange: (value) => updateEvent(props.event.id, "title", value),
        }}
      >
        {props.event.title}
      </Title>
      <Title
        level={4}
        editable={{
          onChange: (value) => updateEvent(props.event.id, "where", value),
        }}
      >
        {props.event.where}
      </Title>
      From
      <DatePicker
        format="DD-MM-YYYY HH:mm"
        showTime
        value={dayjs(props.event.start)}
        onChange={(value) =>
          updateEvent(props.event.id, "start", value.toDate())
        }
      />
      To
      <DatePicker
        format="DD-MM-YYYY HH:mm"
        showTime
        value={dayjs(props.event.end)}
        onChange={(value) => updateEvent(props.event.id, "end", value.toDate())}
      />
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: "edit",
            label: "Edit Description",
            children: (
              <TextArea
                rows={6}
                placeholder="Write a description using Markdown..."
                value={props.event.description || ""}
                onChange={handleDescriptionChange}
              />
            ),
          },
          {
            key: "preview",
            label: "Preview",
            children: (
              <div className="p-2 border rounded-md bg-gray-50 prose prose-sm max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {props.event.description || "*No description yet*"}
                </ReactMarkdown>
              </div>
            ),
          },
        ]}
      />
      <Title level={4}>Shifts</Title>
      <Space style={{ marginBottom: "16px" }}>
        <Button
          icon={<PlusOutlined />}
          onClick={addDefaultShifts}
          disabled={shifts.length > 0}
        >
          Add default 3 shifts
        </Button>
        <Button
          icon={<PlusOutlined />}
          onClick={() => setIsCustomShiftModalOpen(true)}
        >
          Add custom shift
        </Button>
        <Button
          icon={<PlusOutlined />}
          onClick={addBigPartyShifts}
          disabled={shifts.length > 0}
        >
          Add default Big Party Shifts
        </Button>
      </Space>
      <Modal
        title="Add Custom Shift"
        open={isCustomShiftModalOpen}
        onOk={handleAddCustomShift}
        onCancel={() => setIsCustomShiftModalOpen(false)}
        okText="Add Shift"
      >
        <Space direction="vertical" style={{ width: "100%" }} size="middle">
          <div>
            <label style={{ display: "block", marginBottom: "4px" }}>
              Title
            </label>
            <Input
              placeholder="Shift title"
              value={customShiftTitle}
              onChange={(e) => setCustomShiftTitle(e.target.value)}
            />
          </div>

          <div>
            <label style={{ display: "block", marginBottom: "4px" }}>
              Location
            </label>
            <Input
              placeholder="Location"
              value={customShiftLocation}
              onChange={(e) => setCustomShiftLocation(e.target.value)}
            />
          </div>

          <div>
            <label style={{ display: "block", marginBottom: "4px" }}>
              Start Time
            </label>
            <DatePicker
              format="DD-MM-YYYY HH:mm"
              showTime
              value={dayjs(customShiftStart)}
              onChange={(value) =>
                setCustomShiftStart(value?.toDate() || new Date(props.event.start))
              }
              style={{ width: "100%" }}
            />
          </div>

          <div>
            <label style={{ display: "block", marginBottom: "4px" }}>
              End Time
            </label>
            <DatePicker
              format="DD-MM-YYYY HH:mm"
              showTime
              value={dayjs(customShiftEnd)}
              onChange={(value) =>
                setCustomShiftEnd(
                  value?.toDate() || new Date(props.event.start.getTime() + 5 * 60 * 60 * 1000)
                )
              }
              style={{ width: "100%" }}
            />
          </div>

          <div style={{ display: "flex", gap: "16px" }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: "block", marginBottom: "4px" }}>
                Anchors
              </label>
              <InputNumber
                min={0}
                value={customShiftAnchors}
                onChange={(value) => setCustomShiftAnchors(value || 0)}
                style={{ width: "100%" }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: "block", marginBottom: "4px" }}>
                Tenders
              </label>
              <InputNumber
                min={0}
                value={customShiftTenders}
                onChange={(value) => setCustomShiftTenders(value || 0)}
                style={{ width: "100%" }}
              />
            </div>
          </div>
        </Space>
      </Modal>
      {shifts && shifts.length > 0 ? (
        shifts.map((shift) => (
          <ShiftInfo
            key={shift.id}
            shift={shift}
            updateShift={updateShift}
            removeShift={removeShift}
          />
        ))
      ) : (
        <p>No shifts yet.</p>
      )}
    </div>
  );
}
