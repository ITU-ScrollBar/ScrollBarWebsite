
import { Col, Divider, Layout, Row, Card } from 'antd'
import Title from 'antd/es/typography/Title';
import Text from 'antd/es/typography/Text';
import Paragraph from 'antd/es/typography/Paragraph';
import { Header } from 'antd/es/layout/layout';
import { useWindowSize } from "../hooks/useWindowSize";
import HeaderBar from '../components/HomePage/HeaderBar';
import CountDown from '../components/EventCountDown';
import useEvents from '../hooks/useEvents';

export default function EventsPage() {
    const { eventState } = useEvents();
    const { isMobile } = useWindowSize();
    const DEFAULT_EVENT_IMAGE = "src/assets/images/background.png";
    const EVENT_INFORMATION_LABEL = "Get all the latest Information on the Facebook Event"
    const events = eventState.isLoaded ? eventState.events
        .filter(event => event.published && !event.internal)
        .map(event => ({
            title: event.title,
            image: event.picture ?? DEFAULT_EVENT_IMAGE,
            start: event.start,
            event_url: event.facebook_link,
        })).sort((a, b) => a.start.getTime() - b.start.getTime()) : [];

    // Get the next upcoming event for countdown
    const nextEvent = events.length > 0 ? events[0] : null;

    // Common styles
    const baseCardStyle = {
      position: 'relative',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
    };

    const baseOverlayStyle = {
      zIndex: 2,
      backgroundColor: 'rgba(46, 46, 46, 0.8)',
      padding: '20px',
      borderRadius: '10px',
      display: 'flex',
      flexDirection: 'column',
      position: 'relative',
      height: '150px',
      overflow: 'hidden',
      boxSizing: 'border-box',
    };

    const baseTextStyle = {
      lineHeight: '1.1',
    };

    const textVariants = {
      date: {
        color: 'yellow',
        fontSize: isMobile ? '24px' : '34px',
      },
      title: {
        color: 'white',
        fontSize: isMobile ? '14px' : '22px',
        fontWeight: 'bold',
        marginBottom: '2px',
      },
      description: {
        color: 'white',
        fontSize: '10px',
        marginTop: 'auto',
      },
    };

    const renderEventCard = (event: typeof events[0], isFeatured = false) => {
      const isSmall = !isFeatured;
      const cardHeight = isFeatured ? (isMobile ? '190px' : '400px') : '190px';
      const overlayTop = isFeatured ? (isMobile ? '0%' : '80%') : undefined;
      const overlayMargin = isMobile ? '0' : '-10px';
      const overlayAlign = isFeatured ? (isMobile ? 'center' : 'left') : 'center';
      const overlayJustify = isMobile && isSmall ? 'center' : 'flex-start';

      const cardStyle = {
        ...baseCardStyle,
        height: cardHeight,
        backgroundImage: `url(${event.image})`,
      };

      const overlayStyle = {
        ...baseOverlayStyle,
        margin: overlayMargin,
        textAlign: overlayAlign,
        justifyContent: overlayJustify,
        ...(overlayTop && { top: overlayTop }),
        ...(isMobile && isFeatured && { width: '100%' }),
      };

      return (
        <Card
          hoverable
          style={cardStyle}
        >
          <div 
            style={overlayStyle}
          >
            <Text style={{ ...baseTextStyle, ...textVariants.date }}>
              {event.start.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' })}
            </Text>
            <Text style={{ ...baseTextStyle, ...textVariants.title }}>
              {event.title}
            </Text>
            {isFeatured && (
              <Text style={{ ...baseTextStyle, ...textVariants.description }}>
                {EVENT_INFORMATION_LABEL}
              </Text>
            )}
          </div>
        </Card>
      );
    };

  return (
    <>
      <Layout 
        style={{
          minHeight: '100vh',
          minWidth: '100vw',
          display: 'flex',
          flexDirection: 'column',
          height: 'auto',
        }}
      >
        <Header 
          style={{
            position: 'absolute',
            top: 0,
            width: '100%',
            backgroundColor: 'transparent',
            boxShadow: 'none',
            zIndex: 3,
            display: 'flex',
            alignItems: 'center',
            color: '#fff',
          }}
        >
          <HeaderBar />
        </Header>

        <div 
          style={{
            position: 'relative',
            width: '100vw',
            height: isMobile ? '50vh' : '70vh',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundAttachment: 'fixed',
            backgroundImage: `url(${nextEvent ? nextEvent.image : DEFAULT_EVENT_IMAGE})`,
          }}
        >
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
                    {renderEventCard(featuredEvent, true)}
                  </div>
                  {otherEvents.map((event) => (
                    <div key={event.title}>
                      {renderEventCard(event, false)}
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
    </>
  )
}
   
            