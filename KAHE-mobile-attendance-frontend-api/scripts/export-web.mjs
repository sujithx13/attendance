import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const projectRoot = fileURLToPath(new URL('../', import.meta.url));
const result = spawnSync(process.execPath, [
  'node_modules/expo/bin/cli', 'export', '--platform', 'web',
  ...process.argv.slice(2),
], {
  cwd: projectRoot,
  stdio: 'inherit',
  env: {
    ...process.env,
    EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL || 'https://189.72.146.93/api/v1',
  },
});

if (result.error) console.error(result.error.message);
process.exit(result.status ?? 1);
