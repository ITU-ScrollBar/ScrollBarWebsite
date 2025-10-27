import React, { useState, useEffect } from 'react'

import { Button, Space, Tag } from 'antd'

import Title from 'antd/es/typography/Title';

interface CountDownProps {
  nextEvent: {
    title: string;
    start: Date;
    event_url: string;
  } | null;
}

export default function CountDown({ nextEvent }: CountDownProps) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0 });

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
    <div className="countdownSection">
      <div className="countdownContent">
        <Tag className="nextEventTag">Next Event</Tag>
        <Title level={1} className="eventTitle">
          {nextEvent.title}
        </Title>
        <div className="countdownDisplay">
          <div className="countdownUnit">
            <div className="countdownBlock">
              <span className="countdownNumber">{timeLeft.days.toString().padStart(2, '0')}</span>
              <p className="countdownLabel">Days</p>
            </div>
          </div>
          <span className="countdownSeparator">:</span>
          <div className="countdownUnit">
            <div className="countdownBlock">
              <span className="countdownNumber">{timeLeft.hours.toString().padStart(2, '0')}</span>
              <p className="countdownLabel">Hours</p>
            </div>
          </div>
          <span className="countdownSeparator">:</span>
          <div className="countdownUnit">
            <div className="countdownBlock">
              <span className="countdownNumber">{timeLeft.minutes.toString().padStart(2, '0')}</span>
              <p className="countdownLabel">Minutes</p>
            </div>
          </div>
        </div>
        <Button
          type="primary"
          size="large"
          className="facebookButton"
          href={nextEvent.event_url}
          target="_blank"
        >
          Go To Facebook Event
        </Button>
      </div>
    </div>
  );
}