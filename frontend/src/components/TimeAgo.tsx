'use client';
import { useEffect, useState, useMemo } from 'react';

export default function TimeAgo({
  date,
  locale = 'ja',
}: {
  date: string | Date;
  locale?: string;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(timer);
  }, []);

  const text = useMemo(() => {
    if (!mounted) return "";

    const d = typeof date === 'string' ? new Date(date) : date;
    const now = new Date().getTime();
    const diffMs = now - d.getTime();

    const seconds = Math.floor(diffMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });

    if (Math.abs(seconds) < 60) return rtf.format(-seconds, 'second');
    if (Math.abs(minutes) < 60) return rtf.format(-minutes, 'minute');
    if (Math.abs(hours) < 24) return rtf.format(-hours, 'hour');
    return rtf.format(-days, 'day');
  }, [date, locale, mounted]);

  return <span>{text}</span>;
}
