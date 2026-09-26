import { Content } from "antd/es/layout/layout";
import Loading from "../../components/Loading";
import { useInternalEventContext } from "../../contexts/InternalEventContext";
import {
  Button,
  Card,
  Form,
  DatePicker,
  Input,
  Modal,
  Typography,
  Select,
} from "antd";
import {
  InternalEvent,
  InternalEventCreateParams,
  scopeOptions,
  Team,
} from "../../types/types-file";
import { useEffect, useState } from "react";
import type { Dayjs } from "dayjs";
import dayjs from "dayjs";
import { updateInternalEvent } from "../../firebase/api/internalEvents";
import { useWindowSize } from "../../hooks/useWindowSize";
import { useTeamContext } from "../../contexts/TeamContext";
import { renderInternalEvent } from "../../components/InternalEventCard";

export const InternalEventsPage = () => {
  const { internalEventState, addInternalEvent } = useInternalEventContext();
  const [isModalVisible, setIsModalVisible] = useState<boolean>(false);
  const [editingEvent, setEditingEvent] = useState<InternalEvent | null>(null);
  const [internalEvents, setInternalEvents] = useState<InternalEvent[]>([]);
  const { isMobile } = useWindowSize();
  const { teamState } = useTeamContext();

  useEffect(() => {
    setInternalEvents(
      internalEventState.internalEvents.sort(
        (a, b) => a.start.getTime() - b.start.getTime()
      )
    );
  }, [internalEventState.internalEvents]);

  if (internalEventState.loading) {
    return <Loading centerOverlay={true} resources={["internal events"]} />;
  }

  const handleSave = async (values: InternalEventFormValues) => {
    if (values.id) {
      updateInternalEvent(toUpdateParams(values));
    } else {
      await addInternalEvent(toCreateParams(values));
    }
    setEditingEvent(null);
    setIsModalVisible(false);
  };

  return (
    <div style={isMobile ? { margin: "0 24px" } : { margin: "24px 96px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Typography.Title level={2}>Manage Internal Events</Typography.Title>
        <Button type="primary" onClick={() => setIsModalVisible(true)}>
          Add Internal Event
        </Button>
      </div>
      {isModalVisible && (
        <CreateOrEditModal
          isOpen={isModalVisible}
          onSave={handleSave}
          onCancel={() => {
            setIsModalVisible(false);
            setEditingEvent(null);
          }}
          initialValues={editingEvent ? toFormValues(editingEvent) : undefined}
        />
      )}
      <Content>
        <Card>
          {internalEvents.map((internalEvent) =>
            renderInternalEvent({
              internalEvent,
              teams: teamState.teams,
              onEdit: (editedEvent) => {
                setEditingEvent(editedEvent);
                setIsModalVisible(true);
              },
            })
          )}
        </Card>
      </Content>
    </div>
  );
};

type InternalEventFormValues = {
  id?: string;
  title: string;
  location: string;
  scope: string;
  date: [Dayjs, Dayjs];
  description?: string;
};

const CreateOrEditModal = ({
  isOpen,
  onSave,
  onCancel,
  initialValues,
}: {
  isOpen: boolean;
  onSave: (values: InternalEventFormValues) => void;
  onCancel: () => void;
  initialValues?: InternalEventFormValues;
}) => {
  const [form] = Form.useForm<InternalEventFormValues>();
  const { teamState } = useTeamContext();
  const [availableScopes, setAvailableScopes] = useState<
    (Team | (typeof scopeOptions)[number])[]
      >([]);
  const { isMobile } = useWindowSize();

  useEffect(() => {
    setAvailableScopes([...scopeOptions, ...teamState.teams]);
  }, [teamState.teams]);

  if (initialValues) {
    form.setFieldsValue(initialValues);
  }

  return (
    <Modal
      style={{ margin: "0 24px", maxWidth: "90vw" }}
      open={isOpen}
      centered={!isMobile}
      onOk={() => {
        form.validateFields().then((values) => {
          onSave(values);
        });
      }}
      onCancel={() => {
        if (form.isFieldsTouched()) {
          Modal.confirm({
            title: initialValues
              ? "Cancel editing event?"
              : "Cancel creating event?",
            content: "Are you sure you want to discard changes?",
            okText: "Yes",
            cancelText: "No",
            onOk() {
              form.resetFields();
              onCancel();
            },
          });
        } else {
          onCancel();
        }
      }}
    >
      <Typography.Title level={3}>
        {initialValues ? "Edit Internal Event" : "Create Internal Event"}
      </Typography.Title>
      <Form layout="vertical" form={form}>
        <Form.Item hidden label="ID" name="id">
          <Input disabled />
        </Form.Item>
        <Form.Item
          label="Title"
          name="title"
          rules={[{ required: true, message: "Please enter a title" }]}
        >
          <Input />
        </Form.Item>
        <Form.Item
          label="Location"
          name="location"
          rules={[{ required: true, message: "Please enter a location" }]}
        >
          <Input />
        </Form.Item>
        <Form.Item
          label="Date and time"
          name="date"
          rules={[{ required: true, message: "Please select a date and time" }]}
        >
          <DatePicker.RangePicker showTime showSecond={false} />
        </Form.Item>
        <Form.Item
          label="Scope"
          name="scope"
          rules={[{ required: true, message: "Please select a scope" }]}
        >
          <Select
            options={availableScopes.map((e) =>
              typeof e === "string"
                ? { label: e, value: e }
                : { label: e.name, value: e.id }
            )}
            optionRender={(e) =>
              e.label && typeof e.label === "string"
                ? e.label.charAt(0).toUpperCase() + e.label.slice(1)
                : ""
            }
            labelRender={(e) =>
              e.label && typeof e.label === "string"
                ? e.label.charAt(0).toUpperCase() + e.label.slice(1)
                : ""
            }
          />
        </Form.Item>
        <Form.Item label="Description" name="description">
          <Input.TextArea />
        </Form.Item>
      </Form>
    </Modal>
  );
};

const toFormValues = (event: InternalEvent): InternalEventFormValues => {
  return {
    id: event.id,
    title: event.title,
    location: event.location,
    scope: event.scope,
    date: [dayjs(event.start), dayjs(event.end)],
    description: event.description,
  };
};

const toCreateParams = (
  values: InternalEventFormValues
): InternalEventCreateParams => {
  return {
    title: values.title,
    location: values.location,
    start: values.date[0].toDate(),
    end: values.date[1].toDate(),
    description: values.description ?? "",
    scope: values.scope,
  };
};

const toUpdateParams = (values: InternalEventFormValues): InternalEvent => {
  return {
    id: values.id!,
    ...toCreateParams(values),
  };
};
