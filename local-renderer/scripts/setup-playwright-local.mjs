import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const browserDir = path.join(rootDir, '.playwright');

await mkdir(browserDir, { recursive: true });

const isWindows = process.platform === 'win32';
const npmCommand = isWindows ? 'npx.cmd' : 'npx';

const child = spawn(npmCommand, ['playwright', 'install', 'chromium'], {
  cwd: rootDir,
  stdio: 'inherit',
  shell: false,
  env: {
    ...process.env,
    PLAYWRIGHT_BROWSERS_PATH: browserDir,
  },
});

child.on('exit', (code) => {
  process.exit(code ?? 1);
});

child.on('error', (error) => {
  console.error(error);
  process.exit(1);
});
