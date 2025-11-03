import {
  Row,
  Col,
  Typography,
  Button,
  Popconfirm,
  message,
  Tooltip,
  Badge,
} from "antd";
import {
  dateToHourString,
  getEngagementsForShift,
  getTenderForEngagement,
  getTenderDisplayName,
} from "./helpers";
import {
  Shift,
  Engagement,
  Tender,
  ShiftFiltering,
  engagementType,
} from "../../types/types-file";
import { useAuth } from "../../contexts/AuthContext";
import { useEffect, useState, useMemo } from "react";
import useEvents from "../../hooks/useEvents";
import { useEngagementContext } from "../../contexts/EngagementContext";
import { UserAvatar } from "../../components/UserAvatar";
import { UpForGrabsBadge } from "../../badges/UpForGrabsBadge";
import useInternalEvents from "../../hooks/useInternalEvents";
import useTeams from "../../hooks/useTeams";
import Loading from "../../components/Loading";
import { renderInternalEvent } from "../../pages/admin/InternalEventsPage";

const { Title, Paragraph } = Typography;

// Color constants
const COLORS = {
  ANCHOR_BACKGROUND: "#FFD600", // Yellow for anchor avatars
  REGULAR_BACKGROUND: "#1890ff", // Blue for regular avatars
  ANCHOR_TEXT: "#222", // Dark text for anchor avatars
  REGULAR_TEXT: "white", // White text for regular avatars
  SHIFT_BACKGROUND: "#FFF", // White background for shift cards
  BOX_SHADOW: "inset 0 1px 3px rgba(7, 7, 7, 0.3)", // Subtle shadow for shift cards
  TIME_TEXT: "#555", // Gray text for time display
} as const;

interface ShiftListProps {
  shifts: Shift[];
  engagements: Engagement[];
  tenders: Tender[];
  shiftFiltering?: ShiftFiltering;
}

