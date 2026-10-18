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
  isMobile: boolean;
}

export const EventCard: React.FC<EventCardProps> = ({ event, isMobile }) => {
  const cardConfig = {
    height: '190px',
    overlayAlign: 'center' as React.CSSProperties['textAlign'],
    overlayJustify: (isMobile ? 'center' : 'flex-start') as React.CSSProperties['justifyContent'],
  };

  const cardStyle: React.CSSProperties = {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    height: cardConfig.height,
    backgroundImage: `url(${event.image})`,
  };

  const overlayStyle: React.CSSProperties = {
    zIndex: 2,
    backgroundColor: 'rgba(46, 46, 46, 0.8)',
    borderRadius: '10px',
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
    overflow: 'hidden',
    boxSizing: 'border-box',
    margin: isMobile ? '0' : '-10px',
    textAlign: cardConfig.overlayAlign,
    justifyContent: cardConfig.overlayJustify,
    height: isMobile ? '120px' : '150px',
    padding: isMobile ? '12px 15px' : '20px',
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
  };

  const cardContent = (
    <Card hoverable style={cardStyle}>
      <div style={overlayStyle}>
        <Text style={{ lineHeight: 1, ...textVariants.date }}>
          {event.start.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' })}
        </Text>
        <Text style={{ lineHeight: 1, ...textVariants.title }}>
          {event.title}
        </Text>
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
