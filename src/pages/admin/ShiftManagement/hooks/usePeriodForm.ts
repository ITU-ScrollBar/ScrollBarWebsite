import { notification } from "antd";
import dayjs, { Dayjs } from "dayjs";
import { useState } from "react";
import { CreateShiftPlanningPeriodPayload } from "../../../../firebase/api/shiftPlanning";
import { ShiftPlanningPeriod, ShiftPlanningSurveyType } from "../../../../types/types-file";

type UpdatePeriodPayload = Partial<{
  name: string;
  eventIds: string[];
  mandatoryEventIds: string[];
  surveyType: ShiftPlanningSurveyType;
  submissionOpensAt: Date;
  submissionClosesAt: Date;
  status: "draft" | "open" | "closed" | "generated";
  anchorSeminarDays: string[];
}>;

type UsePeriodFormParams = {
  currentUserId: string | undefined;
  selectedPeriod: ShiftPlanningPeriod | null;
  selectedPeriodSurveyType: ShiftPlanningSurveyType;
  submissionCount: number;
  createPeriod: (payload: CreateShiftPlanningPeriodPayload) => Promise<{ id?: string }>;
  updatePeriod: (id: string, updates: UpdatePeriodPayload) => Promise<void>;
  onPeriodCreated: (periodId: string) => void;
};

