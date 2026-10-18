import { Alert, Card, Col, Empty, List, Row, Space, Statistic, Tag, Typography } from "antd";
import { Link } from "react-router-dom";
import { Timestamp } from "firebase/firestore";
import { Loading } from "../../components/Loading";
import RoleTag from "../../components/RoleTag";
import { useAuth } from "../../contexts/AuthContext";
import { useEventContext } from "../../contexts/EventContext";
import { useShiftContext } from "../../contexts/ShiftContext";
import { useTenderContext } from "../../contexts/TenderContext";
import useTickets from "../../hooks/useTickets";
import { Role, TicketDepartment, TicketStatus } from "../../types/types-file";

const { Title, Text } = Typography;

const env = import.meta.env.VITE_APP_ENV as string;
const DAY_MS = 24 * 60 * 60 * 1000;
const TICKETS_SHOWN = 5;

const statusTag: Record<TicketStatus, { color: string; label: string }> = {
  open: { color: "red", label: "To Do" },
  in_progress: { color: "gold", label: "In Progress" },
  resolved: { color: "green", label: "Done" },
};

// Users are streamed raw, so this field is still a Firestore Timestamp at runtime.
const toDate = (value: unknown) => (value instanceof Timestamp ? value.toDate() : value instanceof Date ? value : undefined);

export default function ITDashboardPage() {
  const { currentUser } = useAuth();
  const { tenderState } = useTenderContext();
  const { eventState } = useEventContext();
  const { shiftState } = useShiftContext();
  const { ticketState } = useTickets();

  if (!tenderState.isLoaded || !eventState.isLoaded || !shiftState.isLoaded) {
    return <Loading />;
  }

  // Data retention deletes shifts and events older than 6 months, which is inside the live
  // 12-month window, so the streamed data is close to everything stored. Old records that
  // retention keeps because they are still linked to live ones are not counted.
  const now = new Date();
  const eventIds = new Set([...eventState.events, ...eventState.previousEvents].map((e) => e.id));
  const shifts = shiftState.shifts.filter((s) => eventIds.has(s.eventId));
  const users = tenderState.tenders;
  const calendarUsers = users.filter((u) => {
    const last = toDate(u.lastCalendarDownload);
    return last && now.getTime() - last.getTime() < 30 * DAY_MS;
  }).length;
  const roleCounts = Object.values(Role)
    .map((role) => ({ role, count: users.filter((u) => u.roles?.includes(role)).length }))
    .filter(({ count }) => count > 0);

  const itTickets = ticketState.tickets
    .filter((t) => t.department === TicketDepartment.IT && t.status !== "resolved")
    .sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0));

  const stats = [
    { title: "Active users", value: users.length },
    { title: "Admins", value: users.filter((u) => u.isAdmin).length },
    { title: "Upcoming events", value: eventState.events.length, suffix: `/ ${eventIds.size} total` },
    { title: "Upcoming shifts", value: shifts.filter((s) => s.start > now).length, suffix: `/ ${shifts.length} total` },
    { title: "Open IT tickets", value: itTickets.filter((t) => t.status === "open").length },
    { title: "IT tickets in progress", value: itTickets.filter((t) => t.status === "in_progress").length },
    { title: "Calendar feed users (30 days)", value: calendarUsers },
  ];

  return (
    <div style={{ padding: 16, maxWidth: 1200, margin: "0 auto" }}>
      <Space align="center" style={{ marginBottom: 16 }}>
        <Title level={2} style={{ margin: 0 }}>IT Dashboard</Title>
        <Tag color={env === "prod" ? "red" : "blue"}>{env}</Tag>
      </Space>

      <Row gutter={[16, 16]}>
        {stats.map((stat) => (
          <Col key={stat.title} xs={12} md={8} lg={6}>
            <Card>
              <Statistic {...stat} />
            </Card>
          </Col>
        ))}
      </Row>
      <Text type="secondary">Totals cover the last 12 months; older shifts and events are cleaned up automatically.</Text>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={16}>
          <Card
            title="Open and in progress IT tickets"
            extra={currentUser?.roles?.includes(Role.BOARD) && <Link to="/admin/dashboard">Ticket board</Link>}
          >
            {ticketState.error ? (
              <Alert type="error" message={ticketState.error} />
            ) : !ticketState.isLoaded ? (
              <Loading />
            ) : itTickets.length === 0 ? (
              <Empty description="No open IT tickets" />
            ) : (
              <List
                dataSource={itTickets.slice(0, TICKETS_SHOWN)}
                renderItem={(ticket) => (
                  <List.Item extra={<Tag color={statusTag[ticket.status].color}>{statusTag[ticket.status].label}</Tag>}>
                    <List.Item.Meta
                      title={ticket.title}
                      description={`${ticket.impact} impact · ${ticket.createdAt?.toLocaleDateString() ?? "-"}`}
                    />
                  </List.Item>
                )}
              />
            )}
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card title="Active users by role">
            <Space direction="vertical">
              {roleCounts.map(({ role, count }) => (
                <Space key={role}>
                  <RoleTag role={role} />
                  <Text>{count}</Text>
                </Space>
              ))}
            </Space>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
