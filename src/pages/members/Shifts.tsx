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
import { dateToHourString } from "./helpers";

export default function Shifts() {
  const navigation = useNavigate();
  const { shiftState } = useShifts();
  const navigateToLink = (location: Path) => navigation(location);
  const { eventState } = useEvents();
  const { engagementState } = useEngagements();

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
      <Header style={{ height: "150px" }}></Header>
      <Layout style={{ flexDirection: "row" }}>
        <Sider breakpoint="lg" collapsedWidth="0">
          <Menu
            theme="dark"
            mode="inline"
            defaultSelectedKeys={[location.pathname]}
            onSelect={(info) => navigateToLink(info.key as unknown as Path)}
          >
            <Menu.Item key="/tenders/shifts" icon={<HomeOutlined />}>
              Tender site
            </Menu.Item>
            <Menu.Item key="/members/profile" icon={<ProfileOutlined />}>
              Profile
            </Menu.Item>
          </Menu>
        </Sider>

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

                        {/* Right column: shift title and any extra data */}
                        <div style={{ flex: 1, marginLeft: 0 }}>
                          <Title level={5} style={{ marginBottom: 6 }}>
                            {shift.title}
                          </Title>

                          {/* avatars/ names aligned left */}
                          <Row
                            gutter={[8, 8]}
                            justify="start"
                            style={{ marginLeft: 0 }}
                          >
                            <Col>
                              <div
                                style={{
                                  width: 36,
                                  height: 36,
                                  borderRadius: 18,
                                  background: "#ffd",
                                }}
                              />
                            </Col>
                            <Col>
                              <div
                                style={{
                                  width: 36,
                                  height: 36,
                                  borderRadius: 18,
                                  background: "#ffd",
                                }}
                              />
                            </Col>
                            <Col>
                              <div
                                style={{
                                  width: 36,
                                  height: 36,
                                  borderRadius: 18,
                                  background: "#ffd",
                                }}
                              />
                            </Col>
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
