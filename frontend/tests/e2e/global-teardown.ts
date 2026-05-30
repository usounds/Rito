import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function globalTeardown() {
  console.log('\n--- Stopping E2E Database Container ---');
  const projectRoot = path.resolve(__dirname, '../../');
  
  try {
    execSync('sh scripts/e2e-db.sh stop', { cwd: projectRoot, stdio: 'inherit' });
  } catch (error) {
    console.warn('Failed to stop E2E database container safely:', error);
  }
  console.log('--- E2E Database Container Stopped ---\n');
}

export default globalTeardown;
