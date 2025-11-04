
import { Button, Space } from 'antd'
import Title from 'antd/es/typography/Title';
import { useWindowSize } from '../../hooks/useWindowSize';
import { useCountdown } from '../../hooks/useCountdown';
import CountdownUnit from './CountdownUnit';
import { COLORS } from '../../constants/colors';
import { COMMON_STYLES } from '../../constants/styles';

interface CountDownProps {
  nextEvent: {
    title: string;
    start: Date;
    event_url: string;
  } | null;
}

export default function CountDown({ nextEvent }: CountDownProps) {
  const timeLeft = useCountdown(nextEvent?.start || null);
  const { isMobile } = useWindowSize();

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
            color: COLORS.white,
            fontWeight: 'bold',
            fontSize: isMobile ? 32 : 60,
            lineHeight: 1.1,
            textShadow: `2px 2px 4px ${COLORS.blackShadow}`,
          }}
        >
          {nextEvent.title}
        </Title>
        <Space
          align="center"
          size={isMobile ? 6 : 8}
          split={
            <span
              style={{
                color: COLORS.yellow,
                fontSize: isMobile ? 18 : 32,
                fontWeight: 'bolder',
                position: 'relative',
                top: -5,
                textShadow: isMobile ? `2px 2px 4px ${COLORS.blackShadow}` : undefined,
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
        <Button
          type="primary"
          size="large"
          style={{
            background: COLORS.yellow,
            borderColor: COLORS.darkGrayBorder,
            borderWidth: 1,
            color: COLORS.black,
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