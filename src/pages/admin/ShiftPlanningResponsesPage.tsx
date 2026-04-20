import { TeamOutlined } from "@ant-design/icons";
import { Card, Empty, Layout, Select, Space, Tabs, Typography, message } from "antd";
import dayjs from "dayjs";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useShiftContext } from "../../contexts/ShiftContext";
import { updateMutualAvoidShiftPair } from "../../firebase/api/shiftPlanning";
import useEvents from "../../hooks/useEvents";
import useShiftPlanning from "../../hooks/useShiftPlanning";
import useTenders from "../../hooks/useTenders";
import { Role, Shift, ShiftPlanningSurveyType } from "../../types/types-file";
import ResponsesIndividualTab from "./ShiftPlanningResponses/components/ResponsesIndividualTab";
import ResponsesOverviewTab from "./ShiftPlanningResponses/components/ResponsesOverviewTab";
import { useResponseEditor } from "./ShiftPlanningResponses/hooks/useResponseEditor";
import {
  EventAggregate,
  ParticipationStatus,
  ResponseFilter,
  ShiftPlanningResponsesPageProps,
} from "./ShiftPlanningResponses/types";
import { getEventDecision } from "./ShiftPlanningResponses/utils";
import { resolveSurveyType } from "../../firebase/api/shiftPlanning";

const { Content } = Layout;
const { Title } = Typography;

