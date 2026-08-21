'use client';

if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  const origError = console.error;
  console.error = (...args: any[]) => {
    const msg = args.map(a => (typeof a === 'string' ? a : '')).join(' ');
    if (msg.includes('Encountered a script tag')) {
      return;
    }
    origError.apply(console, args);
  };
}

export function React19Suppressor() {
  return null;
}
