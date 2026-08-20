import { TeamOutlined } from "@ant-design/icons";
import { Card, Empty, Layout, Select, Space, Tabs, Typography } from "antd";
import dayjs from "dayjs";
import { useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useShiftContext } from "../../contexts/ShiftContext";
import { useShiftPlanningContext } from "../../contexts/ShiftPlanningContext";
import { useEventContext } from "../../contexts/EventContext";
import { useTenderContext } from "../../contexts/TenderContext";
import { Role, Shift, ShiftPlanningSurveyType } from "../../types/types-file";
import ResponsesIndividualTab from "./ShiftPlanningResponses/components/ResponsesIndividualTab";
import ResponsesOverviewTab from "./ShiftPlanningResponses/components/ResponsesOverviewTab";
import {
  EventAggregate,
  ParticipationStatus,
  ShiftPlanningResponsesPageProps,
} from "./ShiftPlanningResponses/types";
import { getEventDecision } from "./ShiftPlanningResponses/utils";
import { resolveSurveyType } from "../../firebase/api/shiftPlanning";

const { Content } = Layout;
const { Title } = Typography;

export default function ShiftPlanningResponsesPage(props: ShiftPlanningResponsesPageProps) {
  const { embedded = false, embeddedSection } = props;
  const navigate = useNavigate();
  const { shiftState } = useShiftContext();
  const { eventState } = useEventContext();
  const { tenderState } = useTenderContext();
  const { periodState, responseState, selectedPeriodId, setSelectedPeriodId } =
    useShiftPlanningContext();

  const periods = useMemo(() => {
    return [...periodState.periods].sort(
      (a, b) => b.submissionClosesAt.getTime() - a.submissionClosesAt.getTime()
    );
  }, [periodState.periods]);

  useEffect(() => {
    if (selectedPeriodId || periods.length === 0) {
      return;
    }
    setSelectedPeriodId(periods[0].id);
  }, [selectedPeriodId, periods, setSelectedPeriodId]);

  const selectedPeriod = useMemo(() => {
    return periods.find((period) => period.id === selectedPeriodId) ?? null;
  }, [selectedPeriodId, periods]);

  const selectedPeriodSurveyType = useMemo<ShiftPlanningSurveyType | null>(() => {
    if (!selectedPeriod) return null;
    return resolveSurveyType(selectedPeriod);
  }, [selectedPeriod]);

  const tenderById = useMemo(() => {
    return new Map(tenderState.tenders.map((tender) => [tender.uid, tender]));
  }, [tenderState.tenders]);

  const userNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const tender of tenderState.tenders) {
      map.set(tender.uid, tender.displayName);
    }
    return map;
  }, [tenderState.tenders]);

  const eventsById = useMemo(() => {
    const map = new Map<string, { id: string; title: string; start: Date }>();
    for (const event of [...eventState.events, ...eventState.previousEvents]) {
      map.set(event.id, { id: event.id, title: event.title, start: event.start });
    }
    return map;
  }, [eventState.events, eventState.previousEvents]);

  const periodShiftsByEvent = useMemo(() => {
    const map = new Map<string, Shift[]>();
    if (!selectedPeriod) return map;

    const eventIds = new Set(selectedPeriod.eventIds);
    for (const shift of shiftState.shifts) {
      if (!eventIds.has(shift.eventId) || shift.linkedShiftId) continue;
      const current = map.get(shift.eventId) ?? [];
      current.push(shift);
      map.set(shift.eventId, current);
    }
    for (const [eventId, shifts] of map) {
      map.set(eventId, [...shifts].sort((a, b) => a.start.getTime() - b.start.getTime()));
    }
    return map;
  }, [selectedPeriod, shiftState.shifts]);

  const responses = responseState.responses;

  const responseByUserId = useMemo(() => {
    return new Map(responses.map((response) => [response.userId, response]));
  }, [responses]);

  const expectedSurveyUsers = useMemo(() => {
    const requiredRole =
      selectedPeriodSurveyType === "newbieShiftPlanning" ? Role.NEWBIE : Role.TENDER;
    return tenderState.tenders
      .filter((tender) => tender.active)
      .filter((tender) => tender.roles?.includes(requiredRole) === true)
      .map((tender) => ({
        uid: tender.uid,
        name: tender.displayName,
        email: tender.email,
        responded: responseByUserId.has(tender.uid),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [responseByUserId, selectedPeriodSurveyType, tenderState.tenders]);

  const missingSurveyUsers = useMemo(() => {
    return expectedSurveyUsers.filter((user) => !user.responded);
  }, [expectedSurveyUsers]);

  const participationSummary = useMemo(() => {
    const summary = { total: responses.length, active: 0, passive: 0, legacy: 0, leave: 0 };
    for (const response of responses) {
      const status = (response.participationStatus ?? "active") as ParticipationStatus;
      summary[status] += 1;
    }
    return summary;
  }, [responses]);

  const anchorSummary = useMemo(() => {
    let totalAnchors = 0;
    let newAnchors = 0;
    let leavingBar = 0;
    for (const response of responses) {
      const status = (response.participationStatus ?? "active") as ParticipationStatus;
      if (status === "leave") leavingBar += 1;
      if (status !== "active" || response.wantsAnchor !== true) continue;
      totalAnchors += 1;
      if (tenderById.get(response.userId)?.roles?.includes(Role.ANCHOR) !== true) newAnchors += 1;
    }
    return { totalAnchors, newAnchors, leavingBar };
  }, [responses, tenderById]);

  const overallEventStats = useMemo((): EventAggregate[] => {
    if (!selectedPeriod) return [];
    const rows: EventAggregate[] = [];
    for (const eventId of selectedPeriod.eventIds) {
      const event = eventsById.get(eventId);
      const shifts = periodShiftsByEvent.get(eventId) ?? [];
      const shiftIds = shifts.map((shift) => shift.id);

      let canCount = 0;
      let partialCount = 0;
      let cannotCount = 0;
      let unansweredCount = 0;
      for (const response of responses) {
        const decision = getEventDecision(response, shiftIds);
        if (decision === "can") canCount += 1;
        if (decision === "partial") partialCount += 1;
        if (decision === "cannot") cannotCount += 1;
        if (decision === "unanswered") unansweredCount += 1;
      }

      const shiftCounts = shifts.map((shift) => ({
        shiftId: shift.id,
        shiftTitle: shift.title,
        canCount: responses.filter((response) => {
          if ((response.participationStatus ?? "active") !== "active") return false;
          return response.availability?.[shift.id] === true;
        }).length,
      }));

      rows.push({
        eventId,
        title: event?.title ?? eventId,
        start: event?.start,
        canCount,
        partialCount,
        cannotCount,
        unansweredCount,
        shiftCounts,
      });
    }
    return rows.sort((a, b) => (a.start?.getTime() ?? 0) - (b.start?.getTime() ?? 0));
  }, [eventsById, periodShiftsByEvent, responses, selectedPeriod]);

  const commentsRows = useMemo(() => {
    return responses
      .filter((response) => (response.comments ?? "").trim().length > 0)
      .map((response) => ({
        key: response.id,
        userId: response.userId,
        userName: userNameById.get(response.userId) ?? response.userId,
        participationStatus: (response.participationStatus ?? "active") as ParticipationStatus,
        comments: response.comments ?? "",
        submittedAt: response.submittedAt ?? response.updatedAt,
      }))
      .sort((a, b) => (b.submittedAt?.getTime() ?? 0) - (a.submittedAt?.getTime() ?? 0));
  }, [responses, userNameById]);

  if (
    periodState.loading ||
    responseState.loading ||
    shiftState.loading ||
    eventState.loading ||
    tenderState.loading
  ) {
    if (embedded) {
      return <Card loading />;
    }
    return (
      <Layout style={{ minHeight: "100vh", background: "#f5f5f5" }}>
        <Content style={{ padding: 24 }}>
          <Card loading />
        </Content>
      </Layout>
    );
  }

  return (
    <Layout
      style={{
        minHeight: embedded ? "auto" : "100vh",
        background: embedded ? "transparent" : "#f5f5f5",
      }}
    >
      <Content style={{ padding: embedded ? 0 : 24 }}>
        <Space direction="vertical" size="large" style={{ width: "100%" }}>
          {!embedded && (
            <Tabs
              activeKey="responses"
              onChange={(key) => {
                if (key === "planning") {
                  navigate("/admin/shifts");
                }
              }}
              items={[
                { key: "planning", label: "Shift planning" },
                { key: "responses", label: "Survey responses" },
              ]}
            />
          )}

          {!embedded && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              <Title level={3} style={{ margin: 0 }}>
                <TeamOutlined style={{ marginRight: 8 }} />
                Survey responses
              </Title>
              <Select
                size="large"
                style={{ width: 420, maxWidth: "100%" }}
                placeholder="Select period"
                value={selectedPeriod?.id}
                onChange={(value) => setSelectedPeriodId(value)}
                options={periods.map((period) => ({
                  value: period.id,
                  label: `${period.name} (deadline: ${dayjs(period.submissionClosesAt).format("DD/MM/YYYY HH:mm")})`,
                }))}
              />
            </div>
          )}

          {!selectedPeriod ? (
            <Empty description="No shift planning periods found." />
          ) : (
            <Tabs
              {...(embeddedSection
                ? { activeKey: embeddedSection, tabBarStyle: { display: "none" } }
                : {})}
              items={[
                {
                  key: "overview",
                  label: "Overall Overview",
                  children: (
                    <ResponsesOverviewTab
                      participationSummary={participationSummary}
                      expectedSurveyUsersCount={expectedSurveyUsers.length}
                      missingSurveyUsersCount={missingSurveyUsers.length}
                      anchorSummary={anchorSummary}
                      overallEventStats={overallEventStats}
                      commentsRows={commentsRows}
                      periodAnchorSeminarDays={selectedPeriod?.anchorSeminarDays ?? []}
                      responses={responses}
                    />
                  ),
                },
                {
                  key: "individual",
                  label: "Individual Response",
                  children: <ResponsesIndividualTab />,
                },
              ]}
            />
          )}
        </Space>
      </Content>
    </Layout>
  );
}
