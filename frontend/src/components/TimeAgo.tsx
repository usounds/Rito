'use client';
import { useEffect, useState } from 'react';

export default function TimeAgo({
  date,
  locale = 'ja',
}: {
  date: string | Date;
  locale?: string;
}) {
  const [text, setText] = useState<string>("");

  useEffect(() => {
    const d = typeof date === 'string' ? new Date(date) : date;
    const now = new Date().getTime();
    const diffMs = now - d.getTime();

    const seconds = Math.floor(diffMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });

    if (Math.abs(seconds) < 60) setText(rtf.format(-seconds, 'second'));
    else if (Math.abs(minutes) < 60) setText(rtf.format(-minutes, 'minute'));
    else if (Math.abs(hours) < 24) setText(rtf.format(-hours, 'hour'));
    else setText(rtf.format(-days, 'day'));
  }, [date, locale]);

  return <span>{text}</span>;
}
