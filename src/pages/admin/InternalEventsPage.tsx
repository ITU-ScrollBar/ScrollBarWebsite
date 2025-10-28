import { Content } from "antd/es/layout/layout";
import Loading from "../../components/Loading";
import useInternalEvents from "../../hooks/useInternalEvents";
import { Button, Card, Form, DatePicker, Input, Modal, Typography, Popconfirm } from "antd";
import { InternalEvent, InternalEventCreateParams } from "../../types/types-file";
import { useEffect, useState } from "react";
import type { Dayjs } from "dayjs";
import { DeleteOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { deleteInternalEvent, updateInternalEvent } from "../../firebase/api/internalEvents";
import { useWindowSize } from "../../hooks/useWindowSize";

export const InternalEventsPage = () => {
    const { internalEventState, addInternalEvent } = useInternalEvents();
    const [isModalVisible, setIsModalVisible] = useState<boolean>(false);
    const [editingEvent, setEditingEvent] = useState<InternalEvent | null>(null);
    const [internalEvents, setInternalEvents] = useState<InternalEvent[]>([]);
    const { isMobile } = useWindowSize();

    useEffect(() => {
        setInternalEvents(internalEventState.internalEvents.sort((a, b) => a.start.getTime() - b.start.getTime()));
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

    return <div style={isMobile ? { margin: '0 24px' } : { margin: '24px 96px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography.Title level={2}>Manage Internal Events</Typography.Title>
            <Button type="primary" onClick={() => setIsModalVisible(true)}>
                Add Internal Event
            </Button>
        </div>
        {isModalVisible && <CreateOrEditModal isOpen={isModalVisible} onSave={handleSave} onCancel={() => {setIsModalVisible(false); setEditingEvent(null)}} initialValues={editingEvent ? toFormValues(editingEvent) : undefined} />}
        <Content>
            {internalEvents.map((event) => renderInternalEvent({event, onEdit: (editedEvent) => {
                setEditingEvent(editedEvent);
                setIsModalVisible(true);
            }}))}
        </Content>
    </div>;
};

const renderInternalEvent = ({ event, onEdit }: {event: InternalEvent, onEdit: (event: InternalEvent) => void}) => {
    return (
        <Card key={event.id} style={{ marginBottom: 24 }} actions={[
            <Button key="edit" type="link" onClick={() => {
                onEdit(event);
            }}>Edit Event</Button>,
            <Popconfirm
                key="delete"
                title="Are you sure to delete this internal event?"
                onConfirm={() => {
                    deleteInternalEvent(event);
                }}
                okText="Yes"
                cancelText="No"
            >
                <Button icon={<DeleteOutlined />} type="link" danger>Delete Event</Button>
            </Popconfirm>,
        ]}>
            <Typography.Title style={{ marginTop: 0 }} level={4}>{event.title}</Typography.Title>
            <Typography.Text strong>Location: {event.location}</Typography.Text><br />
            {/* Format date depending on multi-day or single-day event */}
            <Typography.Text strong>Date: {formatDate(event.start, event.end)}</Typography.Text><br />
            <Typography.Paragraph>{event.description}</Typography.Paragraph>
        </Card>
    );
}

const formatDate = (start: Date, end: Date) => {
    const locale = "en-GB";
    const dateOptions: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric' };
    const timeOptions: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' };
    if (start.toDateString() === end.toDateString()) {
        return `${start.toLocaleDateString(locale, dateOptions)} - ${start.toLocaleTimeString(locale, timeOptions)} to ${end.toLocaleTimeString(locale, timeOptions)}`;
    } else {
        return `${start.toLocaleDateString(locale, dateOptions)} ${start.toLocaleTimeString(locale, timeOptions)} - ${end.toLocaleDateString(locale, dateOptions)} ${end.toLocaleTimeString(locale, timeOptions)}`;
    }
};

type InternalEventFormValues = {
    id?: string;
    title: string;
    location: string;
    date: [Dayjs, Dayjs];
    description: string;
};

const CreateOrEditModal = ({ isOpen, onSave, onCancel, initialValues }: { isOpen: boolean; onSave: (values: InternalEventFormValues) => void; onCancel: () => void; initialValues?: InternalEventFormValues }) => {
    const [form] = Form.useForm<InternalEventFormValues>();

    if (initialValues) {
        form.setFieldsValue(initialValues);
    }

    return (
        <Modal
            style={{ margin: '0 24px', maxWidth: '90vw' }} 
            open={isOpen}
            onOk={() => {
                form.validateFields().then((values) => {
                    onSave(values);
                });
            }}
            onCancel={() => {
                if (form.isFieldsTouched()) {
                    Modal.confirm({
                        title: initialValues ? 'Cancel editing event?' : 'Cancel creating event?',
                        content: 'Are you sure you want to discard changes?',
                        okText: 'Yes',
                        cancelText: 'No',
                        onOk() {
                            form.resetFields();
                            onCancel();
                        },
                    });
                } else {
                    onCancel();
                }
            }}>
            <Typography.Title level={3}>{initialValues ? 'Edit Internal Event' : 'Create Internal Event'}</Typography.Title>
            <Form layout="vertical" form={form}>
                <Form.Item hidden label="ID" name="id">
                    <Input disabled />
                </Form.Item>
                <Form.Item label="Title" name="title" rules={[{ required: true, message: 'Please enter a title' }]}>
                    <Input />
                </Form.Item>
                <Form.Item label="Location" name="location" rules={[{ required: true, message: 'Please enter a location' }]}>
                    <Input />
                </Form.Item>
                <Form.Item label="Date and time" name="date" rules={[{ required: true, message: 'Please select a date and time' }]}>
                    <DatePicker.RangePicker showTime showSecond={false} />
                </Form.Item>
                <Form.Item label="Description" name="description">
                    <Input.TextArea />
                </Form.Item>
            </Form>
    </Modal>
    );
}

const toFormValues = (event: InternalEvent): InternalEventFormValues => {
    return {
        id: event.id,
        title: event.title,
        location: event.location,
        date: [dayjs(event.start), dayjs(event.end)],
        description: event.description,
    };
};

const toCreateParams = (values: InternalEventFormValues): InternalEventCreateParams => {
    return {
        title: values.title,
        location: values.location,
        start: values.date[0].toDate(),
        end: values.date[1].toDate(),
        description: values.description,
    };
};

const toUpdateParams = (values: InternalEventFormValues): InternalEvent => {
    return {
        id: values.id!,
        ...toCreateParams(values),
    };
};
