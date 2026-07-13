import { useEffect, useMemo, useState } from "react";
import {
  App as AntdApp,
  Alert,
  Button,
  Card,
  Col,
  Descriptions,
  Drawer,
  Empty,
  Layout,
  Popconfirm,
  Row,
  Select,
  Space,
  Tag,
  Typography,
} from "antd";
import { Content } from "antd/es/layout/layout";
import { Loading } from "../../components/Loading";
import useTickets from "../../hooks/useTickets";
import {
  Ticket,
  TicketDepartment,
  TicketImpact,
  TicketRequestType,
  TicketStatus,
} from "../../types/types-file";

const { Title, Text } = Typography;

type DepartmentFilter = "all" | TicketDepartment;

type KanbanColumn = {
  key: "todo" | "in_progress" | "done";
  title: string;
  status: TicketStatus;
};

const departmentOptions = [
  { label: "All departments", value: "all" },
  { label: "Maintenance", value: TicketDepartment.MAINTENANCE },
  { label: "IT", value: TicketDepartment.IT },
];

const statusOptions = [
  { label: "To Do", value: "open" },
  { label: "In Progress", value: "in_progress" },
  { label: "Done", value: "resolved" },
];

const kanbanColumns: KanbanColumn[] = [
  { key: "todo", title: "To Do", status: "open" },
  { key: "in_progress", title: "In Progress", status: "in_progress" },
  { key: "done", title: "Done", status: "resolved" },
];

const requestTypeLabel: Record<TicketRequestType, string> = {
  [TicketRequestType.NEW_REQUEST]: "New Request",
  [TicketRequestType.BROKEN]: "Broken",
};

const impactLabel: Record<TicketImpact, string> = {
  [TicketImpact.LOW]: "Low",
  [TicketImpact.MEDIUM]: "Medium",
  [TicketImpact.HIGH]: "High",
};

const departmentLabel: Record<TicketDepartment, string> = {
  [TicketDepartment.MAINTENANCE]: "Maintenance",
  [TicketDepartment.IT]: "IT",
};

