// app/components/TimeAgo.tsx
export default function TimeAgo({ date, locale = 'ja' }: { date: Date; locale?: string }) {
  const now = new Date().getTime();
  const diffMs = now - new Date(date).getTime();

  const seconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });

  if (Math.abs(seconds) < 60) return <span>{rtf.format(-seconds, 'second')}</span>;
  if (Math.abs(minutes) < 60) return <span>{rtf.format(-minutes, 'minute')}</span>;
  if (Math.abs(hours) < 24) return <span>{rtf.format(-hours, 'hour')}</span>;
  return <span>{rtf.format(-days, 'day')}</span>;
}
