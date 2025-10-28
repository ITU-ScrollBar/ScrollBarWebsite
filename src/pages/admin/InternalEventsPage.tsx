import { Content } from "antd/es/layout/layout";
import Loading from "../../components/Loading";
import useInternalEvents from "../../hooks/useInternalEvents";
import { Button, Card, Form, DatePicker, Input, Modal, Typography } from "antd";
import { InternalEvent, InternalEventCreateParams } from "../../types/types-file";
import { useState } from "react";
import type { Dayjs } from "dayjs";

export const InternalEventsPage = () => {
    const { internalEventState, addInternalEvent } = useInternalEvents();
    const [isCreateModalVisible, setIsCreateModalVisible] = useState<boolean>(false);

    if (internalEventState.loading) {
        return <Loading centerOverlay={true} resources={["internal events"]} />;
    }

    const handleCreateEvent = async (values: InternalEventFormValues) => {
        await addInternalEvent({
            ...values,
            start: values.start.toDate(),
            end: values.end.toDate(),
        });
    };
    
    return <div style={{ margin: '0 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography.Title level={2}>Manage Internal Events</Typography.Title>
            <Button type="primary" onClick={() => setIsCreateModalVisible(true)}>
                Add Internal Event
            </Button>
        </div>
        {isCreateModalVisible && <CreateInternalEventModal isOpen={isCreateModalVisible} onCreate={handleCreateEvent} onCancel={() => setIsCreateModalVisible(false)} />}
        <Content>
            {internalEventState.internalEvents.map((event) => renderInternalEvent({event}))}
        </Content>
    </div>;
};

const renderInternalEvent = ({event}: {event: InternalEvent}) => {
    return (
        <Card>
            <Typography.Title level={4}>{event.title}</Typography.Title>
            <Typography.Text strong>Location: {event.location}</Typography.Text><br />
            {/* Format date depending on multi-day or single-day event */}
            <Typography.Text strong>Date: {formatDate(event.start, event.end)}</Typography.Text><br />
            <Typography.Paragraph>{event.description}</Typography.Paragraph>
        </Card>
    );
}

const formatDate = (start: Date, end: Date) => {
    const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric' };
    if (start.toDateString() === end.toDateString()) {
        return start.toLocaleDateString(undefined, options);
    } else {
        return `${start.toLocaleDateString(undefined, options)} - ${end.toLocaleDateString(undefined, options)}`;
    }
};

type InternalEventFormValues = {
    title: string;
    location: string;
    start: Dayjs;
    end: Dayjs;
    description: string;
};

const CreateInternalEventModal = ({ isOpen, onCreate, onCancel }: { isOpen: boolean; onCreate: (values: InternalEventFormValues) => void; onCancel: () => void }) => {
    const [form] = Form.useForm<InternalEventFormValues>();

    return (
        <Modal open={isOpen} onOk={() => {
            form.validateFields().then((values) => {
                onCreate(values);
            });
        }} onCancel={onCancel}>
            <Typography.Title level={3}>Create Internal Event</Typography.Title>
            <Form layout="vertical" form={form}>
            <Form.Item label="Title" name="title" rules={[{ required: true, message: 'Please enter a title' }]}>
                <Input />
            </Form.Item>
            <Form.Item label="Location" name="location" rules={[{ required: true, message: 'Please enter a location' }]}>
                <Input />
            </Form.Item>
            <Form.Item label="Start date" name="start" rules={[{ required: true, message: 'Please select a start date' }]}>
                <DatePicker showTime />
            </Form.Item>
            <Form.Item label="End date" name="end" rules={[{ required: true, message: 'Please select an end date' }]}>
                <DatePicker showTime />
            </Form.Item>
            <Form.Item label="Description" name="description">
                <Input.TextArea />
            </Form.Item>
        </Form>
    </Modal>
    );
}