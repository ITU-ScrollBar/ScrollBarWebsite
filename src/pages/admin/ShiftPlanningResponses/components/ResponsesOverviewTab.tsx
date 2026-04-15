import { Card, Col, Empty, Row, Space, Statistic, Table, Tag, Typography } from "antd";
import dayjs from "dayjs";
import { CommentsRow, EventAggregate, ParticipationStatus } from "../types";
import { getParticipationTagColor } from "../utils";

const { Text } = Typography;

type ResponsesOverviewTabProps = {
  participationSummary: {
    total: number;
    active: number;
    passive: number;
    legacy: number;
    leave: number;
  };
  regularAccessUsersCount: number;
  missingSurveyUsersCount: number;
  anchorSummary: {
    totalAnchors: number;
    newAnchors: number;
    leavingBar: number;
  };
  overallEventStats: EventAggregate[];
  commentsRows: CommentsRow[];
};

export default function ResponsesOverviewTab({
  participationSummary,
  regularAccessUsersCount,
  missingSurveyUsersCount,
  anchorSummary,
  overallEventStats,
  commentsRows,
}: ResponsesOverviewTabProps) {
  return (
    <Space direction="vertical" style={{ width: "100%" }} size="large">
      <Row gutter={[12, 12]}>
        <Col xs={12} md={6}>
          <Statistic
            title="Total responses"
            value={participationSummary.total}
            suffix={"/ " + regularAccessUsersCount}
          />
        </Col>
        <Col xs={12} md={6}>
          <Statistic title="Active" value={participationSummary.active} />
        </Col>
        <Col xs={12} md={6}>
          <Statistic title="Passive" value={participationSummary.passive} />
        </Col>
        <Col xs={12} md={6}>
          <Statistic title="Missing" value={missingSurveyUsersCount} />
        </Col>
        <Col xs={12} md={6}>
          <Statistic title="Total anchors" value={anchorSummary.totalAnchors} />
        </Col>
        <Col xs={12} md={6}>
          <Statistic title="New anchors" value={anchorSummary.newAnchors} />
        </Col>
        <Col xs={12} md={6}>
          <Statistic title="Leaving the bar" value={anchorSummary.leavingBar} />
        </Col>
      </Row>

      {overallEventStats.length === 0 ? (
        <Empty description="No events linked to this period." />
      ) : (
        <Row gutter={[16, 16]}>
          {overallEventStats.map((eventStat) => (
            <Col xs={24} md={12} xl={8} key={eventStat.eventId}>
              <Card
                size="small"
                title={eventStat.title}
                extra={
                  <Text type="secondary">
                    {eventStat.start ? dayjs(eventStat.start).format("DD/MM") : "-"}
                  </Text>
                }
              >
                <Space direction="vertical" style={{ width: "100%" }}>
                  <div>
                    <Tag color="green">Can: {eventStat.canCount}</Tag>
                    <Tag color="gold">Partial: {eventStat.partialCount}</Tag>
                    <Tag color="red">Cannot: {eventStat.cannotCount}</Tag>
                    <Tag>Unanswered: {eventStat.unansweredCount}</Tag>
                  </div>
                  <div>
                    {eventStat.shiftCounts.map((shiftCount) => (
                      <div
                        key={shiftCount.shiftId}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: 8,
                        }}
                      >
                        <Text>{shiftCount.shiftTitle}</Text>
                        <Text strong>{shiftCount.canCount}</Text>
                      </div>
                    ))}
                  </div>
                </Space>
              </Card>
            </Col>
          ))}
        </Row>
      )}

      <Card size="small" title="Comments">
        <Table
          rowKey="key"
          pagination={{ pageSize: 8 }}
          dataSource={commentsRows}
          locale={{ emptyText: "No comments submitted for this period." }}
          scroll={{ x: 780 }}
          columns={[
            {
              title: "User",
              dataIndex: "userName",
            },
            {
              title: "Comment",
              dataIndex: "comments",
              render: (value: string) => (
                <div
                  style={{
                    whiteSpace: "pre-wrap",
                    overflowWrap: "anywhere",
                  }}
                >
                  {value}
                </div>
              ),
            },
            {
              title: "Status",
              dataIndex: "participationStatus",
              render: (status: ParticipationStatus) => (
                <Tag color={getParticipationTagColor(status)}>{status}</Tag>
              ),
            },
            {
              title: "Submitted",
              dataIndex: "submittedAt",
              render: (value: Date | undefined) =>
                value ? dayjs(value).format("DD/MM/YYYY HH:mm") : "-",
            },
          ]}
        />
      </Card>
    </Space>
  );
}
