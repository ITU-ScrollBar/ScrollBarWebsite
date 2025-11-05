import { useState, useEffect } from 'react';

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  isOpen: boolean;
  loading: boolean;
}

export const useCountdown = (
  eventStart: Date | null,
  eventEnd?: Date | null
): TimeLeft => {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>({
    days: 0,
    hours: 0,
    minutes: 0,
    isOpen: false,
    loading: true,
  });

  useEffect(() => {
    if (!eventStart) return;

    const timer = setInterval(() => {
      const now = new Date();
      const diff = eventStart.getTime() - now.getTime();

      // Check if event is currently open (between start and end)
      const isCurrentlyOpen = diff <= 0 && eventEnd && now.getTime() < eventEnd.getTime();

      if (isCurrentlyOpen) {
        // Event is happening right now
        setTimeLeft({
          days: 0,
          hours: 0,
          minutes: 0,
          isOpen: true,
          loading: false,
        });
        return;
      }


      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diff / (1000 * 60)) % 60);
      setTimeLeft({
        days,
        hours,
        minutes,
        isOpen: false,
        loading: false,
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [eventStart, eventEnd]);

  return timeLeft;
};
