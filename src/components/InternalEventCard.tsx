import { Button, Card, Popconfirm, Typography } from "antd";
import { DeleteOutlined } from "@ant-design/icons";
import { InternalEvent, Team } from "../types/types-file";
import { deleteInternalEvent } from "../firebase/api/internalEvents";

// Kept out of the admin InternalEventsPage so member pages (e.g. the profile's
// shift list) can render internal events without pulling in the admin form,
// date picker and dayjs code.
export const renderInternalEvent = ({
  internalEvent,
  teams,
  onEdit,
}: {
  internalEvent: InternalEvent;
  teams: Team[];
  onEdit?: (internalEvent: InternalEvent) => void;
}) => {
  const BOX_SHADOW = "inset 0 1px 3px rgba(7, 7, 7, 0.3)";
  const LIGHT_GRAY = "#e1e1e1ff";
  const GRAY_TEXT = "#555555ff";

  const actions = onEdit
    ? [
      <Button
        key="edit"
        type="link"
        onClick={() => {
          onEdit(internalEvent);
        }}
      >
        Edit Event
      </Button>,
      <Popconfirm
        key="delete"
        title="Are you sure to delete this internal event?"
        onConfirm={() => {
          deleteInternalEvent(internalEvent);
        }}
        okText="Yes"
        cancelText="No"
      >
        <Button icon={<DeleteOutlined />} type="link" danger>
          Delete Event
        </Button>
      </Popconfirm>,
    ]
    : [];

  const team = teams.find((team) => team.id === internalEvent.scope);
  const scopeText = team ? team.name : internalEvent.scope;
  const isSingleDayEvent = internalEvent.start.toDateString() === internalEvent.end.toDateString();

  return (
    <>
      <Typography.Title
        level={2}
        style={{ marginBottom: 12, color: GRAY_TEXT }}
      >
        {internalEvent.title} {formatDateShort(internalEvent.start)}
      </Typography.Title>
      <Card
        key={internalEvent.id}
        style={{
          backgroundColor: LIGHT_GRAY,
          marginBottom: 24,
          boxShadow: BOX_SHADOW,
        }}
        actions={actions}
      >
        <Typography.Text strong style={{ color: GRAY_TEXT }}>
          Location: {internalEvent.location} -{" "}
          <Typography.Text italic style={{ color: GRAY_TEXT }}>
            ({scopeText.charAt(0).toUpperCase() + scopeText.slice(1)})
          </Typography.Text>
        </Typography.Text>
        <br />
        <Typography.Text strong style={{ color: GRAY_TEXT }}>
          {isSingleDayEvent ? "Time:" : "Date:"} {formatDate(internalEvent.start, internalEvent.end, isSingleDayEvent)}
        </Typography.Text>
        <br />
        <Typography.Text style={{ color: GRAY_TEXT }}>
          {internalEvent.description}
        </Typography.Text>
      </Card>
    </>
  );
};

const formatDateShort = (start: Date) => {
  const locale = "en-GB";
  const options: Intl.DateTimeFormatOptions = {
    month: "numeric",
    day: "numeric",
  };
  return `(${start.toLocaleDateString(locale, options)})`;
};

const formatDate = (start: Date, end: Date, isSingleDayEvent: boolean) => {
  const locale = "en-GB";
  const dateOptions: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "numeric",
    day: "numeric",
  };
  const timeOptions: Intl.DateTimeFormatOptions = {
    hour: "2-digit",
    minute: "2-digit",
  };
  if (isSingleDayEvent) {
    return `${start.toLocaleTimeString(locale, timeOptions)} to ${end.toLocaleTimeString(locale, timeOptions)}`;
  } else {
    return `${start.toLocaleDateString(locale, dateOptions)} ${start.toLocaleTimeString(locale, timeOptions)} - ${end.toLocaleDateString(locale, dateOptions)} ${end.toLocaleTimeString(locale, timeOptions)}`;
  }
};
