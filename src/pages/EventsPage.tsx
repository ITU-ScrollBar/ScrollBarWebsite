
import { Col, Divider, Layout, Row } from 'antd'
import Title from 'antd/es/typography/Title';
import Paragraph from 'antd/es/typography/Paragraph';
import { useWindowSize } from "../hooks/useWindowSize";
import HeaderBar from '../components/HomePage/HeaderBar';
import CountDown from '../components/EventPage/EventCountDown';
import useEvents from '../hooks/useEvents';
import DEFAULT_EVENT_IMAGE from '../assets/images/background.png';
import { EventCard } from '../components/EventPage/EventCard';

export default function EventsPage() {
    const { eventState } = useEvents();
    const { isMobile } = useWindowSize();
    const events = eventState.isLoaded ? eventState.events
        .filter(event => event.published && !event.internal)
        .map(event => ({
            id: event.id,
            title: event.title,
            image: event.picture ?? DEFAULT_EVENT_IMAGE,
            start: event.start,
            end: event.end,
            event_url: event.facebook_link,
        })).sort((a, b) => a.start.getTime() - b.start.getTime()) : [];

    // Get the next upcoming event for countdown
    const nextEvent = events.length > 0 ? events[0] : null;

  return (
    <Layout 
      style={{
        minHeight: '100vh',
        minWidth: '100vw',
        display: 'flex',
        flexDirection: 'column',
        height: 'auto',
      }}
    >
      <HeaderBar />

        <div 
          style={{
            position: 'relative',
            width: '100vw',
            height: isMobile ? '50vh' : '70vh',
            minHeight: '350px',
            overflow: 'hidden',
          }}
        >
          <img
            src={nextEvent ? nextEvent.image : DEFAULT_EVENT_IMAGE}
            alt="Event background"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: 'center',
            }}
          />
          <div 
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              zIndex: 1,
            }}
          />
          {nextEvent && <CountDown nextEvent={nextEvent} />}
        </div>

      <Row justify="center">
        <Col
          md={24}
          lg={20}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <Title 
            level={2} 
            style={{
              textAlign: isMobile ? 'center' : 'left',
              alignSelf: isMobile ? 'center' : 'flex-start',
              fontSize: isMobile ? 'medium' : 'large',
              fontWeight: 'bold',
              marginBottom: '30px',
            }}
          >
            Our Events This Semester
          </Title>

          {events.length > 0 ? (() => {
            const featuredEvent = events[0];
            const otherEvents = events.slice(1);
            return (
              <div 
                style={{
                  display: 'grid',
                  gridTemplateColumns: isMobile ? 'repeat(1, 1fr)' : 'repeat(4, 1fr)',
                  gap: isMobile ? '12px' : '16px',
                  width: '100%',
                }}
              >
                <div 
                  style={{
                    gridRow: isMobile ? 'span 1' : 'span 2',
                    gridColumn: 'span 1',
                  }}
                >
                  <EventCard event={featuredEvent} isFeatured={true} isMobile={isMobile} />
                </div>
                {otherEvents.map((event) => (
                  <div key={event.id}>
                    <EventCard event={event} isFeatured={false} isMobile={isMobile} />
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
   
            