import { Path, useNavigate } from "react-router-dom";
import { ProfileOutlined, HomeOutlined } from "@ant-design/icons";
import useShifts from "../../hooks/useShifts";
import { Layout, Menu } from "antd";
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
  console.log("shift", shiftState.shifts);
  console.log("events", eventState.events);
  console.log("engagement", engagementState.engagements);

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
        <Content>
          <Title id="about" level={1} style={{ scrollMarginTop: "135px" }}>
            Shifts Page
          </Title>
          {eventState.events.map((event) => (
            <>
              <Title level={2} key={event.id}>
                {event.title}
              </Title>
              <>
                {shiftState.shifts
                  .filter((shift) => shift.eventId == event.id)
                  .map((shift) => (
                    <>
                      <Title level={5} key={shift.id}>
                        {shift.location} {shift.title}
                      </Title>
                      <Paragraph>
                        <>
                          {dateToHourString(shift.start)} -{" "}
                          {dateToHourString(shift.end)}
                        </>
                      </Paragraph>
                    </>
                  ))}
              </>
            </>
          ))}
        </Content>
      </Layout>
    </Layout>
  );
}
