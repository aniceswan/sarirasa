import 'dotenv/config';
import { setTimeout as sleep } from 'node:timers/promises';
import { writeFile, unlink } from 'node:fs/promises';
import pino from 'pino';
import { Database } from './core/db.js';
import { loadConfig } from './core/config.js';
import { systemClock } from './core/clock.js';
import { runDueJobs, ensureMaintenance } from './modules/jobs/service.js';
import { publishPending } from './modules/notifications/service.js';
const config = loadConfig();
const db = new Database(config.DATABASE_URL);
const deps = { config, db, clock: systemClock };
const log = pino();
const abort = new AbortController();
for (const signal of ['SIGTERM', 'SIGINT'] as const) process.once(signal, () => abort.abort());
try {
  await ensureMaintenance(deps);
  log.info('worker.started');
  while (!abort.signal.aborted) {
    try {
      const summary = await runDueJobs(deps, { signal: abort.signal });
      await publishPending(deps);
      await writeFile(
        '/tmp/sisarasa-worker-heartbeat',
        JSON.stringify({ at: new Date().toISOString() }),
      );
      if (summary.claimed) log.info(summary, 'worker.batch');
    } catch {
      log.error({ code: 'WORKER_UNAVAILABLE' }, 'worker.tick_failed');
    }
    await sleep(2000, undefined, { signal: abort.signal }).catch(() => {});
  }
} finally {
  await db.close();
  await unlink('/tmp/sisarasa-worker-heartbeat').catch(() => {});
  log.info('worker.stopped');
}
