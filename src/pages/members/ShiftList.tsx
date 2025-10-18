import { Row, Col, Typography } from "antd";
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
} from "../../types/types-file";
import { useAuth } from "../../contexts/AuthContext";
import { useEffect, useState } from "react";
import useEvents from "../../hooks/useEvents";

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

  const renderTender = (engagement: any, isAnchor = false) => {
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
        return (
          <div key={eventId} style={{ marginBottom: 32 }}>
            {/* Event Title */}
            <Title level={2} style={{ marginBottom: 12 }}>
              {event?.displayName || event?.title || "Unknown Event"}
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
                      {dateToHourString(shift.start)} —{" "}
                      {dateToHourString(shift.end)}
                    </Paragraph>
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
