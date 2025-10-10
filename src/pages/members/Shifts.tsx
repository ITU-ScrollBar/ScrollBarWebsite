import { Path, useNavigate } from "react-router-dom";
import { ProfileOutlined, HomeOutlined } from "@ant-design/icons";
import useShifts from "../../hooks/useShifts";
import { Layout, Menu, Row, Col } from "antd";
import { Content, Header } from "antd/es/layout/layout";
import Sider from "antd/es/layout/Sider";
import Title from "antd/es/typography/Title";
import useEvents from "../../hooks/useEvents";
import Paragraph from "antd/es/typography/Paragraph";
import useEngagements from "../../hooks/useEngagements";
import {
  dateToHourString,
  getEngagementsForShift,
  getTenderForEngagement,
  getTenderDisplayName,
  getTenderInitial,
  handleImageError,
} from "./helpers";
import useTenders from "../../hooks/useTenders";

export default function Shifts() {
  const navigation = useNavigate();
  const { shiftState } = useShifts();
  const navigateToLink = (location: Path) => navigation(location);
  const { eventState } = useEvents();
  const { engagementState } = useEngagements();
  const { tenderState } = useTenders();

  if (shiftState.loading || eventState.loading || engagementState.loading) {
    return <div>Loading...</div>;
  }

  // helper to get shifts for an event
  const shiftsForEvent = (eventId: string) =>
    shiftState.shifts.filter((s) => s.eventId === eventId);

  return (
    <Layout
      style={{
        minHeight: "100vh",
        minWidth: "100vw",
        flexDirection: "column",
        height: "auto",
      }}
    >
      <Layout style={{ flexDirection: "row" }}>
        <Content style={{ padding: 24 }}>
          <Title id="about" level={1} style={{ scrollMarginTop: "135px" }}>
            Shifts Page
          </Title>

          {/* PAPER: visually separate shifts from later content */}
          <div
            style={{
              background: "#f3ebdb", // paper-like warm background (swap to your theme color)
              borderRadius: 12,
              padding: 24,
              boxShadow: "0 6px 18px rgba(18,24,31,0.06)",
              marginBottom: 28,
            }}
          >
            {eventState.events.map((event) => {
              const shifts = shiftsForEvent(event.id);
              return (
                <section key={event.id} style={{ marginBottom: 32 }}>
                  <Title level={2} style={{ marginBottom: 12 }}>
                    {event.displayName}
                  </Title>

                  {shifts.length === 0 ? (
                    <Paragraph type="secondary">
                      No shifts for this event
                    </Paragraph>
                  ) : (
                    shifts.map((shift) => (
                      <div
                        key={shift.id}
                        style={{
                          display: "flex",
                          gap: 12, // reduced gap
                          alignItems: "flex-start",
                          padding: 8, // reduced padding so content sits left
                          borderRadius: 8,
                          background: "#ffffff",
                          marginBottom: 12,
                        }}
                      >
                        {/* Left column: meta (location + time) */}
                        <div
                          style={{
                            minWidth: 140,
                            paddingRight: 8,
                            textAlign: "left",
                          }}
                        >
                          <Title level={5} style={{ marginBottom: 6 }}>
                            {shift.location}
                          </Title>
                          <Paragraph style={{ margin: 0, color: "#555" }}>
                            {dateToHourString(shift.start)} —{" "}
                            {dateToHourString(shift.end)}
                          </Paragraph>
                        </div>

                        {/* SHIFT TITLE AND TENDERS */}
                        <div style={{ flex: 1, marginLeft: 0 }}>
                          <Title level={5} style={{ marginBottom: 6 }}>
                            {shift.title}
                          </Title>

                          {/* Render tenders for this shift */}
                          <Row
                            gutter={[8, 8]}
                            justify="start"
                            style={{ marginLeft: 0 }}
                          >
                            {getEngagementsForShift(
                              shift.id!,
                              engagementState.engagements
                            ).map((engagement) => {
                              const tender = getTenderForEngagement(
                                engagement,
                                tenderState.tenders
                              );
                              if (!tender) return null;

                              return (
                                <Col key={engagement.id}>
                                  <div
                                    style={{
                                      display: "flex",
                                      flexDirection: "column",
                                      alignItems: "center",
                                      gap: 4,
                                    }}
                                  >
                                    {/* Tender Avatar */}
                                    <div
                                      style={{
                                        width: 36,
                                        height: 36,
                                        borderRadius: 18,
                                        background: "#1890ff",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        color: "white",
                                        fontWeight: "bold",
                                        fontSize: "12px",
                                        overflow: "hidden",
                                      }}
                                    >
                                      {tender.photoUrl ? (
                                        <img
                                          src={tender.photoUrl}
                                          alt={getTenderDisplayName(tender)}
                                          style={{
                                            width: "100%",
                                            height: "100%",
                                            objectFit: "cover",
                                            borderRadius: 18,
                                          }}
                                          onError={handleImageError}
                                        />
                                      ) : null}
                                      <div
                                        style={{
                                          display: tender.photoUrl
                                            ? "none"
                                            : "flex",
                                          alignItems: "center",
                                          justifyContent: "center",
                                          width: "100%",
                                          height: "100%",
                                        }}
                                      >
                                        {getTenderInitial(tender)}
                                      </div>
                                    </div>
                                    {/* Tender Name */}
                                    <span
                                      style={{
                                        fontSize: "10px",
                                        textAlign: "center",
                                        maxWidth: "50px",
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
                            })}

                            {/* Show empty slots or "up for grabs" */}
                            {getEngagementsForShift(
                              shift.id!,
                              engagementState.engagements
                            ).length === 0 && (
                              <Col>
                                <div
                                  style={{
                                    display: "flex",
                                    flexDirection: "column",
                                    alignItems: "center",
                                    gap: 4,
                                  }}
                                >
                                  <div
                                    style={{
                                      width: 36,
                                      height: 36,
                                      borderRadius: 18,
                                      background: "#f0f0f0",
                                      border: "2px dashed #d9d9d9",
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      color: "#999",
                                      fontSize: "12px",
                                    }}
                                  >
                                    ?
                                  </div>
                                  <span
                                    style={{
                                      fontSize: "10px",
                                      textAlign: "center",
                                      color: "#999",
                                    }}
                                  >
                                    Open
                                  </span>
                                </div>
                              </Col>
                            )}
                          </Row>
                        </div>
                      </div>
                    ))
                  )}
                </section>
              );
            })}
          </div>

          {/* Rest of the page content will appear below this paper container */}
        </Content>
      </Layout>
    </Layout>
  );
}