const formatDate = (value?: Date) => {
  if (!value) {
    return "-";
  }

  return value.toLocaleString("en-DK", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export default function TicketDashboardPage() {
  const { message } = AntdApp.useApp();
  const { ticketState, deleteTicket, updateTicket, updateTicketStatus } = useTickets();
  const [selectedDepartment, setSelectedDepartment] =
    useState<DepartmentFilter>("all");
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [editableTicket, setEditableTicket] = useState<{
    department: TicketDepartment;
    requestType: TicketRequestType;
    impact: TicketImpact;
    status: TicketStatus;
  } | null>(null);
  const [isSavingTicket, setIsSavingTicket] = useState(false);
  const [draggedTicketId, setDraggedTicketId] = useState<string | null>(null);
  const [hoveredColumnStatus, setHoveredColumnStatus] = useState<TicketStatus | null>(
    null
  );

  useEffect(() => {
    if (!ticketState.error) {
      return;
    }

    message.error("Unable to load tickets: " + ticketState.error);
  }, [message, ticketState.error]);

  const filteredTickets = useMemo(() => {
    if (selectedDepartment === "all") {
      return ticketState.tickets;
    }

    return ticketState.tickets.filter(
      (ticket) => ticket.department === selectedDepartment
    );
  }, [selectedDepartment, ticketState.tickets]);

  const ticketsByStatus = useMemo(() => {
    return {
      open: filteredTickets.filter((ticket) => ticket.status === "open"),
      in_progress: filteredTickets.filter(
        (ticket) => ticket.status === "in_progress"
      ),
      resolved: filteredTickets.filter((ticket) => ticket.status === "resolved"),
    };
  }, [filteredTickets]);

  useEffect(() => {
    if (!selectedTicket) {
      setEditableTicket(null);
      return;
    }

    setEditableTicket({
      department: selectedTicket.department,
      requestType: selectedTicket.requestType,
      impact: selectedTicket.impact,
      status: selectedTicket.status,
    });
  }, [selectedTicket]);

  useEffect(() => {
    if (!selectedTicket) {
      return;
    }

    const updatedTicket = ticketState.tickets.find(
      (ticket) => ticket.id === selectedTicket.id
    );

    if (updatedTicket) {
      setSelectedTicket(updatedTicket);
    }
  }, [selectedTicket, ticketState.tickets]);

  const onStatusChange = (nextStatus: TicketStatus) => {
    if (!editableTicket) {
      return;
    }

    setEditableTicket({
      ...editableTicket,
      status: nextStatus,
    });
  };

  const saveTicketChanges = async () => {
    if (!selectedTicket || !editableTicket) {
      return;
    }

    const updatePayload: {
      department?: TicketDepartment;
      requestType?: TicketRequestType;
      impact?: TicketImpact;
      status?: TicketStatus;
    } = {};

    if (editableTicket.department !== selectedTicket.department) {
      updatePayload.department = editableTicket.department;
    }

    if (editableTicket.requestType !== selectedTicket.requestType) {
      updatePayload.requestType = editableTicket.requestType;
    }

    if (editableTicket.impact !== selectedTicket.impact) {
      updatePayload.impact = editableTicket.impact;
    }

    if (editableTicket.status !== selectedTicket.status) {
      updatePayload.status = editableTicket.status;
    }

    if (Object.keys(updatePayload).length === 0) {
      message.info("No changes to save.");
      return;
    }

    setIsSavingTicket(true);
    try {
      await updateTicket(selectedTicket.id, updatePayload);
      message.success("Ticket updated.");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to update ticket.";
      message.error(errorMessage);
    } finally {
      setIsSavingTicket(false);
    }
  };

  const onDeleteTicket = async () => {
    if (!selectedTicket) {
      return;
    }

    setIsSavingTicket(true);
    try {
      await deleteTicket(selectedTicket.id);
      message.success("Ticket deleted.");
      setSelectedTicket(null);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to delete ticket.";
      message.error(errorMessage);
    } finally {
      setIsSavingTicket(false);
    }
  };

  const onTicketDrop = async (targetStatus: TicketStatus) => {
    if (!draggedTicketId) {
      return;
    }

    const ticket = ticketState.tickets.find((item) => item.id === draggedTicketId);
    if (!ticket || ticket.status === targetStatus) {
      setDraggedTicketId(null);
      setHoveredColumnStatus(null);
      return;
    }

    try {
      await updateTicketStatus(ticket.id, targetStatus);
      message.success("Ticket moved successfully.");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to move ticket.";
      message.error(errorMessage);
    } finally {
      setDraggedTicketId(null);
      setHoveredColumnStatus(null);
    }
  };

  if (ticketState.loading && !ticketState.isLoaded) {
    return <Loading />;
  }

  return (
    <Layout style={{ minHeight: "100vh", background: "#f5f5f5" }}>
      <Content style={{ padding: "24px 16px 32px" }}>
        <div style={{ marginBottom: 20 }}>
          <Title level={3} style={{ marginBottom: 8 }}>
            Ticket Dashboard
          </Title>
          <Text type="secondary">
            Review and process all incoming tickets by department and progress stage.
          </Text>
        </div>

        <div style={{ marginBottom: 20 }}>
          <Space wrap>
            <Text strong>Department</Text>
            <Select
              value={selectedDepartment}
              options={departmentOptions}
              onChange={(value: DepartmentFilter) => setSelectedDepartment(value)}
              style={{ minWidth: 220 }}
            />
          </Space>
        </div>

        {ticketState.error ? (
          <Alert
            type="error"
            showIcon
            title="Could not load tickets"
            description={ticketState.error}
            style={{ marginBottom: 20 }}
          />
        ) : null}

        <Row gutter={[16, 16]} align="stretch">
          {kanbanColumns.map((column) => {
            const columnTickets = ticketsByStatus[column.status] ?? [];

            return (
              <Col xs={24} md={12} lg={8} key={column.key}>
                <Card
                  title={`${column.title} (${columnTickets.length})`}
                  style={{
                    height: "100%",
                    borderColor:
                      hoveredColumnStatus === column.status ? "#1677ff" : undefined,
                    background:
                      hoveredColumnStatus === column.status ? "#f0f7ff" : undefined,
                  }}
                  onDragOver={(event) => {
                    event.preventDefault();
                    if (draggedTicketId) {
                      setHoveredColumnStatus(column.status);
                    }
                  }}
                  onDragLeave={() => {
                    if (hoveredColumnStatus === column.status) {
                      setHoveredColumnStatus(null);
                    }
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    void onTicketDrop(column.status);
                  }}
                  styles={{
                    body: {
                      display: "flex",
                      flexDirection: "column",
                      gap: 12,
                      minHeight: 220,
                    },
                  }}
                >
                  {columnTickets.length === 0 ? (
                    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No tickets" />
                  ) : (
                    columnTickets.map((ticket) => (
                      <Card
                        key={ticket.id}
                        hoverable
                        size="small"
                        draggable
                        onDragStart={() => {
                          setDraggedTicketId(ticket.id);
                        }}
                        onDragEnd={() => {
                          setDraggedTicketId(null);
                          setHoveredColumnStatus(null);
                        }}
                        onClick={() => setSelectedTicket(ticket)}
                        style={{ cursor: "grab" }}
                      >
                        <Space orientation="vertical" size={6} style={{ width: "100%" }}>
                          <Text strong>{ticket.title}</Text>
                          <Space wrap>
                            <Tag color="geekblue">{departmentLabel[ticket.department]}</Tag>
                            <Tag color="gold">{requestTypeLabel[ticket.requestType]}</Tag>
                            <Tag color="volcano">{impactLabel[ticket.impact]}</Tag>
                          </Space>
                          <Text type="secondary">Updated: {formatDate(ticket.updatedAt)}</Text>
                        </Space>
                      </Card>
                    ))
                  )}
                </Card>
              </Col>
            );
          })}
        </Row>

        <Drawer
          title={selectedTicket?.title || "Ticket"}
          open={Boolean(selectedTicket)}
          size="large"
          onClose={() => setSelectedTicket(null)}
          destroyOnClose
        >
          {selectedTicket && editableTicket ? (
            <Space orientation="vertical" size={18} style={{ width: "100%" }}>
              <div>
                <Text strong>Description</Text>
                <div
                  style={{
                    border: "1px solid #d9d9d9",
                    borderRadius: 6,
                    padding: 12,
                    background: "#fafafa",
                    whiteSpace: "pre-wrap",
                    minHeight: 88,
                    marginTop: 8,
                  }}
                >
                  {selectedTicket.description || "No description"}
                </div>
              </div>

              <Descriptions bordered column={1} size="small">
                <Descriptions.Item label="Department">
                  <Select
                    style={{ width: "100%" }}
                    options={departmentOptions.filter((option) => option.value !== "all")}
                    value={editableTicket.department}
                    onChange={(department: TicketDepartment) =>
                      setEditableTicket({
                        ...editableTicket,
                        department,
                      })
                    }
                  />
                </Descriptions.Item>
                <Descriptions.Item label="Request type">
                  <Select
                    style={{ width: "100%" }}
                    options={[
                      { label: "New Request", value: TicketRequestType.NEW_REQUEST },
                      { label: "Broken", value: TicketRequestType.BROKEN },
                    ]}
                    value={editableTicket.requestType}
                    onChange={(requestType: TicketRequestType) =>
                      setEditableTicket({
                        ...editableTicket,
                        requestType,
                      })
                    }
                  />
                </Descriptions.Item>
                <Descriptions.Item label="Impact">
                  <Select
                    style={{ width: "100%" }}
                    options={[
                      { label: "Low", value: TicketImpact.LOW },
                      { label: "Medium", value: TicketImpact.MEDIUM },
                      { label: "High", value: TicketImpact.HIGH },
                    ]}
                    value={editableTicket.impact}
                    onChange={(impact: TicketImpact) =>
                      setEditableTicket({
                        ...editableTicket,
                        impact,
                      })
                    }
                  />
                </Descriptions.Item>
                <Descriptions.Item label="Created">
                  {formatDate(selectedTicket.createdAt)}
                </Descriptions.Item>
                <Descriptions.Item label="Updated">
                  {formatDate(selectedTicket.updatedAt)}
                </Descriptions.Item>
              </Descriptions>

              <div>
                <Text strong>Status</Text>
                <Select
                  style={{ width: "100%", marginTop: 8 }}
                  options={statusOptions}
                  value={editableTicket.status}
                  onChange={onStatusChange}
                  loading={isSavingTicket}
                />
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  width: "100%",
                }}
              >
                <Button type="primary" onClick={saveTicketChanges} loading={isSavingTicket}>
                  Save Changes
                </Button>
                <Popconfirm
                  title="Delete this ticket?"
                  description="This will remove the ticket from the board."
                  okText="Delete"
                  cancelText="Cancel"
                  okButtonProps={{ danger: true, loading: isSavingTicket }}
                  onConfirm={() => {
                    void onDeleteTicket();
                  }}
                >
                  <Button danger disabled={isSavingTicket}>
                    Delete Ticket
                  </Button>
                </Popconfirm>
              </div>
            </Space>
          ) : null}
        </Drawer>
      </Content>
    </Layout>
  );
}
