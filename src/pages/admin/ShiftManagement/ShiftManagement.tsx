import { TeamOutlined } from "@ant-design/icons";
import { Alert, Empty, Layout, Space, Tabs, notification } from "antd";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../../contexts/AuthContext";
import { useShiftContext } from "../../../contexts/ShiftContext";
import useEvents from "../../../hooks/useEvents";
import useShiftPlanning from "../../../hooks/useShiftPlanning";
import useTenders from "../../../hooks/useTenders";
import { ShiftCategory, ShiftPlanningSurveyType } from "../../../types/types-file";
import { resolveSurveyType } from "../../../firebase/api/shiftPlanning";
import ShiftPlanningResponsesPage from "../ShiftPlanningResponsesPage";
import CustomShiftModal from "./components/CustomShiftModal";
import ShiftPeriodModals from "./components/ShiftPeriodModals";
import ShiftPeriodSelector from "./components/ShiftPeriodSelector";
import ShiftPlanningTab from "./components/ShiftPlanningTab";
import ShiftPlanOverviewTab from "./components/ShiftPlanOverviewTab";
import { usePeriodForm } from "./hooks/usePeriodForm";

const { Content } = Layout;

type ShiftManagementTabKey = "planning" | "survey-overview" | "survey-individual" | "shifts-overview";

