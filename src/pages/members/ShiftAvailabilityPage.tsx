import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Checkbox,
  Col,
  Empty,
  Input,
  Layout,
  message,
  Popconfirm,
  Radio,
  Row,
  Select,
  Space,
  Tag,
  Typography,
} from "antd";
import dayjs from "dayjs";
import { useAuth } from "../../contexts/AuthContext";
import { useShiftContext } from "../../contexts/ShiftContext";
import useEvents from "../../hooks/useEvents";
import useShiftPlanning from "../../hooks/useShiftPlanning";
import { Role, Shift, ShiftPlanningSurveyType } from "../../types/types-file";

const { Content } = Layout;
const { Title, Text } = Typography;
const { TextArea } = Input;

type EventChoice = "can" | "cannot";
type ParticipationStatus = "active" | "passive" | "legacy" | "leave";

const resolvePeriodSurveyType = (period: {
  surveyType?: ShiftPlanningSurveyType;
  includeShiftStatusQuestions?: boolean;
}): ShiftPlanningSurveyType => {
  if (period.surveyType) {
    return period.surveyType;
  }

  if (period.includeShiftStatusQuestions === false) {
    return "excludeSemesterStatus";
  }

  return "regularSemesterSurvey";
};

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
  const [comments, setComments] = useState("");
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
        const surveyType = resolvePeriodSurveyType(period);
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
        return {
          periodId: period.id,
          answered: Boolean(response),
        };
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
      .filter((shift) => eventIdSet.has(shift.eventId))
      .sort((a, b) => a.start.getTime() - b.start.getTime());
  }, [selectedPeriod, shiftState.shifts]);

  const eventsById = useMemo(() => {
    const map = new Map<string, { id: string; title: string; start: Date }>();
    for (const event of eventState.events) {
      map.set(event.id, {
        id: event.id,
        title: event.title,
        start: event.start,
      });
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
      .sort((a, b) => {
        const aDate = a.event?.start?.getTime() ?? 0;
        const bDate = b.event?.start?.getTime() ?? 0;
        return aDate - bDate;
      });
  }, [eventsById, periodShifts]);

  const mandatoryEventIds = useMemo(() => {
    return new Set(selectedPeriod?.mandatoryEventIds ?? []);
  }, [selectedPeriod]);

  const selectedPeriodSurveyType = selectedPeriod
    ? resolvePeriodSurveyType(selectedPeriod)
    : "regularSemesterSurvey";
  const includesShiftStatusQuestions = selectedPeriodSurveyType === "regularSemesterSurvey";
  const isAnchor = currentUser?.roles?.includes(Role.ANCHOR) ?? false;
  const isClosed =
    selectedPeriod?.submissionClosesAt !== undefined &&
    selectedPeriod.submissionClosesAt.getTime() < Date.now();
  const isActiveParticipant = includesShiftStatusQuestions ? participationStatus === "active" : true;

  const shiftSignature = useMemo(() => {
    return periodShifts.map((shift) => shift.id).join("|");
  }, [periodShifts]);

  const allEventsAnswered = useMemo(() => {
    if (!includesShiftStatusQuestions) {
      return groupedShifts.every((group) => {
        return eventChoices[group.eventId] === "can" || eventChoices[group.eventId] === "cannot";
      });
    }

    if (!isActiveParticipant) {
      return true;
    }

    return groupedShifts.every((group) => {
      return eventChoices[group.eventId] === "can" || eventChoices[group.eventId] === "cannot";
    });
  }, [eventChoices, groupedShifts, includesShiftStatusQuestions, isActiveParticipant]);

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
    setComments("");
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
        setComments(response.comments ?? "");
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
    setEventChoices((prev) => ({
      ...prev,
      [eventId]: value,
    }));

    if (value === "can") {
      setEventCanShiftIds((prev) => ({
        ...prev,
        [eventId]: [],
      }));
    }
  };

  const handleSetCanShiftIdsForEvent = (eventId: string, shiftIds: string[]) => {
    setEventCanShiftIds((prev) => ({
      ...prev,
      [eventId]: shiftIds,
    }));
  };

  const handleSetParticipationStatus = (value: ParticipationStatus) => {
    setParticipationStatus(value);

    if (value !== "active") {
      setWantsAnchor(false);
      setAnchorOnly(false);
      setEventChoices({});
      setEventCanShiftIds({});
      return;
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
      await submitResponse({
        periodId: selectedPeriod.id,
        userId: currentUser.uid,
        participationStatus: includesShiftStatusQuestions ? (participationStatus as ParticipationStatus) : "active",
        wantsAnchor: anchorEnabled,
        availability: normalizedAvailability,
        anchorOnly: anchorEnabled ? anchorOnly : false,
        comments,
      });
      setHasSubmitted(true);
      setSubmittedAt(new Date());
      setAnsweredByPeriodId((previous) => ({
        ...previous,
        [selectedPeriod.id]: true,
      }));
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
              <Card size="small" title="Semester participation">
                <Space direction="vertical" style={{ width: "100%" }}>
                  <Text>How do you want to participate this semester?</Text>
                  <Radio.Group
                    value={participationStatus}
                    onChange={(event) => handleSetParticipationStatus(event.target.value as ParticipationStatus)}
                    disabled={isClosed}
                  >
                    <Radio value="active">Active</Radio>
                    <Radio value="passive">Passive</Radio>
                    <Radio value="legacy">Legacy</Radio>
                    <Radio value="leave">Leave</Radio>
                  </Radio.Group>
                </Space>
              </Card>
            )}

            {includesShiftStatusQuestions && isActiveParticipant && (
              <Card size="small" title="Anchor preference">
                <Space direction="vertical" style={{ width: "100%" }}>
                  <Text>Do you want to be an anchor for the coming semester?</Text>
                  <Radio.Group
                    value={wantsAnchor === undefined ? undefined : wantsAnchor ? "yes" : "no"}
                    onChange={(event) => {
                      const value = event.target.value === "yes";
                      setWantsAnchor(value);
                      if (!value) {
                        setAnchorOnly(false);
                      }
                    }}
                    disabled={isClosed}
                  >
                    <Radio value="yes">Yes</Radio>
                    <Radio value="no">No</Radio>
                  </Radio.Group>

                  {wantsAnchor === true && (
                    <Radio.Group
                      value={anchorOnly ? "anchor-only" : "mixed"}
                      onChange={(event) => setAnchorOnly(event.target.value === "anchor-only")}
                      disabled={isClosed}
                    >
                      <Radio value="mixed">Mix of anchor and tender shifts</Radio>
                      <Radio value="anchor-only">Only anchor shifts</Radio>
                    </Radio.Group>
                  )}

                  {!isAnchor && wantsAnchor === true && (
                    <Alert
                      type="info"
                      showIcon
                      message="Your current role is not anchor"
                      description="You can still submit this preference. A shift manager must grant anchor role before anchor assignments can be generated."
                    />
                  )}
                </Space>
              </Card>
            )}

            {isActiveParticipant && (groupedShifts.length === 0 ? (
              <Empty description="No shifts are connected to this planning period." />
            ) : (
              <Row gutter={[16, 16]}>
                {groupedShifts.map((group) => {
                  const choice = eventChoices[group.eventId];
                  const canShiftIds = eventCanShiftIds[group.eventId] ?? [];

                  return (
                    <Col key={group.eventId} xs={24} md={12} xl={8}>
                      <Card
                        size="small"
                        style={{ height: "100%" }}
                        title={
                          <Space>
                            <span>{group.event?.title ?? "Event"}</span>
                            {mandatoryEventIds.has(group.eventId) && <Tag color="gold">Big party</Tag>}
                          </Space>
                        }
                      >
                        <Space direction="vertical" style={{ width: "100%" }}>
                          <Text type="secondary">
                            {group.event?.start ? dayjs(group.event.start).format("DD/MM/YYYY") : "-"} · {group.shifts.length} shift{group.shifts.length === 1 ? "" : "s"}
                          </Text>

                          <Radio.Group
                            value={choice}
                            onChange={(event) => handleSetEventChoice(group.eventId, event.target.value as EventChoice)}
                            disabled={isClosed}
                          >
                            <Radio.Button value="can">Can work</Radio.Button>
                            <Radio.Button value="cannot">Cannot work</Radio.Button>
                          </Radio.Group>

                          {choice === "cannot" && (
                            <div>
                              <Text>
                                Select shifts you can still attend for this event:
                              </Text>
                              <Checkbox.Group
                                style={{ width: "100%", marginTop: 8 }}
                                value={canShiftIds}
                                onChange={(values) =>
                                  handleSetCanShiftIdsForEvent(
                                    group.eventId,
                                    values.map((value) => String(value))
                                  )
                                }
                                disabled={isClosed}
                              >
                                <Space direction="vertical">
                                  {group.shifts.map((shift) => (
                                    <Checkbox key={shift.id} value={shift.id}>
                                      {shift.title} ({shift.location}) · {dayjs(shift.start).format("HH:mm")} - {dayjs(shift.end).format("HH:mm")}
                                    </Checkbox>
                                  ))}
                                </Space>
                              </Checkbox.Group>
                            </div>
                          )}
                        </Space>
                      </Card>
                    </Col>
                  );
                })}
              </Row>
            ))}

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
              disabled={
                isClosed ||
                !currentUser ||
                (includesShiftStatusQuestions
                  ? !participationStatus ||
                    (participationStatus === "active" && (!allEventsAnswered || wantsAnchor === undefined))
                  : !allEventsAnswered)
              }
            >
              <Button
                type="primary"
                size="large"
                loading={saving}
                disabled={
                  isClosed ||
                  !currentUser ||
                  (includesShiftStatusQuestions
                    ? !participationStatus ||
                      (participationStatus === "active" && (!allEventsAnswered || wantsAnchor === undefined))
                    : !allEventsAnswered)
                }
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
