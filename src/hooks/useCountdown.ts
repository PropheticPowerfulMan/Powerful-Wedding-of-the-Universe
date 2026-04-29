import { useState, useEffect } from 'react';
import type { CountdownTime } from '../types';

const WEDDING_DATE = new Date('2026-06-26T17:00:00');

export function useCountdown(): CountdownTime {
  const [time, setTime] = useState<CountdownTime>(() => getTimeRemaining());

  function getTimeRemaining(): CountdownTime {
    const total = WEDDING_DATE.getTime() - new Date().getTime();
    if (total <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 };
    return {
      days: Math.floor(total / (1000 * 60 * 60 * 24)),
      hours: Math.floor((total / (1000 * 60 * 60)) % 24),
      minutes: Math.floor((total / 1000 / 60) % 60),
      seconds: Math.floor((total / 1000) % 60),
    };
  }

  useEffect(() => {
    const interval = setInterval(() => {
      setTime(getTimeRemaining());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return time;
}
