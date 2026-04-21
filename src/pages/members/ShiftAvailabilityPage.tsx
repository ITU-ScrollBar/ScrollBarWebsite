import {
  Alert,
  Button,
  Card,
  Empty,
  Input,
  Layout,
  Popconfirm,
  Select,
  Space,
  Typography,
} from "antd";
import dayjs from "dayjs";
import AnchorPreferenceCard from "./ShiftAvailability/components/AnchorPreferenceCard";
import EventAvailabilityGrid from "./ShiftAvailability/components/EventAvailabilityGrid";
import SemesterParticipationCard from "./ShiftAvailability/components/SemesterParticipationCard";
import { useShiftAvailabilityForm } from "./ShiftAvailability/hooks/useShiftAvailabilityForm";

const { Content } = Layout;
const { Title, Text } = Typography;
const { TextArea } = Input;

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
    isActiveParticipant,
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

            {includesShiftStatusQuestions && (
              <SemesterParticipationCard
                isCurrentlyLegacy={isCurrentlyLegacy}
                isCurrentlyPassive={isCurrentlyPassive}
                participationStatus={participationStatus}
                onChange={handleSetParticipationStatus}
              />
            )}

            {includesShiftStatusQuestions && isActiveParticipant && (
              <AnchorPreferenceCard
                wantsAnchor={wantsAnchor}
                isAnchor={isAnchor}
                anchorOnly={anchorOnly}
                anchorSeminarDays={anchorSeminarDays}
                periodAnchorSeminarDays={selectedPeriod.anchorSeminarDays ?? []}
                onWantsAnchorChange={setWantsAnchor}
                onAnchorOnlyChange={setAnchorOnly}
                onAnchorSeminarDaysChange={setAnchorSeminarDays}
              />
            )}

            {participationStatus === "passive" && (
              <Card size="small" title="Reason for being passive">
                <TextArea
                  rows={3}
                  value={passiveReason}
                  onChange={(e) => setPassiveReason(e.target.value)}
                  placeholder="Please provide a reason for being passive this semester."
                />
              </Card>
            )}

            {participationStatus === "legacy" && (
              <Card size="small" title="Contact for Teams">
                <Space direction="vertical" style={{ width: "100%" }}>
                  <Text type="secondary">
                    Private email that we can invite to Teams (leave blank to use your ITU email).
                  </Text>
                  <Input
                    value={privateEmail}
                    onChange={(e) => setPrivateEmail(e.target.value)}
                    placeholder="your@email.com"
                    type="email"
                  />
                </Space>
              </Card>
            )}

            {isActiveParticipant && (
              <EventAvailabilityGrid
                groupedShifts={groupedShifts}
                mandatoryEventIds={mandatoryEventIds}
                eventChoices={eventChoices}
                eventCanShiftIds={eventCanShiftIds}
                onEventChoiceChange={handleSetEventChoice}
                onCanShiftIdsChange={handleSetCanShiftIdsForEvent}
              />
            )}

            <Card size="small" title="Any other comments?">
              <TextArea
                rows={4}
                value={comments}
                onChange={(event) => setComments(event.target.value)}
                placeholder="Optional: add anything the shift manager should know."
              />
            </Card>

            <Popconfirm
              title="Submit shift availability"
              description="You can keep editing your answers until the submission deadline."
              onConfirm={handleSubmit}
              okText="Submit"
              disabled={isSubmitDisabled}
            >
              <Button
                type="primary"
                size="large"
                loading={saving}
                disabled={isSubmitDisabled}
              >
                Submit availability
              </Button>
            </Popconfirm>
          </Space>
        </Card>
      </Content>
    </Layout>
  );
}
