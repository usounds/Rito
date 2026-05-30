import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function globalSetup() {
  console.log('\n--- Starting E2E Database Container ---');
  const projectRoot = path.resolve(__dirname, '../../');
  
  // 1. DBコンテナの起動
  try {
    execSync('sh scripts/e2e-db.sh start', { cwd: projectRoot, stdio: 'inherit' });
  } catch (error) {
    console.error('Failed to start E2E database:', error);
    process.exit(1);
  }

  // 2. Prisma DB Push & Seed
  console.log('--- Setting up Database Schema and Seed ---');
  try {
    const dbUrl = 'postgresql://postgres:test@localhost:5433/rito_test';
    execSync('pnpm exec prisma db push', {
      cwd: projectRoot,
      env: { ...process.env, DATABASE_URL: dbUrl },
      stdio: 'inherit',
    });
    execSync('pnpm exec tsx tests/e2e/setup/seed.ts', {
      cwd: projectRoot,
      env: { ...process.env, DATABASE_URL: dbUrl },
      stdio: 'inherit',
    });
  } catch (error) {
    console.error('Failed to setup database:', error);
    process.exit(1);
  }
  
  console.log('--- E2E Database Setup Complete ---\n');
}

export default globalSetup;
