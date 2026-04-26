import { Button, Card, Input, Popconfirm, Space, Typography } from "antd";
import { EventChoice, ParticipationStatus, Shift } from "../../types/types-file";
import EventAvailabilityGrid from "./EventAvailabilityGrid";
import SemesterParticipationCard from "./SemesterParticipationCard";

const { TextArea } = Input;

type EventGroup = {
  eventId: string;
  event?: { id: string; title: string; start: Date };
  shifts: Shift[];
};

export type ShiftAvailabilityFormProps = {
  includesShiftStatusQuestions: boolean;

  isCurrentlyPassive: boolean;
  isCurrentlyLegacy: boolean;
  participationStatus: ParticipationStatus | undefined;
  onParticipationStatusChange: (status: ParticipationStatus) => void;

  isAnchor: boolean;
  wantsAnchor: boolean | undefined;
  onWantsAnchorChange: (value: boolean) => void;
  anchorOnly: boolean;
  onAnchorOnlyChange: (value: boolean) => void;
  anchorSeminarDays: string[];
  onAnchorSeminarDaysChange: (value: string[]) => void;
  periodAnchorSeminarDays: string[];

  periodEventGroups: EventGroup[];
  mandatoryEventIds?: Set<string>;
  eventChoices: Partial<Record<string, EventChoice>>;
  eventCanShiftIds: Record<string, string[]>;
  onEventChoiceChange: (eventId: string, value: EventChoice) => void;
  onEventCanShiftIdsChange: (eventId: string, shiftIds: string[]) => void;

  passiveReason: string;
  onPassiveReasonChange: (value: string) => void;

  privateEmail: string;
  onPrivateEmailChange: (value: string) => void;

  comments: string;
  onCommentsChange: (value: string) => void;

  onSubmit: () => void;
  submitting?: boolean;
  isSubmitDisabled?: boolean;
  hasExistingResponse?: boolean;
  confirmBeforeSubmit?: boolean;
};

export default function ShiftAvailabilityForm({
  includesShiftStatusQuestions,
  isCurrentlyPassive,
  isCurrentlyLegacy,
  participationStatus,
  onParticipationStatusChange,
  isAnchor,
  wantsAnchor,
  onWantsAnchorChange,
  anchorOnly,
  onAnchorOnlyChange,
  anchorSeminarDays,
  onAnchorSeminarDaysChange,
  periodAnchorSeminarDays,
  periodEventGroups,
  mandatoryEventIds,
  eventChoices,
  eventCanShiftIds,
  onEventChoiceChange,
  onEventCanShiftIdsChange,
  passiveReason,
  onPassiveReasonChange,
  privateEmail,
  onPrivateEmailChange,
  comments,
  onCommentsChange,
  onSubmit,
  submitting,
  isSubmitDisabled,
  hasExistingResponse,
  confirmBeforeSubmit,
}: ShiftAvailabilityFormProps) {
  const isActiveParticipant = includesShiftStatusQuestions
    ? participationStatus === "active"
    : true;

  const submitButton = (
    <Button
      type="primary"
      size="large"
      loading={submitting}
      disabled={isSubmitDisabled}
      onClick={confirmBeforeSubmit ? undefined : onSubmit}
    >
      {hasExistingResponse ? "Update availability" : "Submit availability"}
    </Button>
  );

  return (
    <Space direction="vertical" size="middle" style={{ width: "100%" }}>
      {includesShiftStatusQuestions && (
        <SemesterParticipationCard
          isCurrentlyLegacy={isCurrentlyLegacy}
          isCurrentlyPassive={isCurrentlyPassive}
          participationStatus={participationStatus}
          onChange={onParticipationStatusChange}
          passiveReason={passiveReason}
          onPassiveReasonChange={onPassiveReasonChange}
          isAnchor={isAnchor}
          wantsAnchor={wantsAnchor}
          onWantsAnchorChange={onWantsAnchorChange}
          anchorOnly={anchorOnly}
          onAnchorOnlyChange={onAnchorOnlyChange}
          anchorSeminarDays={anchorSeminarDays}
          onAnchorSeminarDaysChange={onAnchorSeminarDaysChange}
          periodAnchorSeminarDays={periodAnchorSeminarDays}
        />
      )}

      {participationStatus === "legacy" && (
        <Card size="small" title="Contact for Teams">
          <Space direction="vertical" style={{ width: "100%" }}>
            <Typography.Text type="secondary">
              Private email that we can invite to Teams (leave blank to use your ITU email).
            </Typography.Text>
            <Input
              value={privateEmail}
              onChange={(e) => onPrivateEmailChange(e.target.value)}
              placeholder="your@email.com"
              type="email"
            />
          </Space>
        </Card>
      )}

      {isActiveParticipant && (
        <EventAvailabilityGrid
          groupedShifts={periodEventGroups}
          mandatoryEventIds={mandatoryEventIds ?? new Set()}
          eventChoices={eventChoices}
          eventCanShiftIds={eventCanShiftIds}
          onEventChoiceChange={onEventChoiceChange}
          onCanShiftIdsChange={onEventCanShiftIdsChange}
        />
      )}

      <Card size="small" title="Any other comments?">
        <TextArea
          rows={4}
          value={comments}
          onChange={(e) => onCommentsChange(e.target.value)}
          placeholder="Optional: add anything the shift manager should know."
        />
      </Card>

      {confirmBeforeSubmit ? (
        <Popconfirm
          title="Submit shift availability"
          description="You can keep editing your answers until the submission deadline."
          onConfirm={onSubmit}
          okText="Submit"
          disabled={isSubmitDisabled}
        >
          {submitButton}
        </Popconfirm>
      ) : (
        submitButton
      )}
    </Space>
  );
}
