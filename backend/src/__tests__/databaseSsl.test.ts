import { describe, expect, it } from 'vitest';
import { shouldUseDatabaseSsl } from '../databaseSsl.js';

describe('shouldUseDatabaseSsl', () => {
  it.each([
    undefined,
    'postgresql://postgres:rito@localhost:5434/rito_dev',
    'postgresql://postgres:rito@127.0.0.1:5434/rito_dev',
    'postgresql://postgres:rito@[::1]:5434/rito_dev',
    'postgresql://postgres:rito@postgres:5432/rito_dev',
    'postgresql://postgres:rito@host.docker.internal:5432/rito_dev',
    'postgresql://postgres:rito@172.20.0.2:5432/rito_dev',
  ])('does not use SSL for a local database URL', databaseUrl => {
    expect(shouldUseDatabaseSsl(databaseUrl)).toBe(false);
  });

  it.each([
    'postgresql://postgres:secret@database.example.com:5432/rito',
    'postgresql://postgres:secret@203.0.113.10:5432/rito',
    'not-a-database-url',
  ])('uses SSL for an external or invalid database URL', databaseUrl => {
    expect(shouldUseDatabaseSsl(databaseUrl)).toBe(true);
  });
});
