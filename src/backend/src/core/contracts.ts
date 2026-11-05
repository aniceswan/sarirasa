import type { PoolClient } from 'pg';
import type { Config } from './config.js';
import type { Clock } from './clock.js';
import type { Database } from './db.js';
export type Actor = { id: string; role: 'buyer' | 'seller'; sessionId: string };
export type Tx = PoolClient;
export type ServiceContext = { actor: Actor; clock: Clock };
export type Dependencies = { db: Database; config: Config; clock: Clock };
export type Page<T> = { items: T[]; next_cursor: string | null };
