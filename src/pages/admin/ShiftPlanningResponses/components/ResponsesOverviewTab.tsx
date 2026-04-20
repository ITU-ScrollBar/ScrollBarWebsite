import { Card, Col, Empty, Row, Space, Statistic, Table, Tag, Typography } from "antd";
import dayjs from "dayjs";
import { ShiftPlanningResponse } from "../../../../types/types-file";
import { CommentsRow, EventAggregate, ParticipationStatus } from "../types";
import { getParticipationTagColor } from "../utils";
import { formatIsoDate } from "../../../../utils/dateUtils";

const { Text } = Typography;

type ResponsesOverviewTabProps = {
  participationSummary: {
    total: number;
    active: number;
    passive: number;
    legacy: number;
    leave: number;
  };
  expectedSurveyUsersCount: number;
  missingSurveyUsersCount: number;
  anchorSummary: {
    totalAnchors: number;
    newAnchors: number;
    leavingBar: number;
  };
  overallEventStats: EventAggregate[];
  commentsRows: CommentsRow[];
  periodAnchorSeminarDays: string[];
  responses: ShiftPlanningResponse[];
};

export default function ResponsesOverviewTab({
  participationSummary,
  expectedSurveyUsersCount,
  missingSurveyUsersCount,
  anchorSummary,
  overallEventStats,
  commentsRows,
  periodAnchorSeminarDays,
  responses,
}: ResponsesOverviewTabProps) {
  const wantsAnchorResponses = responses.filter(
    (r) => r.wantsAnchor === true && r.participationStatus === "active"
  );
  const totalWantsAnchor = wantsAnchorResponses.length;

  const seminarDayRows = periodAnchorSeminarDays.map((day) => {
    const canCount = wantsAnchorResponses.filter((r) =>
      Array.isArray(r.anchorSeminarDays) && r.anchorSeminarDays.includes(day)
    ).length;
    return { day, canCount, cannotCount: totalWantsAnchor - canCount };
  });

  const maxCanCount = seminarDayRows.reduce((max, row) => Math.max(max, row.canCount), 0);
  return (
    <Space direction="vertical" style={{ width: "100%" }} size="large">
      <Row gutter={[12, 12]}>
        <Col xs={12} md={6}>
          <Statistic
            title="Total responses"
            value={participationSummary.total}
            suffix={"/ " + expectedSurveyUsersCount}
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

      {periodAnchorSeminarDays.length > 0 && (
        <Card size="small" title="Anchor seminar availability">
          <Table
            rowKey="day"
            pagination={false}
            dataSource={seminarDayRows}
            locale={{ emptyText: "No seminar days configured." }}
            columns={[
              {
                title: "Date",
                dataIndex: "day",
                render: (_: string, row) => (
                  <Space>
                    <Text strong={row.canCount === maxCanCount && maxCanCount > 0}>
                      {formatIsoDate(row.day)}
                    </Text>
                    {row.canCount === maxCanCount && maxCanCount > 0 && (
                      <Tag color="green">Most voted</Tag>
                    )}
                  </Space>
                ),
              },
              {
                title: "Can attend",
                dataIndex: "canCount",
                render: (val: number, row) => (
                  <Text strong={row.canCount === maxCanCount && maxCanCount > 0}>{val}</Text>
                ),
              },
              {
                title: "Cannot attend",
                dataIndex: "cannotCount",
              },
            ]}
          />
        </Card>
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
