import React from 'react';
import { Card } from 'antd';
import Text from 'antd/es/typography/Text';

interface EventData {
  title: string;
  image: string;
  start: Date;
  event_url?: string;
  id?: string;
}

interface EventCardProps {
  event: EventData;
  isFeatured?: boolean;
  isMobile: boolean;
}

export const EventCard: React.FC<EventCardProps> = ({ event, isFeatured = false, isMobile }) => {
  const EVENT_INFORMATION_LABEL = "Get all the latest Information on the Facebook Event";
  
  // Base styles
  const baseCardStyle: React.CSSProperties = {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
  };

  const baseOverlayStyle: React.CSSProperties = {
    zIndex: 2,
    backgroundColor: 'rgba(46, 46, 46, 0.8)',
    padding: isMobile ? '12px 15px' : '20px',
    borderRadius: '10px',
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
    height: isMobile ? '120px' : '150px',
    overflow: 'hidden',
    boxSizing: 'border-box',
  };

  const baseTextStyle = {
    lineHeight: '1',
  };

  const textVariants = {
    date: {
      color: 'yellow',
      fontSize: isMobile ? '28px' : '32px',
    },
    title: {
      color: 'white',
      fontSize: isMobile ? '22px' : '22px',
      fontWeight: 'bold',
      marginBottom: '2px',
    },
    description: {
      color: 'white',
      fontSize: '10px',
      marginTop: 'auto',
    },
  };

  // Computed values
  const hasUrl = event.event_url;
  const isDesktop = !isMobile;
  
  const cardState = {
    showDescription: isFeatured && hasUrl && isDesktop,
    useFeaturedLayout: isFeatured && (hasUrl || isDesktop),
  };
  
  const getCardConfig = () => {
    if (cardState.useFeaturedLayout) {
      return {
        height: isMobile ? '190px' : '400px',
        overlayTop: isMobile ? '0%' : '80%',
        overlayAlign: (isMobile ? 'center' : 'left') as React.CSSProperties['textAlign'],
        overlayJustify: 'flex-start' as React.CSSProperties['justifyContent'],
      };
    }
    return {
      height: '190px',
      overlayTop: undefined,
      overlayAlign: 'center' as React.CSSProperties['textAlign'],
      overlayJustify: (isMobile ? 'center' : 'flex-start') as React.CSSProperties['justifyContent'],
    };
  };

  const cardConfig = getCardConfig();
  const overlayMargin = isMobile ? '0' : '-10px';

  const cardStyle: React.CSSProperties = {
    ...baseCardStyle,
    height: cardConfig.height,
    backgroundImage: `url(${event.image})`,
  };

  const overlayStyle: React.CSSProperties = {
    ...baseOverlayStyle,
    margin: overlayMargin,
    textAlign: cardConfig.overlayAlign,
    justifyContent: cardConfig.overlayJustify,
    ...(cardConfig.overlayTop && { top: cardConfig.overlayTop }),
  };

  const cardContent = (
    <Card hoverable style={cardStyle}>
      <div style={overlayStyle}>
        <Text style={{ ...baseTextStyle, ...textVariants.date }}>
          {event.start.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' })}
        </Text>
        <Text style={{ ...baseTextStyle, ...textVariants.title }}>
          {event.title}
        </Text>
        {cardState.showDescription && (
          <Text style={{ ...baseTextStyle, ...textVariants.description }}>
            {EVENT_INFORMATION_LABEL}
          </Text>
        )}
      </div>
    </Card>
  );

  if (event.event_url) {
    return (
      <a 
        href={event.event_url} 
        target="_blank" 
        rel="noopener noreferrer" 
        style={{ textDecoration: 'none' }}
      >
        {cardContent}
      </a>
    );
  }

  return cardContent;
};
