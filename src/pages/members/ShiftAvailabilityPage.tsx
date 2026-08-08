import { Alert, Card, Empty, Layout, Select, Space, Typography } from "antd";
import dayjs from "dayjs";
import ShiftAvailabilityForm, { FormEditorState } from "../../components/ShiftAvailability/ShiftAvailabilityForm";
import { useShiftAvailabilityForm } from "./ShiftAvailability/hooks/useShiftAvailabilityForm";

const { Content } = Layout;
const { Title, Text } = Typography;

export default function ShiftAvailabilityPage() {
  const {
    eventChoices,
    eventCanShiftIds,
    participationStatus,
    wantsAnchor,
    setWantsAnchor,
    anchorOnly,
    setAnchorOnly,
    anchorSeminarDays,
    setAnchorSeminarDays,
    shiftLoadPreference,
    setShiftLoadPreference,
    comments,
    setComments,
    passiveReason,
    setPassiveReason,
    privateEmail,
    setPrivateEmail,
    hasSubmitted,
    submittedAt,
    saving,
    setSelectedPeriodId,
    answeredByPeriodId,
    availablePeriods,
    selectedPeriod,
    groupedShifts,
    mandatoryEventIds,
    isAnchor,
    isCurrentlyPassive,
    isCurrentlyLegacy,
    includesShiftStatusQuestions,
    isLoading,
    isSubmitDisabled,
    handleSetEventChoice,
    handleSetCanShiftIdsForEvent,
    handleSetParticipationStatus,
    handleSubmit,
  } = useShiftAvailabilityForm();

  if (isLoading) {
    return (
      <Layout style={{ minHeight: "100vh", background: "#f5f5f5" }}>
        <Content style={{ padding: 24 }}>
          <Card loading />
        </Content>
      </Layout>
    );
  }

  if (!selectedPeriod) {
    return (
      <Layout style={{ minHeight: "100vh", background: "#f5f5f5" }}>
        <Content style={{ padding: 24 }}>
          <Card>
            <Title level={3}>Shift Availability</Title>
            <Empty description="No available surveys to submit." />
          </Card>
        </Content>
      </Layout>
    );
  }

  const editor: FormEditorState = {
    participationStatus,
    onParticipationStatusChange: handleSetParticipationStatus,
    wantsAnchor,
    onWantsAnchorChange: setWantsAnchor,
    anchorOnly,
    onAnchorOnlyChange: setAnchorOnly,
    anchorSeminarDays,
    onAnchorSeminarDaysChange: setAnchorSeminarDays,
    shiftLoadPreference,
    onShiftLoadPreferenceChange: setShiftLoadPreference,
    eventChoices,
    onEventChoiceChange: handleSetEventChoice,
    eventCanShiftIds,
    onEventCanShiftIdsChange: handleSetCanShiftIdsForEvent,
    passiveReason,
    onPassiveReasonChange: setPassiveReason,
    privateEmail,
    onPrivateEmailChange: setPrivateEmail,
    comments,
    onCommentsChange: setComments,
  };

  return (
    <Layout style={{ minHeight: "100vh", background: "#f5f5f5" }}>
      <Content style={{ padding: 24 }}>
        <Card>
          <Space direction="vertical" size="large" style={{ width: "100%" }}>
            <div>
              <Title level={3} style={{ marginBottom: 0 }}>
                Shift Availability
              </Title>

              {availablePeriods.length > 1 ? (
                <Space direction="vertical" style={{ width: "100%", marginTop: 8 }} size="small">
                  <Text type="secondary">Survey period</Text>
                  <Select
                    size="large"
                    style={{ width: "100%", maxWidth: 560 }}
                    value={selectedPeriod.id}
                    onChange={(value) => setSelectedPeriodId(value)}
                    options={availablePeriods.map((period) => ({
                      value: period.id,
                      label: `${period.name} (deadline: ${dayjs(period.submissionClosesAt).format("DD/MM/YYYY HH:mm")})${answeredByPeriodId[period.id] ? " - answered" : ""}`,
                    }))}
                  />
                </Space>
              ) : (
                <Text type="secondary">{selectedPeriod.name}</Text>
              )}
            </div>

            <Alert
              type="info"
              showIcon
              message={
                includesShiftStatusQuestions
                  ? hasSubmitted
                    ? `You have already submitted this form but are able to make changes until the deadline at ${selectedPeriod.submissionClosesAt.toLocaleString()}.`
                    : `Submission deadline: ${selectedPeriod.submissionClosesAt.toLocaleString()}`
                  : hasSubmitted
                    ? `You have already submitted event availability and can edit it until ${selectedPeriod.submissionClosesAt.toLocaleString()}.`
                    : `Submission deadline: ${selectedPeriod.submissionClosesAt.toLocaleString()}`
              }
              description={
                hasSubmitted && submittedAt
                  ? `Latest submission saved at ${submittedAt.toLocaleString()}.`
                  : includesShiftStatusQuestions
                    ? "Choose your semester status first. If active, complete anchor intent and event availability."
                    : "Answer event availability for each event below."
              }
            />

            <ShiftAvailabilityForm
              includesShiftStatusQuestions={includesShiftStatusQuestions}
              isCurrentlyPassive={isCurrentlyPassive}
              isCurrentlyLegacy={isCurrentlyLegacy}
              isAnchor={isAnchor}
              periodAnchorSeminarDays={selectedPeriod.anchorSeminarDays ?? []}
              periodEventGroups={groupedShifts}
              mandatoryEventIds={mandatoryEventIds}
              editor={editor}
              onSubmit={handleSubmit}
              submitting={saving}
              isSubmitDisabled={isSubmitDisabled}
              hasExistingResponse={hasSubmitted}
              confirmBeforeSubmit
            />
          </Space>
        </Card>
      </Content>
    </Layout>
  );
}
