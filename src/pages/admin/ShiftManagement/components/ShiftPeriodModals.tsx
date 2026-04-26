import { Modal } from "antd";
import { Dayjs } from "dayjs";
import { Event, ShiftPlanningSurveyType } from "../../../../types/types-file";
import ShiftPeriodForm from "./ShiftPeriodForm";

type ShiftPeriodModalsProps = {
  isCreateOpen: boolean;
  isEditOpen: boolean;
  creatingPeriod: boolean;
  editingPeriod: boolean;
  onCloseCreate: () => void;
  onCloseEdit: () => void;
  onCreate: () => void;
  onUpdate: () => void;
  sortedEvents: Event[];
  newPeriodName: string;
  onNewPeriodNameChange: (value: string) => void;
  newPeriodWindow: [Dayjs, Dayjs] | null;
  onNewPeriodWindowChange: (value: [Dayjs, Dayjs] | null) => void;
  newPeriodEventIds: string[];
  onNewPeriodEventIdsChange: (value: string[]) => void;
  newPeriodMandatoryEventIds: string[];
  onNewPeriodMandatoryEventIdsChange: (value: string[]) => void;
  newPeriodSurveyType: ShiftPlanningSurveyType;
  onNewPeriodSurveyTypeChange: (value: ShiftPlanningSurveyType) => void;
  newPeriodAnchorSeminarDays: string[];
  onNewPeriodAnchorSeminarDaysChange: (value: string[]) => void;
  editPeriodName: string;
  onEditPeriodNameChange: (value: string) => void;
  editPeriodWindow: [Dayjs, Dayjs] | null;
  onEditPeriodWindowChange: (value: [Dayjs, Dayjs] | null) => void;
  editPeriodEventIds: string[];
  onEditPeriodEventIdsChange: (value: string[]) => void;
  editPeriodMandatoryEventIds: string[];
  onEditPeriodMandatoryEventIdsChange: (value: string[]) => void;
  editPeriodSurveyType: ShiftPlanningSurveyType;
  onEditPeriodSurveyTypeChange: (value: ShiftPlanningSurveyType) => void;
  editPeriodAnchorSeminarDays: string[];
  onEditPeriodAnchorSeminarDaysChange: (value: string[]) => void;
  submissionCount: number;
};

export default function ShiftPeriodModals({
  isCreateOpen,
  isEditOpen,
  creatingPeriod,
  editingPeriod,
  onCloseCreate,
  onCloseEdit,
  onCreate,
  onUpdate,
  sortedEvents,
  newPeriodName,
  onNewPeriodNameChange,
  newPeriodWindow,
  onNewPeriodWindowChange,
  newPeriodEventIds,
  onNewPeriodEventIdsChange,
  newPeriodMandatoryEventIds,
  onNewPeriodMandatoryEventIdsChange,
  newPeriodSurveyType,
  onNewPeriodSurveyTypeChange,
  newPeriodAnchorSeminarDays,
  onNewPeriodAnchorSeminarDaysChange,
  editPeriodName,
  onEditPeriodNameChange,
  editPeriodWindow,
  onEditPeriodWindowChange,
  editPeriodEventIds,
  onEditPeriodEventIdsChange,
  editPeriodMandatoryEventIds,
  onEditPeriodMandatoryEventIdsChange,
  editPeriodSurveyType,
  onEditPeriodSurveyTypeChange,
  editPeriodAnchorSeminarDays,
  onEditPeriodAnchorSeminarDaysChange,
  submissionCount,
}: ShiftPeriodModalsProps) {
  return (
    <>
      <Modal
        title="Create new shift planning period"
        open={isCreateOpen}
        onCancel={onCloseCreate}
        onOk={onCreate}
        okText="Create period"
        confirmLoading={creatingPeriod}
        width={760}
        destroyOnClose
      >
        <ShiftPeriodForm
          mode="create"
          sortedEvents={sortedEvents}
          submissionCount={submissionCount}
          periodName={newPeriodName}
          onPeriodNameChange={onNewPeriodNameChange}
          submissionWindow={newPeriodWindow}
          onSubmissionWindowChange={onNewPeriodWindowChange}
          periodEventIds={newPeriodEventIds}
          onPeriodEventIdsChange={onNewPeriodEventIdsChange}
          mandatoryEventIds={newPeriodMandatoryEventIds}
          onMandatoryEventIdsChange={onNewPeriodMandatoryEventIdsChange}
          surveyType={newPeriodSurveyType}
          onSurveyTypeChange={onNewPeriodSurveyTypeChange}
          anchorSeminarDays={newPeriodAnchorSeminarDays}
          onAnchorSeminarDaysChange={onNewPeriodAnchorSeminarDaysChange}
        />
      </Modal>

      <Modal
        title="Edit shift planning period"
        open={isEditOpen}
        onCancel={onCloseEdit}
        onOk={onUpdate}
        okText="Save changes"
        confirmLoading={editingPeriod}
        width={760}
        destroyOnClose
      >
        <ShiftPeriodForm
          mode="edit"
          sortedEvents={sortedEvents}
          submissionCount={submissionCount}
          periodName={editPeriodName}
          onPeriodNameChange={onEditPeriodNameChange}
          submissionWindow={editPeriodWindow}
          onSubmissionWindowChange={onEditPeriodWindowChange}
          periodEventIds={editPeriodEventIds}
          onPeriodEventIdsChange={onEditPeriodEventIdsChange}
          mandatoryEventIds={editPeriodMandatoryEventIds}
          onMandatoryEventIdsChange={onEditPeriodMandatoryEventIdsChange}
          surveyType={editPeriodSurveyType}
          onSurveyTypeChange={onEditPeriodSurveyTypeChange}
          anchorSeminarDays={editPeriodAnchorSeminarDays}
          onAnchorSeminarDaysChange={onEditPeriodAnchorSeminarDaysChange}
        />
      </Modal>
    </>
  );
}
