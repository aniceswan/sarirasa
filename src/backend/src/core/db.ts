import pg from 'pg';
import type { QueryResultRow } from 'pg';
import type { Tx } from './contracts.js';
export class Database {
  readonly pool: pg.Pool;
  private closed = false;
  constructor(url: string) {
    this.pool = new pg.Pool({
      connectionString: url,
      max: 12,
      connectionTimeoutMillis: 3000,
      idleTimeoutMillis: 10000,
      statement_timeout: 10000,
    });
    this.pool.on('error', () => {});
  }
  query<R extends QueryResultRow = any>(text: string, values: unknown[] = []) {
    return this.pool.query<R>(text, values);
  }
  async transaction<T>(fn: (tx: Tx) => Promise<T>, options?: { retrySafe: boolean }): Promise<T> {
    for (let n = 0; ; n++) {
      const tx = await this.pool.connect();
      try {
        await tx.query('BEGIN');
        const result = await fn(tx);
        await tx.query('COMMIT');
        return result;
      } catch (e) {
        await tx.query('ROLLBACK').catch(() => {});
        const code = (e as { code?: string }).code;
        if (!options?.retrySafe || n >= 2 || !['40001', '40P01'].includes(code ?? '')) throw e;
      } finally {
        tx.release();
      }
    }
  }
  async close() {
    if (!this.closed) {
      this.closed = true;
      await this.pool.end();
    }
  }
}
