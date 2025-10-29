import { Content } from "antd/es/layout/layout";
import Loading from "../../components/Loading";
import useInternalEvents from "../../hooks/useInternalEvents";
import { Button, Card, Form, DatePicker, Input, Modal, Typography, Popconfirm, Select } from "antd";
import { InternalEvent, InternalEventCreateParams, scopeOptions, Team } from "../../types/types-file";
import { useEffect, useState } from "react";
import type { Dayjs } from "dayjs";
import { DeleteOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { deleteInternalEvent, updateInternalEvent } from "../../firebase/api/internalEvents";
import { useWindowSize } from "../../hooks/useWindowSize";
import useTeams from "../../hooks/useTeams";

export const InternalEventsPage = () => {
    const { internalEventState, addInternalEvent } = useInternalEvents();
    const [isModalVisible, setIsModalVisible] = useState<boolean>(false);
    const [editingEvent, setEditingEvent] = useState<InternalEvent | null>(null);
    const [internalEvents, setInternalEvents] = useState<InternalEvent[]>([]);
    const { isMobile } = useWindowSize();
    const { teamState } = useTeams();


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
            {internalEvents.map((internalEvent) => renderInternalEvent({internalEvent, teams: teamState.teams, onEdit: (editedEvent) => {
                setEditingEvent(editedEvent);
                setIsModalVisible(true);
            }}))}
        </Content>
    </div>;
};

export const renderInternalEvent = ({ internalEvent, teams, onEdit }: {internalEvent: InternalEvent, teams: Team[], onEdit?: (internalEvent: InternalEvent) => void}) => {
    const actions = onEdit ? [
            <Button key="edit" type="link" onClick={() => {
                onEdit(internalEvent);
            }}>Edit Event</Button>,
            <Popconfirm
                key="delete"
                title="Are you sure to delete this internal event?"
                onConfirm={() => {
                    deleteInternalEvent(internalEvent);
                }}
                okText="Yes"
                cancelText="No"
            >
                <Button icon={<DeleteOutlined />} type="link" danger>Delete Event</Button>
            </Popconfirm>,
        ] : [];

    const team = teams.find((team) => team.id === internalEvent.scope);
    const scopeText = (team
        ? team.name
        : internalEvent.scope as string);

    return (
        <Card key={internalEvent.id} style={{ marginBottom: 24, boxShadow: "inset 0 1px 3px rgba(7, 7, 7, 0.3)" }} actions={actions}>
            <Typography.Title style={{ marginTop: 0 }} level={4}>{internalEvent.title}</Typography.Title>
            <Typography.Text strong>Location: {internalEvent.location}</Typography.Text><br />
            {/* Format date depending on multi-day or single-day event */}
            <Typography.Text strong>Date: {formatDate(internalEvent.start, internalEvent.end)}</Typography.Text><br />
            {onEdit && <> <Typography.Text strong>Relevant for: {scopeText.charAt(0).toUpperCase() + scopeText.slice(1)}</Typography.Text><br /></>}
            <Typography.Paragraph>{internalEvent.description}</Typography.Paragraph>
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
    scope: string;
    date: [Dayjs, Dayjs];
    description?: string;
};

const CreateOrEditModal = ({ isOpen, onSave, onCancel, initialValues }: { isOpen: boolean; onSave: (values: InternalEventFormValues) => void; onCancel: () => void; initialValues?: InternalEventFormValues }) => {
    const [form] = Form.useForm<InternalEventFormValues>();
    const { teamState } = useTeams();
    const [availableScopes, setAvailableScopes] = useState<(Team | typeof scopeOptions[number])[]>([]);

    useEffect(() => {
        setAvailableScopes([...scopeOptions, ...teamState.teams]);
    }, [teamState.teams]);

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
                <Form.Item label="Scope" name="scope" rules={[{ required: true, message: 'Please select a scope' }]}>
                    <Select
                        options={availableScopes.map(e => (typeof e === 'string' ? { label: e, value: e } : { label: e.name, value: e.id }))}
                        optionRender={e => e.label && typeof e.label === 'string' ? e.label.charAt(0).toUpperCase() + e.label.slice(1) : ''}
                        labelRender={e => e.label && typeof e.label === 'string' ? e.label.charAt(0).toUpperCase() + e.label.slice(1) : ''}
                    />
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
        scope: event.scope,
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
        scope: values.scope,
    };
};

const toUpdateParams = (values: InternalEventFormValues): InternalEvent => {
    return {
        id: values.id!,
        ...toCreateParams(values),
    };
};
