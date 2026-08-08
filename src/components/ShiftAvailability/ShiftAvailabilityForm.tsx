import { Button, Card, Input, Popconfirm, Space, Typography } from "antd";
import {
  EventChoice,
  ParticipationStatus,
  Shift,
  ShiftLoadPreference,
} from "../../types/types-file";
import AnchorPreferenceCard from "./AnchorPreferenceCard";
import EventAvailabilityGrid from "./EventAvailabilityGrid";
import SemesterParticipationCard from "./SemesterParticipationCard";
import ShiftLoadPreferenceCard from "./ShiftLoadPreferenceCard";

const { TextArea } = Input;

type EventGroup = {
  eventId: string;
  event?: { id: string; title: string; start: Date };
  shifts: Shift[];
};

export type FormEditorState = {
  participationStatus: ParticipationStatus | undefined;
  onParticipationStatusChange: (status: ParticipationStatus) => void;
  wantsAnchor: boolean | undefined;
  onWantsAnchorChange: (value: boolean) => void;
  anchorOnly: boolean;
  onAnchorOnlyChange: (value: boolean) => void;
  anchorSeminarDays: string[];
  onAnchorSeminarDaysChange: (value: string[]) => void;
  shiftLoadPreference: ShiftLoadPreference;
  onShiftLoadPreferenceChange: (value: ShiftLoadPreference) => void;
  eventChoices: Partial<Record<string, EventChoice>>;
  onEventChoiceChange: (eventId: string, value: EventChoice) => void;
  eventCanShiftIds: Record<string, string[]>;
  onEventCanShiftIdsChange: (eventId: string, shiftIds: string[]) => void;
  passiveReason: string;
  onPassiveReasonChange: (value: string) => void;
  privateEmail: string;
  onPrivateEmailChange: (value: string) => void;
  comments: string;
  onCommentsChange: (value: string) => void;
};

export type ShiftAvailabilityFormProps = {
  includesShiftStatusQuestions: boolean;
  isCurrentlyPassive: boolean;
  isCurrentlyLegacy: boolean;
  isAnchor: boolean;
  periodAnchorSeminarDays: string[];
  periodEventGroups: EventGroup[];
  mandatoryEventIds?: Set<string>;
  editor: FormEditorState;
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
  isAnchor,
  periodAnchorSeminarDays,
  periodEventGroups,
  mandatoryEventIds,
  editor,
  onSubmit,
  submitting,
  isSubmitDisabled,
  hasExistingResponse,
  confirmBeforeSubmit,
}: ShiftAvailabilityFormProps) {
  const isActiveParticipant = includesShiftStatusQuestions
    ? editor.participationStatus === "active"
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
          participationStatus={editor.participationStatus}
          onChange={editor.onParticipationStatusChange}
          passiveReason={editor.passiveReason}
          onPassiveReasonChange={editor.onPassiveReasonChange}
        />
      )}

      {includesShiftStatusQuestions && editor.participationStatus === "active" && (
        <AnchorPreferenceCard
          wantsAnchor={editor.wantsAnchor}
          isAnchor={isAnchor}
          anchorOnly={editor.anchorOnly}
          anchorSeminarDays={editor.anchorSeminarDays}
          periodAnchorSeminarDays={periodAnchorSeminarDays}
          onWantsAnchorChange={editor.onWantsAnchorChange}
          onAnchorOnlyChange={editor.onAnchorOnlyChange}
          onAnchorSeminarDaysChange={editor.onAnchorSeminarDaysChange}
        />
      )}

      {includesShiftStatusQuestions && editor.participationStatus === "active" && (
        <ShiftLoadPreferenceCard
          shiftLoadPreference={editor.shiftLoadPreference}
          onChange={editor.onShiftLoadPreferenceChange}
        />
      )}

      {editor.participationStatus === "legacy" && (
        <Card size="small" title="Contact for Teams">
          <Space direction="vertical" style={{ width: "100%" }}>
            <Typography.Text type="secondary">
              Private email that we can invite to Teams (leave blank to use your ITU email).
            </Typography.Text>
            <Input
              value={editor.privateEmail}
              onChange={(e) => editor.onPrivateEmailChange(e.target.value)}
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
          eventChoices={editor.eventChoices}
          eventCanShiftIds={editor.eventCanShiftIds}
          onEventChoiceChange={editor.onEventChoiceChange}
          onCanShiftIdsChange={editor.onEventCanShiftIdsChange}
        />
      )}

      <Card size="small" title="Any other comments?">
        <TextArea
          rows={4}
          value={editor.comments}
          onChange={(e) => editor.onCommentsChange(e.target.value)}
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