export function ShiftList({
  shifts,
  engagements,
  tenders,
  shiftFiltering = ShiftFiltering.ALL_SHIFTS,
}: ShiftListProps) {
  const { currentUser } = useAuth();
  const { eventState } = useEvents();
  const [filteredShifts, setFilteredShifts] = useState<Shift[]>([]);
  const { setUpForGrabs, takeShift } = useEngagementContext();
  const internalEventsState = useInternalEvents();
  const internalState = internalEventsState.internalEventState;
  const { teamState } = useTeams();

  useEffect(() => {
    if (internalState?.loading) return;

    let result = shifts;

    if (shiftFiltering === ShiftFiltering.MY_SHIFTS && currentUser?.uid) {
      const userShiftIds = engagements
        .filter((e) => e.userId === currentUser.uid)
        .map((e) => e.shiftId);
      result = result.filter((s) => userShiftIds.includes(s.id));
    } else if (shiftFiltering === ShiftFiltering.UP_FOR_GRABS) {
      const shiftIdsWithUpForGrabs = engagements
        .filter((e) => e.upForGrabs)
        .map((e) => e.shiftId);
      result = result.filter((s) => shiftIdsWithUpForGrabs.includes(s.id));
    }

    result = result.filter((shift) =>
      engagements.some((e) => e.shiftId === shift.id)
    );
    setFilteredShifts(result);
  }, [shifts, engagements, shiftFiltering, currentUser, internalState]);

  const asDate = (
    d:
      | Date
      | { seconds: number; nanoseconds?: number }
      | { toDate?: () => Date }
      | string
      | number
      | undefined
  ): Date => {
    if (!d) return new Date(0);
    if (d instanceof Date) return d;
    if (typeof d === "object") {
      if (
        "toDate" in d &&
        typeof (d as { toDate?: unknown }).toDate === "function"
      ) {
        return (d as { toDate: () => Date }).toDate();
      }
      if (
        "seconds" in d &&
        typeof (d as { seconds?: unknown }).seconds === "number"
      ) {
        const ts = d as { seconds: number; nanoseconds?: number };
        return new Date(
          ts.seconds * 1000 + Math.floor((ts.nanoseconds ?? 0) / 1e6)
        );
      }
    }
    if (typeof d === "number" || typeof d === "string")
      return new Date(d as string | number);
    return new Date(0);
  };

  const shiftsByEvent = useMemo(() => {
    const map: { [eventId: string]: Shift[] } = {};
    filteredShifts.forEach((shift) => {
      if (!map[shift.eventId]) map[shift.eventId] = [];
      map[shift.eventId].push(shift);
    });
    return map;
  }, [filteredShifts]);

  const internalEventsAll = useMemo(
    () => internalEventsState.internalEventState.internalEvents || [],
    [internalEventsState.internalEventState.internalEvents]
  );

  const eventsWithShifts = useMemo(
    () =>
      eventState.events
        .filter((e) => !!shiftsByEvent[e.id])
        .slice()
        .sort((a, b) => asDate(a.start).getTime() - asDate(b.start).getTime()),
    [eventState.events, shiftsByEvent]
  );

  const normalizedInternalEvents = useMemo(() => {
    return internalEventsAll.map((ie) => ({
      ...ie,
      start: asDate(ie.start),
      end: asDate(ie.end),
    }));
  }, [internalEventsAll]);

  const internalEvents = useMemo(() => {
    if (shiftFiltering !== ShiftFiltering.MY_SHIFTS) return [];

    return normalizedInternalEvents
      .filter((ie) => {
        return (
          currentUser?.roles?.includes(ie.scope) ||
          currentUser?.teamIds?.includes(ie.scope)
        );
      })
      .sort((a, b) => a.start.getTime() - b.start.getTime());
  }, [
    currentUser?.roles,
    currentUser?.teamIds,
    normalizedInternalEvents,
    shiftFiltering,
  ]);

  const merged = useMemo(() => {
    type MergedItemLocal =
      | { type: "event"; id: string; start: Date }
      | {
          type: "internal";
          event: (typeof normalizedInternalEvents)[number];
          start: Date;
        };

    const out: MergedItemLocal[] = [];
    let ei = 0;
    let ii = 0;
    while (ei < eventsWithShifts.length || ii < internalEvents.length) {
      const ev = eventsWithShifts[ei];
      const iv = internalEvents[ii];

      if (!ev && iv) {
        out.push({
          type: "internal",
          event: iv,
          start: iv.start,
        });
        ii++;
      } else if (!iv && ev) {
        out.push({ type: "event", id: ev.id, start: asDate(ev.start) });
        ei++;
      } else if (ev && iv) {
        if (asDate(ev.start).getTime() <= iv.start.getTime()) {
          out.push({ type: "event", id: ev.id, start: asDate(ev.start) });
          ei++;
        } else {
          out.push({
            type: "internal",
            event: iv,
            start: iv.start,
          });
          ii++;
        }
      }
    }
    return out;
  }, [eventsWithShifts, internalEvents]);

  if (internalState?.loading) {
    return <Loading resources={["internal events"]} centerOverlay={true} />;
  }

  const grabShift = (engagement: Engagement) => {
    if (
      engagement.type === engagementType.ANCHOR &&
      !currentUser?.roles?.includes("anchor")
    ) {
      message.error("You must be an anchor to grab an anchor shift");
    } else if (
      engagements.some(
        (e) => e.shiftId === engagement.shiftId && e.userId === currentUser?.uid
      )
    ) {
      message.error("You are already on this shift");
    } else {
      takeShift(engagement.id, currentUser!.uid);
    }
  };

  const renderTender = (engagement: Engagement, isAnchor = false) => {
    const tender = getTenderForEngagement(engagement, tenders);
    if (!tender) return null;

    const isUpForGrabs =
      tender.uid !== currentUser?.uid && engagement.upForGrabs;

    return (
      <Col key={engagement.id} style={{ minWidth: 56 }}>
        <Tooltip title={getTenderDisplayName(tender)}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 1,
              position: "relative",
            }}
          >
            <Badge
              count={
                <UpForGrabsBadge
                  isUpForGrabs={isUpForGrabs}
                  onGrab={() => grabShift(engagement)}
                />
              }
            >
              <UserAvatar
                user={tender}
                size={60}
                backgroundColor={
                  isAnchor
                    ? COLORS.ANCHOR_BACKGROUND
                    : COLORS.REGULAR_BACKGROUND
                }
              />
            </Badge>
            <span
              style={{
                fontSize: "0.85em",
                textAlign: "center",
                maxWidth: "80px",
                overflow: "inline-block",
                whiteSpace: "normal",
                wordBreak: "break-word",
                zIndex: 12,
                backgroundColor: "rgba(255, 255, 255, 0.5)",
                backdropFilter: "blur(4px)",
              }}
            >
              {getTenderDisplayName(tender)}
            </span>
          </div>
        </Tooltip>
      </Col>
    );
  };

  const renderEventHeader = (event: (typeof eventState.events)[number]) => (
    <Title level={2} style={{ marginBottom: 12 }}>
      {`${event.displayName ?? event.title ?? "Unknown Event"} (${event.start.getUTCDate()}/${event.start.getUTCMonth() + 1})`}
    </Title>
  );

  const renderShiftCard = (shift: Shift) => {
    const shiftEngagements = getEngagementsForShift(shift.id!, engagements);
    const anchors = shiftEngagements.filter((e) => e.type === "anchor");
    const regulars = shiftEngagements.filter((e) => e.type !== "anchor");
    const myShift = shiftEngagements
      .filter((e) => e.userId === currentUser?.uid)
      .find((e) => e);

    return (
      <div
        key={shift.id}
        style={{
          display: "flex",
          gap: 4,
          padding: 6,
          paddingLeft: 18,
          borderRadius: 8,
          background: COLORS.SHIFT_BACKGROUND,
          marginBottom: 12,
          boxShadow: COLORS.BOX_SHADOW,
        }}
      >
        <div style={{ minWidth: 80, flex: "0 0 80px" }}>
          <Title style={{ marginBottom: 4, fontSize: "1.1em" }}>
            {shift.location}
          </Title>
          <Paragraph
            style={{
              margin: 0,
              color: COLORS.TIME_TEXT,
              fontSize: "1em",
            }}
          >
            {dateToHourString(shift.start).padStart(2, "0")} —{" "}
            {dateToHourString(shift.end).padStart(2, "0")}
          </Paragraph>
          {myShift && (
            <Popconfirm
              title="Are you sure?"
              okText="Yes"
              okButtonProps={{ color: "yellow" }}
              onConfirm={() => {
                setUpForGrabs(myShift.id, !myShift.upForGrabs);
              }}
            >
              <Button
                size="small"
                style={{
                  backgroundColor: "#FFE600",
                  border: "none",
                  marginTop: 6,
                  padding: "4px 8px",
                  color: "#000",
                }}
              >
                {myShift.upForGrabs ? "Keep shift" : "Swap shift"}
              </Button>
            </Popconfirm>
          )}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <Title style={{ marginBottom: 8, fontSize: "1.1em" }}>
            {shift.title}
          </Title>
          <Row gutter={[8, 8]} style={{ flexWrap: "wrap" }}>
            {anchors.map((e) => renderTender(e, true))}
            {regulars.map((e) => renderTender(e, false))}
          </Row>
        </div>
      </div>
    );
  };

  return (
    <div>
      {merged.map((m) => {
        if (m.type === "internal") {
          return (
            <div key={`internal-${m.event.id}`} style={{ marginBottom: 32 }}>
              {renderInternalEvent({
                internalEvent: m.event,
                teams: teamState.teams ?? [],
              })}
            </div>
          );
        }

        const eventId = m.id;
        const event = eventState.events.find((e) => e.id === eventId);
        if (!event) return null;

        const shiftsForEvent = shiftsByEvent[eventId] || [];

        return (
          <div key={eventId} style={{ marginBottom: 32 }}>
            {renderEventHeader(event)}
            {shiftsForEvent.map((shift) => renderShiftCard(shift))}
          </div>
        );
      })}
    </div>
  );
}
