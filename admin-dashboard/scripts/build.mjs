import { execFileSync } from 'node:child_process';
// Run sequentially and fail immediately, independent of the user's npm shell.
for (const entry of ['node_modules/typescript/bin/tsc', 'node_modules/vite/bin/vite.js']) {
  execFileSync(process.execPath, [entry, ...(entry.includes('vite') ? ['build'] : [])], { stdio: 'inherit' });
}
