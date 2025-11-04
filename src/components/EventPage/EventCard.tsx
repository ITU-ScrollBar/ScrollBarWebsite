import React from 'react';
import { Card } from 'antd';
import Text from 'antd/es/typography/Text';
import { COLORS } from '../../constants/colors';
import { COMMON_STYLES } from '../../constants/styles';

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
  
  const textVariants = {
    date: {
      color: COLORS.yellow,
      fontSize: isMobile ? '28px' : '32px',
    },
    title: {
      color: COLORS.white,
      fontSize: isMobile ? '22px' : '22px',
      fontWeight: 'bold',
      marginBottom: '2px',
    },
    description: {
      color: COLORS.white,
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
    ...COMMON_STYLES.cardBase,
    height: cardConfig.height,
    backgroundImage: `url(${event.image})`,
  };

  const overlayStyle: React.CSSProperties = {
    ...COMMON_STYLES.overlayBase,
    margin: overlayMargin,
    textAlign: cardConfig.overlayAlign,
    justifyContent: cardConfig.overlayJustify,
    height: isMobile ? '120px' : '150px',
    padding: isMobile ? '12px 15px' : '20px',
    ...(cardConfig.overlayTop && { top: cardConfig.overlayTop }),
  };

  const cardContent = (
    <Card hoverable style={cardStyle}>
      <div style={overlayStyle}>
        <Text style={{ ...COMMON_STYLES.textBase, ...textVariants.date }}>
          {event.start.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' })}
        </Text>
        <Text style={{ ...COMMON_STYLES.textBase, ...textVariants.title }}>
          {event.title}
        </Text>
        {cardState.showDescription && (
          <Text style={{ ...COMMON_STYLES.textBase, ...textVariants.description }}>
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