export default function ShiftManagement() {
  const { currentUser } = useAuth();
  const { eventState, updateEvent } = useEvents();
  const { shiftState, addShift, removeShift, updateShift } = useShiftContext();
  const [selectedPeriodId, setSelectedPeriodId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ShiftManagementTabKey>("planning");
  const { periodState, responseState, createPeriod, updatePeriod, triggerGeneratePlan } =
    useShiftPlanning(selectedPeriodId ?? undefined);
  const { tenderState, deleteTender } = useTenders();

  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [generatingPlan, setGeneratingPlan] = useState(false);
  const [generationSummary, setGenerationSummary] = useState<string | null>(null);
  const [generationWarnings, setGenerationWarnings] = useState<string[]>([]);
  const [isCustomShiftModalOpen, setIsCustomShiftModalOpen] = useState(false);
  const [customShiftTitle, setCustomShiftTitle] = useState("");
  const [customShiftLocation, setCustomShiftLocation] = useState("Main bar");
  const [customShiftStart, setCustomShiftStart] = useState<Date>(new Date());
  const [customShiftEnd, setCustomShiftEnd] = useState<Date>(
    new Date(Date.now() + 5 * 60 * 60 * 1000)
  );
  const [customShiftTenders, setCustomShiftTenders] = useState(4);
  const [customShiftCategory, setCustomShiftCategory] = useState<ShiftCategory | undefined>(undefined);

  const sortedEvents = useMemo(() => {
    return [...eventState.events].sort((a, b) => a.start.getTime() - b.start.getTime());
  }, [eventState.events]);

  const allEvents = useMemo(() => {
    return [...eventState.events, ...eventState.previousEvents];
  }, [eventState.events, eventState.previousEvents]);

  const sortedPeriods = useMemo(() => {
    return [...periodState.periods].sort(
      (a, b) => b.submissionClosesAt.getTime() - a.submissionClosesAt.getTime()
    );
  }, [periodState.periods]);

  const selectedPeriod = selectedPeriodId
    ? (sortedPeriods.find((period) => period.id === selectedPeriodId) ?? null)
    : null;

  const selectedPeriodSurveyType = useMemo<ShiftPlanningSurveyType>(
    () => (selectedPeriod ? resolveSurveyType(selectedPeriod) : "regularSemesterSurvey"),
    [selectedPeriod]
  );

  const selectedPeriodEvents = useMemo(() => {
    if (!selectedPeriod) {
      return [];
    }
    const selectedEventIds = new Set(selectedPeriod.eventIds);
    return allEvents
      .filter((event) => selectedEventIds.has(event.id))
      .sort((a, b) => a.start.getTime() - b.start.getTime());
  }, [allEvents, selectedPeriod]);

  const currentEvent = selectedEventId
    ? (selectedPeriodEvents.find((event) => event.id === selectedEventId) ?? null)
    : null;

  const periodShifts = useMemo(() => {
    if (!selectedPeriod) return [];
    const periodEventIds = new Set(selectedPeriod.eventIds);
    return shiftState.shifts.filter((shift) => periodEventIds.has(shift.eventId));
  }, [selectedPeriod, shiftState.shifts]);

  useEffect(() => {
    if (!selectedPeriodId && sortedPeriods.length > 0) {
      setSelectedPeriodId(sortedPeriods[0].id);
    }
  }, [selectedPeriodId, sortedPeriods]);

  useEffect(() => {
    if (!selectedPeriodEvents.length) {
      setSelectedEventId(null);
      return;
    }

    if (!selectedEventId || !selectedPeriodEvents.some((event) => event.id === selectedEventId)) {
      setSelectedEventId(selectedPeriodEvents[0].id);
    }
  }, [selectedEventId, selectedPeriodEvents]);

  const submissionCount = responseState.responses.length;
  const expectedSubmissions = selectedPeriod?.stats?.expectedSubmissions;
  const missingSubmissions =
    typeof expectedSubmissions === "number"
      ? Math.max(0, expectedSubmissions - submissionCount)
      : undefined;

  const activeResponsesCount = responseState.responses.filter(
    (response) => (response.participationStatus ?? "active") === "active"
  ).length;

  const totalShiftSpots = selectedPeriod
    ? shiftState.shifts
      .filter((shift) => selectedPeriod.eventIds.includes(shift.eventId))
      .reduce((sum, shift) => sum + (shift.tenders ?? 0), 0)
    : 0;

  const shiftsPerMember =
    activeResponsesCount > 0 ? (totalShiftSpots / activeResponsesCount).toFixed(2) : "-";

  const periodForm = usePeriodForm({
    currentUserId: currentUser?.uid,
    selectedPeriod,
    selectedPeriodSurveyType,
    submissionCount,
    createPeriod,
    updatePeriod,
    onPeriodCreated: setSelectedPeriodId,
  });

  const handleGeneratePlan = async () => {
    if (!selectedPeriod) {
      return;
    }

    setGeneratingPlan(true);
    setGenerationWarnings([]);
    try {
      const result = await triggerGeneratePlan(selectedPeriod.id);
      setGenerationSummary(
        `Generated ${result.createdEngagementCount} engagements (${result.assignedAnchorCount} anchors, ${result.assignedTenderCount} tenders). Unfilled tender slots: ${result.unfilledTenderSlots}.`
      );
      setGenerationWarnings((result.warnings ?? []).map((warning) => warning.message));
    } catch (err) {
      notification.error({
        message: "Failed to generate shift plan",
        description: err instanceof Error ? err.message : "An unexpected error occurred.",
      });
    } finally {
      setGeneratingPlan(false);
    }
  };

  const handlePublishSelectedPeriodShifts = async () => {
    if (!selectedPeriod) {
      return;
    }

    const targetEventIds = new Set(selectedPeriod.eventIds);
    const targetEvents = allEvents.filter((event) => targetEventIds.has(event.id));

    try {
      await Promise.all(
        targetEvents
          .filter((event) => !event.shiftsPublished)
          .map((event) => updateEvent(event.id, "shiftsPublished", true))
      );

      notification.success({
        message: "Success",
        description: `Shifts published for ${selectedPeriod.name}.`,
      });
    } catch {
      notification.error({
        message: "Failed",
        description: "Failed to publish one or more events in the selected period.",
      });
    }
  };

  const openCustomShiftModal = () => {
    if (!currentEvent) {
      return;
    }

    setCustomShiftTitle("");
    setCustomShiftLocation(currentEvent.where || "Main bar");
    setCustomShiftStart(new Date(currentEvent.start));
    setCustomShiftEnd(new Date(currentEvent.start.getTime() + 5 * 60 * 60 * 1000));
    setCustomShiftTenders(4);
    setCustomShiftCategory(undefined);
    setIsCustomShiftModalOpen(true);
  };

  const addDefaultShifts = async () => {
    if (!currentEvent) {
      return;
    }

    const eventStart = new Date(currentEvent.start);
    const eventEnd = new Date(currentEvent.end);
    const hours = 60 * 60 * 1000;

    const openingStart = new Date(eventStart.getTime() - 1 * hours);
    const openingEnd = new Date(eventStart.getTime() + 4 * hours);
    const middleEnd = new Date(openingEnd.getTime() + 4 * hours);

    const defaultShifts = [
      {
        id: "",
        eventId: currentEvent.id,
        title: "Opening",
        location: currentEvent.where || "Main bar",
        start: openingStart,
        end: openingEnd,
        tenders: 4,
        category: "opening" as const,
      },
      {
        id: "",
        eventId: currentEvent.id,
        title: "Middle",
        location: currentEvent.where || "Main bar",
        start: openingEnd,
        end: middleEnd,
        tenders: 7,
        category: "middle" as const,
      },
      {
        id: "",
        eventId: currentEvent.id,
        title: "Closing",
        location: currentEvent.where || "Main bar",
        start: middleEnd,
        end: eventEnd,
        tenders: 7,
        category: "closing" as const,
      },
    ];

    try {
      await Promise.all(defaultShifts.map((shift) => addShift(shift)));
      notification.success({
        message: "Success",
        description: "Default shifts added successfully.",
      });
    } catch {
      notification.error({
        message: "Failed",
        description: "Failed to add default shifts.",
      });
    }
  };

  const addBigPartyShifts = async () => {
    if (!currentEvent) {
      return;
    }

    const eventStart = new Date(currentEvent.start);
    const eventEnd = new Date(currentEvent.end);
    const hours = 60 * 60 * 1000;

    const openingStart = new Date(eventStart.getTime() - 1 * hours);
    const openingEnd = new Date(eventStart.getTime() + 2 * hours);
    const earlyMiddleEnd = new Date(openingEnd.getTime() + 2 * hours);
    const middleEnd = new Date(earlyMiddleEnd.getTime() + 3 * hours);
    const lateMiddleEnd = new Date(middleEnd.getTime() + 2 * hours);

    const bigPartyShifts = [
      { id: "", eventId: currentEvent.id, title: "Opening + Setup", start: openingStart, end: openingEnd, tenders: 5, category: "opening" as const },
      { id: "", eventId: currentEvent.id, title: "Early middle + Setup", start: openingEnd, end: earlyMiddleEnd, tenders: 6, category: "opening" as const },
      { id: "", eventId: currentEvent.id, title: "Middle", start: earlyMiddleEnd, end: middleEnd, tenders: 7, category: "middle" as const },
      { id: "", eventId: currentEvent.id, title: "Late middle + Cleaning", start: middleEnd, end: lateMiddleEnd, tenders: 7, category: "closing" as const },
      { id: "", eventId: currentEvent.id, title: "Closing + Cleaning", start: lateMiddleEnd, end: eventEnd, tenders: 5, category: "closing" as const },
    ];

    try {
      for (const shift of bigPartyShifts) {
        const primary = { ...shift, location: "Main bar" };
        const primaryId = await addShift(primary);
        await addShift({ ...primary, id: "", location: "Satellite", linkedShiftId: primaryId });
      }
      notification.success({
        message: "Success",
        description: "Big party shifts added successfully.",
      });
    } catch {
      notification.error({
        message: "Failed",
        description: "Failed to add big party shifts.",
      });
    }
  };

  const handleAddCustomShift = async () => {
    if (!currentEvent) {
      return;
    }

    if (!customShiftTitle.trim()) {
      notification.error({
        message: "Missing shift title",
        description: "Please enter a title for the custom shift.",
      });
      return;
    }

    if (!customShiftCategory) {
      notification.error({
        message: "Missing category",
        description: "Please select a category for the custom shift.",
      });
      return;
    }

    if (customShiftEnd.getTime() <= customShiftStart.getTime()) {
      notification.error({
        message: "Invalid shift window",
        description: "Shift end must be after shift start.",
      });
      return;
    }

    try {
      await addShift({
        id: "",
        eventId: currentEvent.id,
        title: customShiftTitle.trim(),
        location: customShiftLocation,
        start: customShiftStart,
        end: customShiftEnd,
        tenders: customShiftTenders,
        category: customShiftCategory,
      });

      notification.success({
        message: "Success",
        description: "Custom shift added successfully.",
      });
      setIsCustomShiftModalOpen(false);
    } catch {
      notification.error({
        message: "Failed",
        description: "Failed to add custom shift.",
      });
    }
  };

  const handleToggleCurrentEventPublished = (checked: boolean) => {
    if (!currentEvent) {
      return;
    }
    updateEvent(currentEvent.id, "shiftsPublished", checked);
  };

  if (allEvents.length === 0) {
    return (
      <Layout style={{ minHeight: "100vh", background: "#f5f5f5" }}>
        <Content style={{ padding: "24px" }}>
          <div
            style={{
              background: "white",
              borderRadius: "8px",
              padding: "24px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
            }}
          >
            <h1 style={{ fontSize: "24px", fontWeight: 600, marginBottom: "16px" }}>
              <TeamOutlined style={{ marginRight: "12px" }} />
              Shift Management
            </h1>
            <Empty
              style={{ margin: "60px 0" }}
              description="No events available. Please create an event first."
            />
          </div>
        </Content>
      </Layout>
    );
  }

  const shiftsForEvent = shiftState.shifts
    .filter((shift) => shift.eventId === currentEvent?.id)
    .sort((a, b) => a.start.getTime() - b.start.getTime());

  return eventState.isLoaded && shiftState.isLoaded ? (
    <Layout style={{ minHeight: "100vh", background: "#f5f5f5" }}>
      <Content style={{ padding: "24px" }}>
        <div
          style={{
            background: "white",
            borderRadius: "8px",
            padding: "24px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          }}
        >
          <Space direction="vertical" style={{ width: "100%", marginBottom: "24px" }} size="middle">
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <h1 style={{ margin: 0, fontSize: "24px", fontWeight: 600 }}>
                <TeamOutlined style={{ marginRight: "12px" }} />
                Shift Management
              </h1>
            </div>

            <ShiftPeriodSelector
              sortedPeriods={sortedPeriods}
              selectedPeriodId={selectedPeriod?.id}
              onSelectedPeriodChange={(periodId) => setSelectedPeriodId(periodId)}
              onCreatePeriod={periodForm.openCreate}
              onEditPeriod={periodForm.openEdit}
              hasSelectedPeriod={Boolean(selectedPeriod)}
            />

            {selectedPeriod ? (
              <Tabs
                activeKey={activeTab}
                onChange={(key) => setActiveTab(key as ShiftManagementTabKey)}
                items={[
                  {
                    key: "planning",
                    label: "Shifts",
                    children: (
                      <ShiftPlanningTab
                        selectedPeriod={selectedPeriod}
                        submissionCount={submissionCount}
                        expectedSubmissions={expectedSubmissions}
                        missingSubmissions={missingSubmissions}
                        shiftsPerMember={shiftsPerMember}
                        generatingPlan={generatingPlan}
                        onGeneratePlan={handleGeneratePlan}
                        onPublishSelectedPeriodShifts={handlePublishSelectedPeriodShifts}
                        generationSummary={generationSummary}
                        generationWarnings={generationWarnings}
                        currentEvent={currentEvent}
                        selectedPeriodEvents={selectedPeriodEvents}
                        onSelectedEventChange={setSelectedEventId}
                        onToggleShiftsPublished={handleToggleCurrentEventPublished}
                        onAddDefaultShifts={addDefaultShifts}
                        onOpenCustomShiftModal={openCustomShiftModal}
                        onAddBigPartyShifts={addBigPartyShifts}
                        shiftsForEvent={shiftsForEvent}
                        addShift={addShift}
                        updateShift={updateShift}
                        removeShift={removeShift}
                        periodResponses={responseState.responses}
                      />
                    ),
                  },
                  {
                    key: "survey-overview",
                    label: "Survey Overview",
                    children: (
                      <ShiftPlanningResponsesPage
                        embedded
                        embeddedSection="overview"
                        selectedPeriodId={selectedPeriod.id}
                        onSelectedPeriodIdChange={(periodId) => setSelectedPeriodId(periodId)}
                      />
                    ),
                  },
                  {
                    key: "survey-individual",
                    label: "Individual Responses",
                    children: (
                      <ShiftPlanningResponsesPage
                        embedded
                        embeddedSection="individual"
                        selectedPeriodId={selectedPeriod.id}
                        onSelectedPeriodIdChange={(periodId) => setSelectedPeriodId(periodId)}
                      />
                    ),
                  },
                  ...(selectedPeriod.generatedAt ? [{
                    key: "shifts-overview" as const,
                    label: "Shifts Overview",
                    children: (
                      <ShiftPlanOverviewTab
                        selectedPeriod={selectedPeriod}
                        periodShifts={periodShifts}
                        tenders={tenderState.tenders}
                        responses={responseState.responses}
                        deleteTender={deleteTender}
                      />
                    ),
                  }] : []),
                ]}
              />
            ) : (
              <Alert
                type="info"
                showIcon
                message="Select or create a shift planning period to continue."
              />
            )}

            <ShiftPeriodModals
              isCreateOpen={periodForm.isCreateOpen}
              isEditOpen={periodForm.isEditOpen}
              creatingPeriod={periodForm.creating}
              editingPeriod={periodForm.editing}
              onCloseCreate={periodForm.closeCreate}
              onCloseEdit={periodForm.closeEdit}
              onCreate={periodForm.handleCreate}
              onUpdate={periodForm.handleUpdate}
              sortedEvents={sortedEvents}
              newPeriodName={periodForm.newPeriodName}
              onNewPeriodNameChange={periodForm.setNewPeriodName}
              newPeriodWindow={periodForm.newPeriodWindow}
              onNewPeriodWindowChange={periodForm.setNewPeriodWindow}
              newPeriodEventIds={periodForm.newPeriodEventIds}
              onNewPeriodEventIdsChange={periodForm.setNewPeriodEventIds}
              newPeriodMandatoryEventIds={periodForm.newPeriodMandatoryEventIds}
              onNewPeriodMandatoryEventIdsChange={periodForm.setNewPeriodMandatoryEventIds}
              newPeriodSurveyType={periodForm.newPeriodSurveyType}
              onNewPeriodSurveyTypeChange={periodForm.setNewPeriodSurveyType}
              editPeriodName={periodForm.editPeriodName}
              onEditPeriodNameChange={periodForm.setEditPeriodName}
              editPeriodDeadline={periodForm.editPeriodDeadline}
              onEditPeriodDeadlineChange={periodForm.setEditPeriodDeadline}
              editPeriodEventIds={periodForm.editPeriodEventIds}
              onEditPeriodEventIdsChange={periodForm.setEditPeriodEventIds}
              editPeriodMandatoryEventIds={periodForm.editPeriodMandatoryEventIds}
              onEditPeriodMandatoryEventIdsChange={periodForm.setEditPeriodMandatoryEventIds}
              editPeriodSurveyType={periodForm.editPeriodSurveyType}
              onEditPeriodSurveyTypeChange={periodForm.setEditPeriodSurveyType}
              newPeriodAnchorSeminarDays={periodForm.newPeriodAnchorSeminarDays}
              onNewPeriodAnchorSeminarDaysChange={periodForm.setNewPeriodAnchorSeminarDays}
              editPeriodAnchorSeminarDays={periodForm.editPeriodAnchorSeminarDays}
              onEditPeriodAnchorSeminarDaysChange={periodForm.setEditPeriodAnchorSeminarDays}
              submissionCount={submissionCount}
            />
          </Space>

          <CustomShiftModal
            open={isCustomShiftModalOpen}
            onClose={() => setIsCustomShiftModalOpen(false)}
            onAddShift={handleAddCustomShift}
            customShiftTitle={customShiftTitle}
            onCustomShiftTitleChange={setCustomShiftTitle}
            customShiftLocation={customShiftLocation}
            onCustomShiftLocationChange={setCustomShiftLocation}
            customShiftStart={customShiftStart}
            onCustomShiftStartChange={setCustomShiftStart}
            customShiftEnd={customShiftEnd}
            onCustomShiftEndChange={setCustomShiftEnd}
            customShiftTenders={customShiftTenders}
            onCustomShiftTendersChange={setCustomShiftTenders}
            customShiftCategory={customShiftCategory}
            onCustomShiftCategoryChange={setCustomShiftCategory}
          />
        </div>
      </Content>
    </Layout>
  ) : (
    <div style={{ textAlign: "center", padding: "60px 24px" }}>Loading...</div>
  );
}
