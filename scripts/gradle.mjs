// Runs the API Gradle wrapper from the repo root on any OS: node scripts/gradle.mjs <tasks...>
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

const win = process.platform === 'win32';
const cwd = resolve(import.meta.dirname, '../apps/api');
const r = spawnSync(resolve(cwd, win ? 'gradlew.bat' : 'gradlew'), process.argv.slice(2), { cwd, stdio: 'inherit', shell: win });
process.exit(r.status ?? 1);
