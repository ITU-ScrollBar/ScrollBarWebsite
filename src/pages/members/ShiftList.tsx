import { Row, Col, Typography, Divider, Splitter, Button, Popconfirm, message } from "antd";
import {
  dateToHourString,
  getEngagementsForShift,
  getTenderForEngagement,
  getTenderDisplayName,
  getTenderInitial,
  handleImageError,
} from "./helpers";
import {
  Shift,
  Engagement,
  Tender,
  ShiftFiltering,
  engagementType,
} from "../../types/types-file";
import { useAuth } from "../../contexts/AuthContext";
import { useEffect, useState } from "react";
import useEvents from "../../hooks/useEvents";
import { useEngagementContext } from "../../contexts/EngagementContext";

const { Title, Paragraph } = Typography;

// Color constants
const COLORS = {
  ANCHOR_BACKGROUND: "#FFD600", // Yellow for anchor avatars
  REGULAR_BACKGROUND: "#1890ff", // Blue for regular avatars
  ANCHOR_TEXT: "#222", // Dark text for anchor avatars
  REGULAR_TEXT: "white", // White text for regular avatars
  SHIFT_BACKGROUND: "#F5F5F5", // White background for shift cards
  BOX_SHADOW: "inset 0 1px 3px rgba(7, 7, 7, 0.3)", // Subtle shadow for shift cards
  TIME_TEXT: "#555", // Gray text for time display
} as const;

interface ShiftListProps {
  shifts: Shift[];
  engagements: Engagement[];
  tenders: Tender[];
  eventId?: string;
  shiftFiltering?: ShiftFiltering;
}