export const usePeriodForm = ({
  currentUserId,
  selectedPeriod,
  selectedPeriodSurveyType,
  submissionCount,
  createPeriod,
  updatePeriod,
  onPeriodCreated,
}: UsePeriodFormParams) => {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(false);

  const [newPeriodName, setNewPeriodName] = useState("");
  const [newPeriodWindow, setNewPeriodWindow] = useState<[Dayjs, Dayjs] | null>(null);
  const [newPeriodEventIds, setNewPeriodEventIds] = useState<string[]>([]);
  const [newPeriodMandatoryEventIds, setNewPeriodMandatoryEventIds] = useState<string[]>([]);
  const [newPeriodSurveyType, setNewPeriodSurveyType] = useState<ShiftPlanningSurveyType>("regularSemesterSurvey");
  const [newPeriodAnchorSeminarDays, setNewPeriodAnchorSeminarDays] = useState<string[]>([]);

  const [editPeriodName, setEditPeriodName] = useState("");
  const [editPeriodDeadline, setEditPeriodDeadline] = useState<Dayjs | null>(null);
  const [editPeriodEventIds, setEditPeriodEventIds] = useState<string[]>([]);
  const [editPeriodMandatoryEventIds, setEditPeriodMandatoryEventIds] = useState<string[]>([]);
  const [editPeriodSurveyType, setEditPeriodSurveyType] = useState<ShiftPlanningSurveyType>("regularSemesterSurvey");
  const [editPeriodAnchorSeminarDays, setEditPeriodAnchorSeminarDays] = useState<string[]>([]);

  const resetCreateForm = () => {
    setNewPeriodName("");
    setNewPeriodWindow(null);
    setNewPeriodEventIds([]);
    setNewPeriodMandatoryEventIds([]);
    setNewPeriodSurveyType("regularSemesterSurvey");
    setNewPeriodAnchorSeminarDays([]);
  };

  const openCreate = () => setIsCreateOpen(true);

  const closeCreate = () => {
    setIsCreateOpen(false);
    resetCreateForm();
  };

  const openEdit = () => {
    if (!selectedPeriod) {
      return;
    }
    setEditPeriodName(selectedPeriod.name);
    setEditPeriodDeadline(dayjs(selectedPeriod.submissionClosesAt));
    setEditPeriodEventIds(selectedPeriod.eventIds);
    setEditPeriodMandatoryEventIds(selectedPeriod.mandatoryEventIds ?? []);
    setEditPeriodSurveyType(selectedPeriodSurveyType);
    setEditPeriodAnchorSeminarDays(selectedPeriod.anchorSeminarDays ?? []);
    setIsEditOpen(true);
  };

  const closeEdit = () => {
    setIsEditOpen(false);
    setEditPeriodName("");
    setEditPeriodDeadline(null);
    setEditPeriodEventIds([]);
    setEditPeriodMandatoryEventIds([]);
    setEditPeriodSurveyType("regularSemesterSurvey");
    setEditPeriodAnchorSeminarDays([]);
  };

  const handleCreate = async () => {
    if (!currentUserId) {
      return;
    }

    if (!newPeriodName.trim()) {
      notification.error({
        message: "Missing period name",
        description: "Please enter a name for the planning period.",
      });
      return;
    }

    if (!newPeriodWindow) {
      notification.error({
        message: "Missing submission window",
        description: "Please pick a submission start and end time.",
      });
      return;
    }

    if (newPeriodEventIds.length === 0) {
      notification.error({
        message: "No events selected",
        description: "Select at least one event for the planning period.",
      });
      return;
    }

    setCreating(true);
    try {
      const created = await createPeriod({
        name: newPeriodName.trim(),
        eventIds: newPeriodEventIds,
        mandatoryEventIds: newPeriodMandatoryEventIds,
        surveyType: newPeriodSurveyType,
        submissionOpensAt: newPeriodWindow[0].toDate(),
        submissionClosesAt: newPeriodWindow[1].toDate(),
        status: "open",
        createdBy: currentUserId,
        anchorSeminarDays: newPeriodAnchorSeminarDays,
      });

      if (created && typeof created.id === "string") {
        onPeriodCreated(created.id);
      }

      closeCreate();
    } finally {
      setCreating(false);
    }
  };

  const handleUpdate = async () => {
    if (!selectedPeriod) {
      return;
    }

    if (!editPeriodName.trim()) {
      notification.error({
        message: "Missing period name",
        description: "Please enter a name for the planning period.",
      });
      return;
    }

    if (!editPeriodDeadline) {
      notification.error({
        message: "Missing submission deadline",
        description: "Please pick a submission deadline.",
      });
      return;
    }

    if (submissionCount === 0 && editPeriodEventIds.length === 0) {
      notification.error({
        message: "No events selected",
        description: "Select at least one event for the planning period.",
      });
      return;
    }

    setEditing(true);
    try {
      const periodEventIds = submissionCount === 0 ? editPeriodEventIds : selectedPeriod.eventIds;
      await updatePeriod(selectedPeriod.id, {
        name: editPeriodName.trim(),
        submissionClosesAt: editPeriodDeadline.toDate(),
        surveyType: editPeriodSurveyType,
        eventIds: periodEventIds,
        mandatoryEventIds: editPeriodMandatoryEventIds.filter((eventId) =>
          periodEventIds.includes(eventId)
        ),
        anchorSeminarDays: editPeriodAnchorSeminarDays,
      });

      closeEdit();
    } finally {
      setEditing(false);
    }
  };

  return {
    isCreateOpen,
    isEditOpen,
    creating,
    editing,
    openCreate,
    closeCreate,
    openEdit,
    closeEdit,
    handleCreate,
    handleUpdate,
    newPeriodName,
    setNewPeriodName,
    newPeriodWindow,
    setNewPeriodWindow,
    newPeriodEventIds,
    setNewPeriodEventIds,
    newPeriodMandatoryEventIds,
    setNewPeriodMandatoryEventIds,
    newPeriodSurveyType,
    setNewPeriodSurveyType,
    newPeriodAnchorSeminarDays,
    setNewPeriodAnchorSeminarDays,
    editPeriodName,
    setEditPeriodName,
    editPeriodDeadline,
    setEditPeriodDeadline,
    editPeriodEventIds,
    setEditPeriodEventIds,
    editPeriodMandatoryEventIds,
    setEditPeriodMandatoryEventIds,
    editPeriodSurveyType,
    setEditPeriodSurveyType,
    editPeriodAnchorSeminarDays,
    setEditPeriodAnchorSeminarDays,
  };
};
