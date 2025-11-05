
import { Button, Space } from 'antd'
import Title from 'antd/es/typography/Title';
import Text from 'antd/es/typography/Text';
import { useWindowSize } from '../../hooks/useWindowSize';
import { useCountdown } from '../../hooks/useCountdown';
import CountdownUnit from './CountdownUnit';

interface CountDownProps {
  nextEvent: {
    title: string;
    start: Date;
    end: Date;
    event_url?: string;
  } | null;
}

export default function CountDown({ nextEvent }: CountDownProps) {
  const timeLeft = useCountdown(nextEvent?.start || null, nextEvent?.end || null);
  const { isMobile } = useWindowSize();

  const TEXT_SHADOW = `2px 2px 4px 'rgba(0, 0, 0, 0.8)'`;
  const BASE_EVENT_URL = "https://www.facebook.com/ScrollBar"
  const units = [
    { label: 'Days', value: timeLeft.days.toString().padStart(2, '0') },
    { label: 'Hours', value: timeLeft.hours.toString().padStart(2, '0') },
    { label: 'Minutes', value: timeLeft.minutes.toString().padStart(2, '0') },
  ];

  if (!nextEvent) return null;

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        width: '100%',
        maxWidth: '100%',
        textAlign: 'left',
        padding: isMobile ? '15px 5vw' : '30px 7vw',
        zIndex: 2,
        boxSizing: 'border-box',
      }}
    >
      <Space direction="vertical" size={12} style={{ maxWidth: 640, width: '100%' }} align="start">
        <Title
          level={1}
          style={{
            color: 'white',
            fontWeight: 'bold',
            fontSize: isMobile ? 32 : 60,
            lineHeight: 1.1,
            textShadow: TEXT_SHADOW,
            marginBottom: timeLeft.isOpen ? '-14px' : undefined,
          }}
        >
          {nextEvent.title}
        </Title>
        {timeLeft.isOpen && (
          <Text
            style={{
              color: 'yellow', 
              lineHeight: 1,
              fontSize: isMobile ? 32 : 48,
              fontWeight: 'bold',
              textShadow: TEXT_SHADOW,
            }}
          >
            We're Open
          </Text>
        )}
        {!timeLeft.isOpen && !timeLeft.loading && (
          <Space
            align="center"
            size={isMobile ? 6 : 8}
            split={
              <span
                style={{
                  color: 'yellow',
                  fontSize: isMobile ? 18 : 32,
                  fontWeight: 'bolder',
                  position: 'relative',
                  top: -5,
                  textShadow: isMobile ? TEXT_SHADOW : undefined,
                }}
              >
                :
              </span>
            }
          >
            {units.map(({ label, value }) => (
              <CountdownUnit 
                key={label} 
                label={label} 
                value={value} 
                isMobile={isMobile}
              />
            ))}
          </Space>
        )}
        <Button
          type="primary"
          size="large"
          style={{
            background: 'yellow',
            borderColor: 'rgba(46, 46, 46, 0.6)',
            borderWidth: 1,
            color: 'black',
            marginTop: 8,
            borderRadius: 25,
            alignSelf: 'flex-start',
            fontSize: isMobile ? 14 : 16,
            padding: isMobile ? '8px 24px' : '10px 40px',
            height: 'auto',
          }}
          href={nextEvent.event_url || BASE_EVENT_URL}
          target="_blank"
        >
          {nextEvent.event_url ? 'Go To Facebook Event' : 'Go To Facebook'}
        </Button>
      </Space>
    </div>
  );
}