export function ShiftList({
  shifts,
  engagements,
  tenders,
  eventId,
  shiftFiltering = ShiftFiltering.ALL_SHIFTS,
}: ShiftListProps) {
  const { currentUser } = useAuth();
  const { eventState } = useEvents();
  const [filteredShifts, setFilteredShifts] = useState<Shift[]>([]);
  const { setUpForGrabs, takeShift } = useEngagementContext();

  useEffect(() => {
    let result = eventId ? shifts.filter((s) => s.eventId === eventId) : shifts;

    if (shiftFiltering === ShiftFiltering.MY_SHIFTS && currentUser) {
      const userId = currentUser.uid;
      if (userId) {
        const userShiftIds = engagements
          .filter((e) => e.userId === userId)
          .map((e) => e.shiftId);
        result = result.filter((s) => userShiftIds.includes(s.id));
      }
    } else if (shiftFiltering === ShiftFiltering.UP_FOR_GRABS) {
      const engagementsWithUpForGrabs = engagements.filter((e) => e.upForGrabs);
      const shiftIdsWithUpForGrabs = engagementsWithUpForGrabs.map(
        (e) => e.shiftId
      );
      result = result.filter((s) => shiftIdsWithUpForGrabs.includes(s.id));
    }

    // Only shifts with engagements
    result = result.filter((shift) =>
      engagements.some((e) => e.shiftId === shift.id)
    );
    setFilteredShifts(result);
  }, [shifts, engagements, tenders, eventId, shiftFiltering, currentUser]);

  const grabShift = (engagement: Engagement) => {
    if (engagement.type === engagementType.ANCHOR && !currentUser?.roles?.includes('anchor')) {
      message.error("You must be an anchor to grab an anchor shift");
    } else if (engagements.some(e => e.shiftId === engagement.shiftId && e.userId === currentUser?.uid)) {
      message.error("You are already on this shift");
    } else {
      takeShift(engagement.id, currentUser!.uid);
    }
  }

  const renderTender = (engagement: Engagement, isAnchor = false) => {
    const tender = getTenderForEngagement(engagement, tenders);
    if (!tender) return null;

    return (
      <Col key={engagement.id} style={{ minWidth: 56 }}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 2,
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: "50%",
              background: isAnchor
                ? COLORS.ANCHOR_BACKGROUND
                : COLORS.REGULAR_BACKGROUND,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
            }}
          >
            {tender.photoUrl ? (
              <img
                src={tender.photoUrl}
                alt={getTenderDisplayName(tender)}
                style={{
                  width: 36,
                  height: 36,
                  objectFit: "cover",
                  borderRadius: "50%",
                }}
                onError={handleImageError}
              />
            ) : (
              <span
                style={{
                  color: isAnchor ? COLORS.ANCHOR_TEXT : COLORS.REGULAR_TEXT,
                  fontWeight: "bold",
                }}
              >
                {getTenderInitial(tender)}
              </span>
            )}
          </div>
          <span
            style={{
              fontSize: "0.85em",
              textAlign: "center",
              maxWidth: "56px",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
            >
            {getTenderDisplayName(tender)}
          </span>
          {(tender.uid !== currentUser?.uid && engagement.upForGrabs) && (
            <Popconfirm 
              title="Are you sure?"
              description="This action cannot be undone."
              okText="Yes"
              okButtonProps={{ color: "yellow" }}
              onConfirm={() => grabShift(engagement)}>
              <Button
                size="small"
                style={{
                  position: "absolute",
                  backgroundColor: "#FFE600",
                  border: "none",
                  marginTop: 6,
                  padding: "4px 8px",
                  alignSelf: "center",
                  color: "#000",
                  bottom: -24,
                }}
                >
                Grab shift
              </Button>
            </Popconfirm>
          )}
        </div>
      </Col>
    );
  };

  if (filteredShifts.length === 0) return null;

  // Group shifts by eventId
  const shiftsByEvent: { [eventId: string]: Shift[] } = {};
  filteredShifts.forEach((shift) => {
    if (!shiftsByEvent[shift.eventId]) {
      shiftsByEvent[shift.eventId] = [];
    }
    shiftsByEvent[shift.eventId].push(shift);
  });

  return (
    <div>
      {Object.entries(shiftsByEvent).map(([eventId, shifts]) => {
        const event = eventState.events.find((e) => e.id === eventId);
        if (!event) return null;
        return (
          <div key={eventId} style={{ marginBottom: 32 }}>
            {/* Event Title */}
            <Title level={2} style={{ marginBottom: 12 }}>
              {`${event.displayName ?? event.title ?? "Unknown Event"} (${event.start.getUTCDate()}/${event.start.getUTCMonth() + 1})`}
            </Title>

            {/* Shifts for this event */}
            {shifts.map((shift) => {
              const shiftEngagements = getEngagementsForShift(
                shift.id!,
                engagements
              );
              const anchors = shiftEngagements.filter(
                (e) => e.type === "anchor"
              );
              const regulars = shiftEngagements.filter(
                (e) => e.type !== "anchor"
              );
              const myShift = shiftEngagements.filter(
                (e) => e.userId === currentUser?.uid
              ).find(e => e); // Cannot be part of the shift twice so this is similar to `.firstOrDefault()`

              return (
                <div
                  key={shift.id}
                  style={{
                    display: "flex",
                    gap: 4,
                    padding: 8,
                    borderRadius: 8,
                    background: COLORS.SHIFT_BACKGROUND,
                    marginBottom: 12,
                    boxShadow: COLORS.BOX_SHADOW,
                  }}
                >
                  {/* Left: Location & Time */}
                  <div style={{ minWidth: 80, flex: "0 0 80px" }}>
                    <Title
                      level={5}
                      style={{ marginBottom: 4, fontSize: "1.1em" }}
                    >
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
                      <Popconfirm title="Are you sure?" okText="Yes" okButtonProps={{ color: "yellow" }} onConfirm={() => {
                          setUpForGrabs(myShift.id, !myShift.upForGrabs);
                        }}>
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

                  {/* Right: Title & Avatars */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Title
                      level={5}
                      style={{ marginBottom: 8, fontSize: "1.1em" }}
                    >
                      {shift.title}
                    </Title>
                    <Row gutter={[8, 8]} style={{ flexWrap: "wrap" }}>
                      {anchors.map((engagement) =>
                        renderTender(engagement, true)
                      )}
                      {regulars.map((engagement) =>
                        renderTender(engagement, false)
                      )}
                    </Row>
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
