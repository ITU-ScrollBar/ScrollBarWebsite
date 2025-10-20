
import { Col, Divider, Layout, Row, Card, Typography } from 'antd'

import Title from 'antd/es/typography/Title';
import Paragraph from 'antd/es/typography/Paragraph';
import { Header } from 'antd/es/layout/layout';
import HeaderBar from '../components/HomePage/HeaderBar';
import CountDown from '../components/EventCountDown';
import './EventsPage.css';
import useEvents from '../hooks/useEvents';


const { Text } = Typography;

export default function EventsPage() {
    const { eventState } = useEvents();

    const DEFAULT_EVENT_IMAGE = "/assets/background-DD5GamNA.png";
    const EVENT_INFORMATION_LABEL = "Get all the latest Information on the Facebook Event"
    const DEFAULT_FACEBOOK_LINK = "https://www.facebook.com/ScrollBar"
    const events = eventState.isLoaded ? eventState.events
        .filter(event => event.published && !event.internal)
        .map(event => ({
            title: event.displayName,
            image: event.picture ?? DEFAULT_EVENT_IMAGE,
            start: event.start,
            event_url: event.facebook_link ?? DEFAULT_FACEBOOK_LINK,
        })).sort((a, b) => a.start.getTime() - b.start.getTime()) : [];

    // Get the next upcoming event for countdown
    const nextEvent = events.length > 0 ? events[0] : null;

  return (
    <Layout className="eventsPage">
       <Header className="header">
        <HeaderBar />
      </Header>

    <div className="heroImage" style={{ backgroundImage: `url(${nextEvent ? nextEvent.image : DEFAULT_EVENT_IMAGE})` }}>
      {nextEvent && <CountDown nextEvent={nextEvent} />}
    </div>    <Row justify="center">
          <Col
            md={24}
            lg={20}
            className="eventsContainer"
          >
            <Title level={2} className="eventsTitle">
              Our Events This Semester
            </Title>

            {events.length > 0 ? (() => {
              const featuredEvent = events[0];
              const otherEvents = events.slice(1);
              return (
                <div className="eventsGrid">
                  <div className="featuredEvent">
                    <Card
                      hoverable
                      className="eventCard eventCard--featured"
                      style={{ backgroundImage: `url(${featuredEvent.image})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
                    >
                      <div className="eventOverlay eventOverlay--featured">
                        <Text className="eventText eventText--date">{featuredEvent.start.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' })}</Text>
                        <Text className="eventText eventText--title">{featuredEvent.title}</Text>
                        <Text className="eventText eventText--description">{EVENT_INFORMATION_LABEL}</Text>
                      </div>
                    </Card>
                  </div>
                  {otherEvents.map((event) => (
                    <div key={event.title}>
                      <Card
                        hoverable
                        className="eventCard eventCard--small"
                        style={{ backgroundImage: `url(${event.image})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
                      >
                        <div className="eventOverlay">
                          <Text className="eventText eventText--date">{event.start.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' })}</Text>
                          <Text className="eventText eventText--title">{event.title}</Text>
                        </div>
                      </Card>
                    </div>
                  ))}
                </div>
              );
            })() : (
              <Paragraph style={{ textAlign: "center" }}>No upcoming events at the moment.</Paragraph>
            )}
          </Col>
        </Row>
       <Divider />   
    </Layout>
  )
}
   
            