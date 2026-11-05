import type { Database } from '../../core/db.js';
export type NotificationRecord = {
  id: string;
  sequence: string;
  user_id: string;
  type: string;
  resource_id: string;
  summary: string;
  read_at: Date | null;
  occurred_at: Date;
};
export type NotificationQuery = { cursor?: string; after?: string; limit?: number };
export class NotificationRepository {
  constructor(private db: Database) {}
  async list(user: string, q: NotificationQuery) {
    const after = q.after !== undefined;
    const cursor = after ? q.after : q.cursor;
    return (
      await this.db.query<NotificationRecord>(
        `SELECT * FROM notifications WHERE user_id=$1 AND ($2::bigint IS NULL OR sequence${after ? '>' : '<'}$2) ORDER BY sequence ${after ? 'ASC' : 'DESC'} LIMIT $3`,
        [user, cursor, (q.limit ?? 20) + 1],
      )
    ).rows;
  }
}