export default function ShiftPlanningResponsesPage(props: ShiftPlanningResponsesPageProps) {
  const { embedded = false, embeddedSection, selectedPeriodId, onSelectedPeriodIdChange } =
    props;
  const navigate = useNavigate();
  const { shiftState } = useShiftContext();
  const { eventState } = useEvents();
  const { tenderState } = useTenders();

  const [internalSelectedPeriodId, setInternalSelectedPeriodId] = useState<string | undefined>(
    undefined
  );
  const [selectedUserId, setSelectedUserId] = useState<string | undefined>(undefined);
  const [userSearch, setUserSearch] = useState("");
  const [responseFilter, setResponseFilter] = useState<ResponseFilter>("all");
  const [avoidSaving, setAvoidSaving] = useState(false);

  const isExternallyControlled = typeof onSelectedPeriodIdChange === "function";
  const effectiveSelectedPeriodId = isExternallyControlled
    ? selectedPeriodId
    : internalSelectedPeriodId;

  const { periodState, responseState, loadUserResponse, submitResponse } = useShiftPlanning(
    effectiveSelectedPeriodId
  );

  const periods = useMemo(() => {
    return [...periodState.periods].sort(
      (a, b) => b.submissionClosesAt.getTime() - a.submissionClosesAt.getTime()
    );
  }, [periodState.periods]);

  useEffect(() => {
    if (effectiveSelectedPeriodId || periods.length === 0) {
      return;
    }

    const fallbackPeriodId = periods[0].id;
    if (isExternallyControlled) {
      onSelectedPeriodIdChange?.(fallbackPeriodId);
      return;
    }

    setInternalSelectedPeriodId(fallbackPeriodId);
  }, [effectiveSelectedPeriodId, isExternallyControlled, onSelectedPeriodIdChange, periods]);

  const selectedPeriod = useMemo(() => {
    return periods.find((period) => period.id === effectiveSelectedPeriodId) ?? null;
  }, [effectiveSelectedPeriodId, periods]);

  const selectedPeriodSurveyType = useMemo<ShiftPlanningSurveyType | null>(() => {
    if (!selectedPeriod) {
      return null;
    }
    return resolveSurveyType(selectedPeriod);
  }, [selectedPeriod]);

  const isRegularSemesterSurvey = selectedPeriodSurveyType === "regularSemesterSurvey";

  const handleSelectedPeriodChange = (value: string) => {
    if (isExternallyControlled) {
      onSelectedPeriodIdChange?.(value);
      return;
    }
    setInternalSelectedPeriodId(value);
  };

  const userNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const tender of tenderState.tenders) {
      map.set(tender.uid, tender.displayName);
    }
    return map;
  }, [tenderState.tenders]);

  const tenderById = useMemo(() => {
    return new Map(tenderState.tenders.map((tender) => [tender.uid, tender]));
  }, [tenderState.tenders]);

  const eventsById = useMemo(() => {
    const map = new Map<string, { id: string; title: string; start: Date }>();
    for (const event of [...eventState.events, ...eventState.previousEvents]) {
      map.set(event.id, {
        id: event.id,
        title: event.title,
        start: event.start,
      });
    }
    return map;
  }, [eventState.events, eventState.previousEvents]);

  const periodShiftsByEvent = useMemo(() => {
    const map = new Map<string, Shift[]>();
    if (!selectedPeriod) {
      return map;
    }

    const eventIds = new Set(selectedPeriod.eventIds);
    for (const shift of shiftState.shifts) {
      if (!eventIds.has(shift.eventId) || shift.linkedShiftId) {
        continue;
      }

      const current = map.get(shift.eventId) ?? [];
      current.push(shift);
      map.set(shift.eventId, current);
    }

    for (const [eventId, shifts] of map) {
      map.set(
        eventId,
        [...shifts].sort((a, b) => a.start.getTime() - b.start.getTime())
      );
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

  const filteredUsers = useMemo(() => {
    const searchTerm = userSearch.trim().toLowerCase();

    return expectedSurveyUsers.filter((user) => {
      const response = responseByUserId.get(user.uid);
      const userIsAnchor = tenderById.get(user.uid)?.roles?.includes(Role.ANCHOR) === true;

      if (responseFilter === "responded" && !user.responded) return false;
      if (responseFilter === "missing" && user.responded) return false;
      if (responseFilter === "allAnchors" && !response?.wantsAnchor) return false;
      if (responseFilter === "newAnchors" && (!response?.wantsAnchor || userIsAnchor)) return false;
      if (responseFilter === "passiveMembers" && (response?.participationStatus ?? "active") !== "passive") return false;
      if (responseFilter === "legacyMembers" && (response?.participationStatus ?? "active") !== "legacy") return false;
      if (responseFilter === "leavingBar" && (response?.participationStatus ?? "active") !== "leave") return false;

      if (!searchTerm) return true;
      return (
        user.name.toLowerCase().includes(searchTerm) ||
        (user.email ?? "").toLowerCase().includes(searchTerm)
      );
    });
  }, [expectedSurveyUsers, responseByUserId, responseFilter, tenderById, userSearch]);

  useEffect(() => {
    if (!selectedUserId && filteredUsers.length > 0) {
      setSelectedUserId(filteredUsers[0].uid);
      return;
    }

    if (selectedUserId && !filteredUsers.some((user) => user.uid === selectedUserId)) {
      setSelectedUserId(filteredUsers[0]?.uid);
    }
  }, [filteredUsers, selectedUserId]);

  const selectedUserTender = useMemo(() => {
    return tenderState.tenders.find((tender) => tender.uid === selectedUserId) ?? null;
  }, [selectedUserId, tenderState.tenders]);

  const avoidListOptions = useMemo(() => {
    return tenderState.tenders
      .filter((tender) => tender.active)
      .filter((tender) => tender.uid !== selectedUserId)
      .map((tender) => ({
        value: tender.uid,
        label: tender.displayName,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [selectedUserId, tenderState.tenders]);

  const expectedSurveyUsersCount = expectedSurveyUsers.length;

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
    if (!selectedPeriod) {
      return [];
    }

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

  const periodEventGroups = useMemo(() => {
    if (!selectedPeriod) {
      return [];
    }

    return selectedPeriod.eventIds
      .map((eventId) => {
        const event = eventsById.get(eventId);
        const shifts = (periodShiftsByEvent.get(eventId) ?? []).slice().sort(
          (a, b) => a.start.getTime() - b.start.getTime()
        );
        return { eventId, event, shifts };
      })
      .sort((a, b) => (a.event?.start?.getTime() ?? 0) - (b.event?.start?.getTime() ?? 0));
  }, [eventsById, periodShiftsByEvent, selectedPeriod]);

  const editor = useResponseEditor({
    selectedPeriod,
    selectedUserId,
    periodEventGroups,
    loadUserResponse,
    submitResponse,
    userNameById,
  });

  const selectedUserPassiveConsecutiveWarning = useMemo(() => {
    if (!selectedUserId || editor.participationStatus !== "passive" || !isRegularSemesterSurvey) {
      return false;
    }
    return tenderById.get(selectedUserId)?.roles?.includes(Role.PASSIVE) === true;
  }, [editor.participationStatus, isRegularSemesterSurvey, selectedUserId, tenderById]);

  const handleAvoidListChange = async (nextUserIds: string[]) => {
    if (!selectedUserId) {
      return;
    }

    const previous = new Set(selectedUserTender?.avoidShiftWithUserIds ?? []);
    const next = new Set(nextUserIds);

    const toAdd = Array.from(next).filter((userId) => !previous.has(userId));
    const toRemove = Array.from(previous).filter((userId) => !next.has(userId));

    if (toAdd.length === 0 && toRemove.length === 0) {
      return;
    }

    setAvoidSaving(true);
    try {
      await Promise.all([
        ...toAdd.map((otherUserId) =>
          updateMutualAvoidShiftPair({ userId: selectedUserId, otherUserId, shouldAvoid: true })
        ),
        ...toRemove.map((otherUserId) =>
          updateMutualAvoidShiftPair({ userId: selectedUserId, otherUserId, shouldAvoid: false })
        ),
      ]);
      message.success("Updated avoid list.");
    } catch (error) {
      const casted = error as { message?: string };
      message.error(casted.message ?? "Failed to update avoid list.");
    } finally {
      setAvoidSaving(false);
    }
  };

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
                onChange={handleSelectedPeriodChange}
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
                      expectedSurveyUsersCount={expectedSurveyUsersCount}
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
                  children: (
                    <ResponsesIndividualTab
                      filteredUsers={filteredUsers}
                      selectedUserId={selectedUserId}
                      onSelectedUserIdChange={setSelectedUserId}
                      userSearch={userSearch}
                      onUserSearchChange={setUserSearch}
                      responseFilter={responseFilter}
                      onResponseFilterChange={setResponseFilter}
                      selectedUserDisplayName={
                        userNameById.get(selectedUserId ?? "") ?? selectedUserId ?? ""
                      }
                      selectedUserPassiveConsecutiveWarning={selectedUserPassiveConsecutiveWarning}
                      selectedUserAvoidIds={selectedUserTender?.avoidShiftWithUserIds ?? []}
                      onAvoidListChange={handleAvoidListChange}
                      avoidListOptions={avoidListOptions}
                      avoidSaving={avoidSaving}
                      editorLoading={editor.loading}
                      editorHasExistingResponse={editor.hasExistingResponse}
                      editorSubmittedAt={editor.submittedAt}
                      editorParticipationStatus={editor.participationStatus}
                      onEditorParticipationStatusChange={editor.handleParticipationStatusChange}
                      editorWantsAnchor={editor.wantsAnchor}
                      onEditorWantsAnchorChange={editor.handleWantsAnchorChange}
                      editorAnchorOnly={editor.anchorOnly}
                      onEditorAnchorOnlyChange={editor.setAnchorOnly}
                      editorAnchorSeminarDays={editor.anchorSeminarDays}
                      periodAnchorSeminarDays={selectedPeriod?.anchorSeminarDays ?? []}
                      periodEventGroups={periodEventGroups}
                      editorEventChoices={editor.eventChoices}
                      editorEventCanShiftIds={editor.eventCanShiftIds}
                      onEditorEventChoice={editor.handleEventChoice}
                      onEditorCanShiftIds={editor.handleCanShiftIds}
                      editorComments={editor.comments}
                      onEditorCommentsChange={editor.setComments}
                      editorPassiveReason={editor.passiveReason}
                      onEditorPassiveReasonChange={editor.setPassiveReason}
                      editorPrivateEmail={editor.privateEmail}
                      onEditorPrivateEmailChange={editor.setPrivateEmail}
                      editorSaving={editor.saving}
                      onSubmitOrEditResponse={editor.handleSubmitOrEdit}
                    />
                  ),
                },
              ]}
            />
          )}
        </Space>
      </Content>
    </Layout>
  );
}
