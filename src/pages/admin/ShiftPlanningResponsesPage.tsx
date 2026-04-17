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
import {
  EventChoice,
  EventAggregate,
  ParticipationStatus,
  ResponseFilter,
  ShiftPlanningResponsesPageProps,
} from "./ShiftPlanningResponses/types";
import { getEventDecision, resolveSurveyType } from "./ShiftPlanningResponses/utils";

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

  const [editorParticipationStatus, setEditorParticipationStatus] = useState<
    ParticipationStatus | undefined
  >(undefined);
  const [editorWantsAnchor, setEditorWantsAnchor] = useState<boolean | undefined>(undefined);
  const [editorAnchorOnly, setEditorAnchorOnly] = useState(false);
  const [editorComments, setEditorComments] = useState("");
  const [editorEventChoices, setEditorEventChoices] = useState<
    Partial<Record<string, EventChoice>>
  >({});
  const [editorEventCanShiftIds, setEditorEventCanShiftIds] = useState<
    Record<string, string[]>
  >({});
  const [editorLoading, setEditorLoading] = useState(false);
  const [editorSaving, setEditorSaving] = useState(false);
  const [editorHasExistingResponse, setEditorHasExistingResponse] = useState(false);
  const [editorSubmittedAt, setEditorSubmittedAt] = useState<Date | null>(null);

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
      if (!eventIds.has(shift.eventId)) {
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
      selectedPeriodSurveyType === "newbieShiftPlanning" ? Role.NEWBIE : Role.REGULAR_ACCESS;
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

      if (responseFilter === "responded" && !user.responded) {
        return false;
      }

      if (responseFilter === "missing" && user.responded) {
        return false;
      }

      if (responseFilter === "allAnchors" && !response?.wantsAnchor) {
        return false;
      }

      if (responseFilter === "newAnchors" && (!response?.wantsAnchor || userIsAnchor)) {
        return false;
      }

      if (
        responseFilter === "passiveMembers" &&
        (response?.participationStatus ?? "active") !== "passive"
      ) {
        return false;
      }

      if (
        responseFilter === "legacyMembers" &&
        (response?.participationStatus ?? "active") !== "legacy"
      ) {
        return false;
      }

      if (
        responseFilter === "leavingBar" &&
        (response?.participationStatus ?? "active") !== "leave"
      ) {
        return false;
      }

      if (!searchTerm) {
        return true;
      }

      const inName = user.name.toLowerCase().includes(searchTerm);
      const inEmail = (user.email ?? "").toLowerCase().includes(searchTerm);
      return inName || inEmail;
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
    const summary = {
      total: responses.length,
      active: 0,
      passive: 0,
      legacy: 0,
      leave: 0,
    };

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

      if (status === "leave") {
        leavingBar += 1;
      }

      if (status !== "active" || response.wantsAnchor !== true) {
        continue;
      }

      totalAnchors += 1;
      if (tenderById.get(response.userId)?.roles?.includes(Role.ANCHOR) !== true) {
        newAnchors += 1;
      }
    }

    return {
      totalAnchors,
      newAnchors,
      leavingBar,
    };
  }, [responses, tenderById]);

  const selectedUserPassiveConsecutiveWarning = useMemo(() => {
    if (!selectedUserId || editorParticipationStatus !== "passive") {
      return false;
    }

    if (!isRegularSemesterSurvey) {
      return false;
    }

    return tenderById.get(selectedUserId)?.roles?.includes(Role.PASSIVE) === true;
  }, [editorParticipationStatus, isRegularSemesterSurvey, selectedUserId, tenderById]);

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

      const shiftCounts = shifts.map((shift) => {
        const canShiftCount = responses.filter((response) => {
          if ((response.participationStatus ?? "active") !== "active") {
            return false;
          }
          return response.availability?.[shift.id] === true;
        }).length;

        return {
          shiftId: shift.id,
          shiftTitle: shift.title,
          canCount: canShiftCount,
        };
      });

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

    return rows.sort((a, b) => {
      const aTime = a.start?.getTime() ?? 0;
      const bTime = b.start?.getTime() ?? 0;
      return aTime - bTime;
    });
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

        return {
          eventId,
          event,
          shifts,
        };
      })
      .sort((a, b) => {
        const aTime = a.event?.start?.getTime() ?? 0;
        const bTime = b.event?.start?.getTime() ?? 0;
        return aTime - bTime;
      });
  }, [eventsById, periodShiftsByEvent, selectedPeriod]);

  useEffect(() => {
    if (!selectedPeriod?.id || !selectedUserId) {
      return;
    }

    let cancelled = false;
    setEditorLoading(true);

    loadUserResponse(selectedPeriod.id, selectedUserId)
      .then((response) => {
        if (cancelled) {
          return;
        }

        if (!response) {
          setEditorHasExistingResponse(false);
          setEditorParticipationStatus("active");
          setEditorWantsAnchor(false);
          setEditorAnchorOnly(false);
          setEditorComments("");
          setEditorEventChoices({});
          setEditorEventCanShiftIds({});
          setEditorSubmittedAt(null);
          return;
        }

        const loadedParticipation =
          (response.participationStatus as ParticipationStatus | undefined) ?? "active";
        const loadedWantsAnchor =
          typeof response.wantsAnchor === "boolean"
            ? response.wantsAnchor
            : Boolean(response.anchorOnly);

        const loadedChoices: Partial<Record<string, EventChoice>> = {};
        const loadedCanShiftIds: Record<string, string[]> = {};

        if (loadedParticipation === "active") {
          for (const group of periodEventGroups) {
            const hasAnyAnswer = group.shifts.some(
              (shift) => typeof response.availability?.[shift.id] === "boolean"
            );

            if (!hasAnyAnswer) {
              continue;
            }

            const allCanWork = group.shifts.every(
              (shift) => response.availability?.[shift.id] === true
            );

            if (allCanWork) {
              loadedChoices[group.eventId] = "can";
            } else {
              loadedChoices[group.eventId] = "cannot";
              loadedCanShiftIds[group.eventId] = group.shifts
                .filter((shift) => response.availability?.[shift.id] === true)
                .map((shift) => shift.id);
            }
          }
        }

        setEditorHasExistingResponse(true);
        setEditorParticipationStatus(loadedParticipation);
        setEditorWantsAnchor(loadedWantsAnchor);
        setEditorAnchorOnly(Boolean(response.anchorOnly));
        setEditorComments(response.comments ?? "");
        setEditorEventChoices(loadedChoices);
        setEditorEventCanShiftIds(loadedCanShiftIds);
        setEditorSubmittedAt(response.submittedAt ?? response.updatedAt ?? null);
      })
      .finally(() => {
        if (!cancelled) {
          setEditorLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [loadUserResponse, periodEventGroups, selectedPeriod?.id, selectedUserId]);

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

  const handleEditorEventChoice = (eventId: string, value: EventChoice) => {
    setEditorEventChoices((prev) => ({ ...prev, [eventId]: value }));

    if (value === "can") {
      setEditorEventCanShiftIds((prev) => ({ ...prev, [eventId]: [] }));
    }
  };

  const handleEditorCanShiftIds = (eventId: string, shiftIds: string[]) => {
    setEditorEventCanShiftIds((prev) => ({ ...prev, [eventId]: shiftIds }));
  };

  const handleEditorParticipationStatusChange = (value: ParticipationStatus) => {
    setEditorParticipationStatus(value);
    if (value !== "active") {
      setEditorWantsAnchor(false);
      setEditorAnchorOnly(false);
      setEditorEventChoices({});
      setEditorEventCanShiftIds({});
    }
  };

  const handleEditorWantsAnchorChange = (value: boolean) => {
    setEditorWantsAnchor(value);
    if (!value) {
      setEditorAnchorOnly(false);
    }
  };

  const editorAllEventsAnswered = useMemo(() => {
    if (editorParticipationStatus !== "active") {
      return true;
    }

    return periodEventGroups.every((group) => {
      const choice = editorEventChoices[group.eventId];
      return choice === "can" || choice === "cannot";
    });
  }, [editorEventChoices, editorParticipationStatus, periodEventGroups]);

  const handleSubmitOrEditResponse = async () => {
    if (!selectedPeriod || !selectedUserId) {
      return;
    }

    if (!editorParticipationStatus) {
      message.error("Choose participation status before saving.");
      return;
    }

    if (editorParticipationStatus === "active" && editorWantsAnchor === undefined) {
      message.error("Choose anchor preference before saving.");
      return;
    }

    if (!editorAllEventsAnswered) {
      message.error("Please choose can/cannot for every event before saving.");
      return;
    }

    const normalizedAvailability: Record<string, boolean> = {};
    if (editorParticipationStatus === "active") {
      for (const group of periodEventGroups) {
        const choice = editorEventChoices[group.eventId];
        if (!choice) {
          continue;
        }

        if (choice === "can") {
          for (const shift of group.shifts) {
            normalizedAvailability[shift.id] = true;
          }
          continue;
        }

        const selectedShiftIds = new Set(editorEventCanShiftIds[group.eventId] ?? []);
        for (const shift of group.shifts) {
          normalizedAvailability[shift.id] = selectedShiftIds.has(shift.id);
        }
      }
    }

    const wantsAnchor = editorParticipationStatus === "active" && editorWantsAnchor === true;

    setEditorSaving(true);
    try {
      await submitResponse({
        periodId: selectedPeriod.id,
        userId: selectedUserId,
        participationStatus: editorParticipationStatus,
        wantsAnchor,
        availability: normalizedAvailability,
        anchorOnly: wantsAnchor ? editorAnchorOnly : false,
        comments: editorComments,
      });

      setEditorHasExistingResponse(true);
      setEditorSubmittedAt(new Date());
      message.success(`Saved shift availability for ${userNameById.get(selectedUserId) ?? selectedUserId}.`);
    } catch (error) {
      const casted = error as { message?: string };
      message.error(casted.message ?? "Failed to save response.");
    } finally {
      setEditorSaving(false);
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
                      selectedUserPassiveConsecutiveWarning={
                        selectedUserPassiveConsecutiveWarning
                      }
                      selectedUserAvoidIds={selectedUserTender?.avoidShiftWithUserIds ?? []}
                      onAvoidListChange={handleAvoidListChange}
                      avoidListOptions={avoidListOptions}
                      avoidSaving={avoidSaving}
                      editorLoading={editorLoading}
                      editorHasExistingResponse={editorHasExistingResponse}
                      editorSubmittedAt={editorSubmittedAt}
                      editorParticipationStatus={editorParticipationStatus}
                      onEditorParticipationStatusChange={
                        handleEditorParticipationStatusChange
                      }
                      editorWantsAnchor={editorWantsAnchor}
                      onEditorWantsAnchorChange={handleEditorWantsAnchorChange}
                      editorAnchorOnly={editorAnchorOnly}
                      onEditorAnchorOnlyChange={setEditorAnchorOnly}
                      periodEventGroups={periodEventGroups}
                      editorEventChoices={editorEventChoices}
                      editorEventCanShiftIds={editorEventCanShiftIds}
                      onEditorEventChoice={handleEditorEventChoice}
                      onEditorCanShiftIds={handleEditorCanShiftIds}
                      editorComments={editorComments}
                      onEditorCommentsChange={setEditorComments}
                      editorSaving={editorSaving}
                      onSubmitOrEditResponse={handleSubmitOrEditResponse}
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
