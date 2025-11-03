import React, { useState, useEffect } from 'react'

import { Button, Space } from 'antd'

import Title from 'antd/es/typography/Title';
import Text from 'antd/es/typography/Text';
import { useWindowSize } from '../hooks/useWindowSize';

interface CountDownProps {
  nextEvent: {
    title: string;
    start: Date;
    event_url: string;
  } | null;
}

export default function CountDown({ nextEvent }: CountDownProps) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0 });
  const { isMobile } = useWindowSize();

  const BASE_EVENT_URL = "https://www.facebook.com/ScrollBar"
  const units = [
    { label: 'Days', value: timeLeft.days.toString().padStart(2, '0') },
    { label: 'Hours', value: timeLeft.hours.toString().padStart(2, '0') },
    { label: 'Minutes', value: timeLeft.minutes.toString().padStart(2, '0') },
  ];

  useEffect(() => {
    if (!nextEvent?.start) return;

    const timer = setInterval(() => {
      const now = new Date();
      const diff = nextEvent.start.getTime() - now.getTime();
      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0 });
        return;
      }
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diff / (1000 * 60)) % 60);
      setTimeLeft({ days, hours, minutes });
    }, 1000);
    return () => clearInterval(timer);
  }, [nextEvent]);

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
        background: isMobile
          ? 'linear-gradient(to top, rgba(0, 0, 0, 0.8) 0%, rgba(0, 0, 0, 0.4) 70%, transparent 100%)'
          : undefined,
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
            textShadow: '2px 2px 4px rgba(0, 0, 0, 0.8)',
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
                color: 'yellow',
                fontSize: isMobile ? 18 : 32,
                fontWeight: 'bolder',
                position: 'relative',
                top: -5,
                textShadow: isMobile ? '2px 2px 4px rgba(0, 0, 0, 0.8)' : undefined,
              }}
            >
              :
            </span>
          }
        >
          {units.map(({ label, value }) => (
            <div
              key={label}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: isMobile ? '55px' : '70px',
                  height: isMobile ? '50px' : '60px',
                  backgroundColor: 'rgb(46, 46, 46)',
                  borderRadius: 8,
                  padding: 4,
                }}
              >
                <Text
                  style={{
                    color: 'yellow',
                    fontSize: isMobile ? 18 : 20,
                    fontWeight: 'bold',
                    lineHeight: 1,
                  }}
                >
                  {value}
                </Text>
                <Text
                  style={{
                    color: 'yellow',
                    fontSize: isMobile ? 10 : 12,
                    fontWeight: 'normal',
                    margin: '2px 0 0 0',
                    lineHeight: 1,
                  }}
                >
                  {label}
                </Text>
              </div>
            </div>
          ))}
        </Space>
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