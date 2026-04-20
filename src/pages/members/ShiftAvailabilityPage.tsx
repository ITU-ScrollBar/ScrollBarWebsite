import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Empty,
  Input,
  Layout,
  message,
  Popconfirm,
  Select,
  Space,
  Typography,
} from "antd";
import dayjs from "dayjs";
import { useAuth } from "../../contexts/AuthContext";
import { useShiftContext } from "../../contexts/ShiftContext";
import useEvents from "../../hooks/useEvents";
import useShiftPlanning from "../../hooks/useShiftPlanning";
import { Role, Shift } from "../../types/types-file";
import { resolveSurveyType } from "../../firebase/api/shiftPlanning";
import AnchorPreferenceCard from "./ShiftAvailability/components/AnchorPreferenceCard";
import EventAvailabilityGrid from "./ShiftAvailability/components/EventAvailabilityGrid";
import SemesterParticipationCard from "./ShiftAvailability/components/SemesterParticipationCard";

const { Content } = Layout;
const { Title, Text } = Typography;
const { TextArea } = Input;

type EventChoice = "can" | "cannot";
type ParticipationStatus = "active" | "passive" | "legacy" | "leave";


export default function ShiftAvailabilityPage() {
  const { currentUser } = useAuth();
  const { shiftState } = useShiftContext();
  const { eventState } = useEvents();
  const {
    periodState,
    loadUserResponse,
    submitResponse,
  } = useShiftPlanning();

  const [eventChoices, setEventChoices] = useState<Partial<Record<string, EventChoice>>>({});
  const [eventCanShiftIds, setEventCanShiftIds] = useState<Record<string, string[]>>({});
  const [participationStatus, setParticipationStatus] = useState<ParticipationStatus | undefined>(undefined);
  const [wantsAnchor, setWantsAnchor] = useState<boolean | undefined>(undefined);
  const [anchorOnly, setAnchorOnly] = useState(false);
  const [anchorSeminarDays, setAnchorSeminarDays] = useState<string[]>([]);
  const [comments, setComments] = useState("");
  const [passiveReason, setPassiveReason] = useState("");
  const [privateEmail, setPrivateEmail] = useState("");
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [submittedAt, setSubmittedAt] = useState<Date | null>(null);
  const [loadingResponse, setLoadingResponse] = useState(false);
  const [loadingPeriodSelection, setLoadingPeriodSelection] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedPeriodId, setSelectedPeriodId] = useState<string | undefined>(undefined);
  const [answeredByPeriodId, setAnsweredByPeriodId] = useState<Record<string, boolean>>({});
  const userIsNewbie = currentUser?.roles?.includes(Role.NEWBIE) ?? false;

  const availablePeriods = useMemo(() => {
    const now = Date.now();

    return [...periodState.periods]
      .filter((period) => period.status === "open")
      .filter((period) => period.submissionOpensAt?.getTime() <= now)
      .filter((period) => period.submissionClosesAt?.getTime() >= now)
      .filter((period) => {
        const surveyType = resolveSurveyType(period);
        if (surveyType === "newbieShiftPlanning" && !userIsNewbie) {
          return false;
        }
        return true;
      })
      .sort(
        (a, b) =>
          (a.submissionClosesAt?.getTime() ?? Number.MAX_SAFE_INTEGER) -
          (b.submissionClosesAt?.getTime() ?? Number.MAX_SAFE_INTEGER)
      );
  }, [periodState.periods, userIsNewbie]);

  const selectedPeriod = useMemo(() => {
    if (!selectedPeriodId) {
      return null;
    }
    return availablePeriods.find((period) => period.id === selectedPeriodId) ?? null;
  }, [availablePeriods, selectedPeriodId]);

  useEffect(() => {
    if (availablePeriods.length === 0) {
      setSelectedPeriodId(undefined);
      setAnsweredByPeriodId({});
      return;
    }

    if (!currentUser?.uid) {
      setSelectedPeriodId((previousId) => {
        if (previousId && availablePeriods.some((period) => period.id === previousId)) {
          return previousId;
        }
        return availablePeriods[0].id;
      });
      return;
    }

    let cancelled = false;
    setLoadingPeriodSelection(true);

    Promise.all(
      availablePeriods.map(async (period) => {
        const response = await loadUserResponse(period.id, currentUser.uid);
        return { periodId: period.id, answered: Boolean(response) };
      })
    )
      .then((statuses) => {
        if (cancelled) {
          return;
        }

        const nextAnsweredByPeriodId: Record<string, boolean> = {};
        for (const status of statuses) {
          nextAnsweredByPeriodId[status.periodId] = status.answered;
        }
        setAnsweredByPeriodId(nextAnsweredByPeriodId);

        const unansweredPeriods = availablePeriods.filter(
          (period) => !nextAnsweredByPeriodId[period.id]
        );
        const preferredDefault = (unansweredPeriods[0] ?? availablePeriods[0])?.id;

        setSelectedPeriodId((previousId) => {
          if (previousId && availablePeriods.some((period) => period.id === previousId)) {
            return previousId;
          }
          return preferredDefault;
        });
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingPeriodSelection(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [availablePeriods, currentUser?.uid, loadUserResponse]);

  const periodShifts = useMemo(() => {
    if (!selectedPeriod) {
      return [];
    }

    const eventIdSet = new Set(selectedPeriod.eventIds);
    return shiftState.shifts
      .filter((shift) => eventIdSet.has(shift.eventId) && !shift.linkedShiftId)
      .sort((a, b) => a.start.getTime() - b.start.getTime());
  }, [selectedPeriod, shiftState.shifts]);

  const eventsById = useMemo(() => {
    const map = new Map<string, { id: string; title: string; start: Date }>();
    for (const event of eventState.events) {
      map.set(event.id, { id: event.id, title: event.title, start: event.start });
    }
    return map;
  }, [eventState.events]);

  const groupedShifts = useMemo(() => {
    const groups = new Map<string, Shift[]>();
    for (const shift of periodShifts) {
      const current = groups.get(shift.eventId) ?? [];
      current.push(shift);
      groups.set(shift.eventId, current);
    }

    return Array.from(groups.entries())
      .map(([eventId, shifts]) => ({
        eventId,
        event: eventsById.get(eventId),
        shifts: shifts.sort((a, b) => a.start.getTime() - b.start.getTime()),
      }))
      .sort((a, b) => (a.event?.start?.getTime() ?? 0) - (b.event?.start?.getTime() ?? 0));
  }, [eventsById, periodShifts]);

  const mandatoryEventIds = useMemo(() => {
    return new Set(selectedPeriod?.mandatoryEventIds ?? []);
  }, [selectedPeriod]);

  const selectedPeriodSurveyType = selectedPeriod
    ? resolveSurveyType(selectedPeriod)
    : "regularSemesterSurvey";
  const includesShiftStatusQuestions = selectedPeriodSurveyType === "regularSemesterSurvey";
  const isAnchor = currentUser?.roles?.includes(Role.ANCHOR) ?? false;
  const isCurrentlyPassive = currentUser?.roles?.includes(Role.PASSIVE) ?? false;
  const isCurrentlyLegacy = currentUser?.roles?.includes(Role.LEGACY) ?? false;
  const isClosed =
    selectedPeriod?.submissionClosesAt !== undefined &&
    selectedPeriod.submissionClosesAt.getTime() < Date.now();
  const isActiveParticipant = includesShiftStatusQuestions ? participationStatus === "active" : true;

  const shiftSignature = useMemo(() => {
    return periodShifts.map((shift) => shift.id).join("|");
  }, [periodShifts]);

  const allEventsAnswered = useMemo(() => {
    if (!isActiveParticipant) {
      return true;
    }
    return groupedShifts.every((group) => {
      return eventChoices[group.eventId] === "can" || eventChoices[group.eventId] === "cannot";
    });
  }, [eventChoices, groupedShifts, isActiveParticipant]);

  useEffect(() => {
    if (!selectedPeriod?.id || !currentUser?.uid) {
      return;
    }

    let cancelled = false;

    setEventChoices({});
    setEventCanShiftIds({});
    setParticipationStatus(undefined);
    setWantsAnchor(undefined);
    setAnchorOnly(false);
    setAnchorSeminarDays([]);
    setComments("");
    setPassiveReason("");
    setPrivateEmail("");
    setHasSubmitted(false);
    setSubmittedAt(null);

    setLoadingResponse(true);
    loadUserResponse(selectedPeriod.id, currentUser.uid)
      .then((response) => {
        if (cancelled || !response) {
          return;
        }

        const loadedParticipationStatus =
          (response.participationStatus as ParticipationStatus | undefined) ?? "active";
        const loadedWantsAnchor =
          typeof response.wantsAnchor === "boolean"
            ? response.wantsAnchor
            : Boolean(response.anchorOnly);

        const loadedChoices: Partial<Record<string, EventChoice>> = {};
        const loadedCanShiftIds: Record<string, string[]> = {};

        if (!includesShiftStatusQuestions || loadedParticipationStatus === "active") {
          for (const group of groupedShifts) {
            const hasAnyAnswer = group.shifts.some((shift) => {
              return typeof response.availability?.[shift.id] === "boolean";
            });

            if (!hasAnyAnswer) {
              continue;
            }

            const allCanWork = group.shifts.every((shift) => {
              return response.availability?.[shift.id] === true;
            });

            if (allCanWork) {
              loadedChoices[group.eventId] = "can";
              continue;
            }

            loadedChoices[group.eventId] = "cannot";
            loadedCanShiftIds[group.eventId] = group.shifts
              .filter((shift) => response.availability?.[shift.id] === true)
              .map((shift) => shift.id);
          }
        }

        setEventChoices(loadedChoices);
        setEventCanShiftIds(loadedCanShiftIds);
        setParticipationStatus(includesShiftStatusQuestions ? loadedParticipationStatus : undefined);
        setWantsAnchor(includesShiftStatusQuestions ? loadedWantsAnchor : undefined);
        setAnchorOnly(includesShiftStatusQuestions ? Boolean(response.anchorOnly) : false);
        setAnchorSeminarDays(Array.isArray(response.anchorSeminarDays) ? response.anchorSeminarDays : []);
        setComments(response.comments ?? "");
        setPassiveReason(response.passiveReason ?? "");
        setPrivateEmail(response.privateEmail ?? "");
        setHasSubmitted(true);
        setSubmittedAt(response.submittedAt ?? response.updatedAt ?? new Date());
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingResponse(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [
    currentUser?.uid,
    groupedShifts,
    includesShiftStatusQuestions,
    loadUserResponse,
    selectedPeriod?.id,
    shiftSignature,
  ]);

  const handleSetEventChoice = (eventId: string, value: EventChoice) => {
    setEventChoices((prev) => ({ ...prev, [eventId]: value }));
    if (value === "can") {
      setEventCanShiftIds((prev) => ({ ...prev, [eventId]: [] }));
    }
  };

  const handleSetCanShiftIdsForEvent = (eventId: string, shiftIds: string[]) => {
    setEventCanShiftIds((prev) => ({ ...prev, [eventId]: shiftIds }));
  };

  const handleSetParticipationStatus = (value: ParticipationStatus) => {
    setParticipationStatus(value);

    if (value !== "active") {
      setWantsAnchor(false);
      setAnchorOnly(false);
      setAnchorSeminarDays([]);
      setEventChoices({});
      setEventCanShiftIds({});
    }
  };

  const handleSubmit = async () => {
    if (!selectedPeriod || !currentUser) {
      return;
    }

    if (includesShiftStatusQuestions && !participationStatus) {
      message.error("Please choose active, passive, legacy, or leave before submitting.");
      return;
    }

    if (includesShiftStatusQuestions && participationStatus === "active" && wantsAnchor === undefined) {
      message.error("Please choose whether you want to be anchor next semester.");
      return;
    }

    if (!allEventsAnswered) {
      message.error("Please choose can/cannot work for every event before submitting.");
      return;
    }

    const normalizedAvailability: Record<string, boolean> = {};

    if (!includesShiftStatusQuestions || participationStatus === "active") {
      for (const group of groupedShifts) {
        const eventChoice = eventChoices[group.eventId];
        if (!eventChoice) {
          continue;
        }

        if (eventChoice === "can") {
          for (const shift of group.shifts) {
            normalizedAvailability[shift.id] = true;
          }
          continue;
        }

        const selectedShiftIds = new Set(eventCanShiftIds[group.eventId] ?? []);
        for (const shift of group.shifts) {
          normalizedAvailability[shift.id] = selectedShiftIds.has(shift.id);
        }
      }
    }

    const anchorEnabled =
      includesShiftStatusQuestions && participationStatus === "active" && wantsAnchor === true;

    setSaving(true);
    try {
      const isNewAnchor = anchorEnabled && !isAnchor;
      await submitResponse({
        periodId: selectedPeriod.id,
        userId: currentUser.uid,
        participationStatus: includesShiftStatusQuestions ? (participationStatus as ParticipationStatus) : "active",
        wantsAnchor: anchorEnabled,
        availability: normalizedAvailability,
        anchorOnly: anchorEnabled && !isNewAnchor ? anchorOnly : false,
        anchorSeminarDays: isNewAnchor ? anchorSeminarDays : [],
        comments,
        passiveReason,
        privateEmail,
      });
      setHasSubmitted(true);
      setSubmittedAt(new Date());
      setAnsweredByPeriodId((previous) => ({
        ...previous,
        [selectedPeriod.id]: true,
      }));
    } catch (err) {
      message.error(err instanceof Error ? err.message : "Failed to submit availability. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (
    periodState.loading ||
    shiftState.loading ||
    eventState.loading ||
    loadingResponse ||
    loadingPeriodSelection
  ) {
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
            <Empty description="There is no open shift planning period right now." />
          </Card>
        </Content>
      </Layout>
    );
  }

  const isSubmitDisabled =
    isClosed ||
    !currentUser ||
    (includesShiftStatusQuestions
      ? !participationStatus ||
        (participationStatus === "active" && (!allEventsAnswered || wantsAnchor === undefined))
      : !allEventsAnswered);

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
              type={isClosed ? "warning" : "info"}
              showIcon
              message={
                includesShiftStatusQuestions
                  ? isClosed
                    ? "The submission window has closed. You can view your latest response below."
                    : hasSubmitted
                      ? `You have already submitted this form but are able to make changes until the deadline at ${selectedPeriod.submissionClosesAt.toLocaleString()}.`
                      : `Submission deadline: ${selectedPeriod.submissionClosesAt.toLocaleString()}`
                  : isClosed
                    ? "The submission window has closed. You can view your latest response below."
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
                isClosed={isClosed}
                onChange={handleSetParticipationStatus}
              />
            )}

            {includesShiftStatusQuestions && isActiveParticipant && (
              <AnchorPreferenceCard
                wantsAnchor={wantsAnchor}
                isAnchor={isAnchor}
                anchorOnly={anchorOnly}
                isClosed={isClosed}
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
                  disabled={isClosed}
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
                    disabled={isClosed}
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
                isClosed={isClosed}
                onEventChoiceChange={handleSetEventChoice}
                onCanShiftIdsChange={handleSetCanShiftIdsForEvent}
              />
            )}

            <Card size="small" title="Any other comments?">
              <TextArea
                rows={4}
                value={comments}
                onChange={(event) => setComments(event.target.value)}
                disabled={isClosed}
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
