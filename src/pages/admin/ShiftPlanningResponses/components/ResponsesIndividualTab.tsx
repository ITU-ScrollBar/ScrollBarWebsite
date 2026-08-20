import { Alert, Card, Col, Empty, Row, Select, Space, Typography, message } from "antd";
import dayjs from "dayjs";
import { useCallback, useMemo, useState } from "react";
import ShiftAvailabilityForm, { FormEditorState } from "../../../../components/ShiftAvailability/ShiftAvailabilityForm";
import { useShiftPlanningContext } from "../../../../contexts/ShiftPlanningContext";
import { useShiftContext } from "../../../../contexts/ShiftContext";
import { updateMutualAvoidShiftPair, resolveSurveyType } from "../../../../firebase/api/shiftPlanning";
import { useEventContext } from "../../../../contexts/EventContext";
import { useTenderContext } from "../../../../contexts/TenderContext";
import { Role, Shift } from "../../../../types/types-file";
import { useResponseEditor } from "../hooks/useResponseEditor";
import UserSelectionColumn from "./UserSelectionColumn";

const { Text } = Typography;

export default function ResponsesIndividualTab() {
  const { periodState, selectedPeriodId, loadUserResponse, submitResponse } =
    useShiftPlanningContext();
  const { shiftState } = useShiftContext();
  const { eventState } = useEventContext();
  const { tenderState } = useTenderContext();

  const [selectedUserId, setSelectedUserId] = useState<string | undefined>(undefined);
  const [avoidSaving, setAvoidSaving] = useState(false);

  const selectedPeriod = useMemo(
    () => periodState.periods.find((p) => p.id === selectedPeriodId) ?? null,
    [periodState.periods, selectedPeriodId]
  );

  const isRegularSemesterSurvey = selectedPeriod
    ? resolveSurveyType(selectedPeriod) === "regularSemesterSurvey"
    : false;

  const tenderById = useMemo(
    () => new Map(tenderState.tenders.map((t) => [t.uid, t])),
    [tenderState.tenders]
  );

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

  const periodEventGroups = useMemo(() => {
    if (!selectedPeriod) return [];
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

  const selectedUserTender = useMemo(
    () => tenderState.tenders.find((t) => t.uid === selectedUserId) ?? null,
    [selectedUserId, tenderState.tenders]
  );

  const isSelectedUserAnchor = selectedUserId
    ? tenderById.get(selectedUserId)?.roles?.includes(Role.ANCHOR) === true
    : false;

  const avoidListOptions = useMemo(
    () =>
      tenderState.tenders
        .filter((t) => t.active && t.uid !== selectedUserId)
        .map((t) => ({ value: t.uid, label: t.displayName }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [selectedUserId, tenderState.tenders]
  );

  const editor = useResponseEditor({
    selectedPeriod,
    selectedUserId,
    periodEventGroups,
    loadUserResponse,
    submitResponse,
    userNameById,
    isSelectedUserAnchor,
  });

  const selectedUserPassiveConsecutiveWarning = useMemo(() => {
    if (!selectedUserId || editor.participationStatus !== "passive" || !isRegularSemesterSurvey) {
      return false;
    }
    return tenderById.get(selectedUserId)?.roles?.includes(Role.PASSIVE) === true;
  }, [editor.participationStatus, isRegularSemesterSurvey, selectedUserId, tenderById]);

  const handleAvoidListChange = useCallback(async (nextUserIds: string[]) => {
    if (!selectedUserId) return;

    const previous = new Set(selectedUserTender?.avoidShiftWithUserIds ?? []);
    const next = new Set(nextUserIds);
    const toAdd = Array.from(next).filter((uid) => !previous.has(uid));
    const toRemove = Array.from(previous).filter((uid) => !next.has(uid));

    if (toAdd.length === 0 && toRemove.length === 0) return;

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
  }, [selectedUserId, selectedUserTender?.avoidShiftWithUserIds]);

  const editorState: FormEditorState = {
    participationStatus: editor.participationStatus,
    onParticipationStatusChange: editor.handleParticipationStatusChange,
    wantsAnchor: editor.wantsAnchor,
    onWantsAnchorChange: editor.handleWantsAnchorChange,
    anchorOnly: editor.anchorOnly,
    onAnchorOnlyChange: editor.setAnchorOnly,
    anchorSeminarDays: editor.anchorSeminarDays,
    onAnchorSeminarDaysChange: editor.setAnchorSeminarDays,
    shiftLoadPreference: editor.shiftLoadPreference,
    onShiftLoadPreferenceChange: editor.setShiftLoadPreference,
    eventChoices: editor.eventChoices,
    onEventChoiceChange: editor.handleEventChoice,
    eventCanShiftIds: editor.eventCanShiftIds,
    onEventCanShiftIdsChange: editor.handleCanShiftIds,
    passiveReason: editor.passiveReason,
    onPassiveReasonChange: editor.setPassiveReason,
    privateEmail: editor.privateEmail,
    onPrivateEmailChange: editor.setPrivateEmail,
    comments: editor.comments,
    onCommentsChange: editor.setComments,
  };

  const selectedUserDisplayName = userNameById.get(selectedUserId ?? "") ?? selectedUserId ?? "";

  return (
    <Row gutter={[16, 16]}>
      <Col xs={24} lg={8}>
        <UserSelectionColumn
          selectedUserId={selectedUserId}
          onSelectedUserIdChange={setSelectedUserId}
        />
      </Col>

      <Col xs={24} lg={16}>
        {!selectedUserId ? (
          <Card size="small">
            <Empty description="Select a user to view or edit response." />
          </Card>
        ) : (
          <Space direction="vertical" style={{ width: "100%" }} size="middle">
            <Alert
              type="warning"
              showIcon
              message="Shift manager editing mode"
              description={`You are editing shift availability for ${selectedUserDisplayName}.`}
            />

            {selectedUserPassiveConsecutiveWarning && (
              <Alert
                type="warning"
                showIcon
                message="Possible consecutive passive status"
                description="This user already has passive role and is marked passive again for a regular semester survey, indicating two or more consecutive periods as passive."
              />
            )}

            <Card size="small" title="Avoid shifts with">
              <Space direction="vertical" style={{ width: "100%" }}>
                <Text type="secondary">
                  Users listed here should not be assigned on the same shift together.
                </Text>
                <Select
                  mode="multiple"
                  style={{ width: "100%" }}
                  placeholder="Add users to avoid pairing"
                  value={selectedUserTender?.avoidShiftWithUserIds ?? []}
                  onChange={handleAvoidListChange}
                  options={avoidListOptions}
                  loading={avoidSaving}
                  optionFilterProp="label"
                  showSearch
                />
              </Space>
            </Card>

            <Card size="small" title="Shift availability response" loading={editor.loading}>
              <Space direction="vertical" style={{ width: "100%" }} size="middle">
                <Text type="secondary">
                  {editor.hasExistingResponse
                    ? `Latest submitted at ${editor.submittedAt ? dayjs(editor.submittedAt).format("DD/MM/YYYY HH:mm") : "-"}.`
                    : "No existing response for this user in the selected period."}
                </Text>

                <ShiftAvailabilityForm
                  includesShiftStatusQuestions={isRegularSemesterSurvey}
                  isCurrentlyPassive={false}
                  isCurrentlyLegacy={false}
                  isAnchor={isSelectedUserAnchor}
                  periodAnchorSeminarDays={selectedPeriod?.anchorSeminarDays ?? []}
                  periodEventGroups={periodEventGroups}
                  editor={editorState}
                  onSubmit={editor.handleSubmitOrEdit}
                  submitting={editor.saving}
                  hasExistingResponse={editor.hasExistingResponse}
                />
              </Space>
            </Card>
          </Space>
        )}
      </Col>
    </Row>
  );
}
