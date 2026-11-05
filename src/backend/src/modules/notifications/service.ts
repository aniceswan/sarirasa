import { z } from 'zod';
import type { Dependencies, ServiceContext } from '../../core/contracts.js';
import { hash, secretToken } from '../../core/crypto.js';
import { ApiError, requireState } from '../../core/errors.js';
import { NotificationRepository, type NotificationQuery } from './repository.js';
export const sequenceSchema = z
  .string()
  .regex(/^(0|[1-9]\d{0,18})$/)
  .refine((s) => BigInt(s) <= 9223372036854775807n);
export const notificationQuerySchema = z
  .object({
    cursor: sequenceSchema.optional(),
    after: sequenceSchema.optional(),
    limit: z.coerce.number().int().min(1).max(50).default(20),
  })
  .strict()
  .refine((q) => q.cursor === undefined || q.after === undefined, 'Gunakan satu jenis cursor.');
export const ticketSchema = z.object({ after: sequenceSchema.default('0') }).strict();
export class NotificationService {
  constructor(private deps: Dependencies) {}
  async list(ctx: ServiceContext, query: NotificationQuery | string = {}) {
    const q = typeof query === 'string' ? { after: query } : query;
    const rows = await new NotificationRepository(this.deps.db).list(ctx.actor.id, q);
    const limit = q.limit ?? 20;
    const items = rows.slice(0, limit).map(({ user_id: _user, ...r }) => r);
    const latest = items.reduce(
      (v, r) => (BigInt(r.sequence) > BigInt(v) ? r.sequence : v),
      q.after ?? '0',
    );
    return {
      items,
      next_cursor: rows.length > limit ? items[items.length - 1]!.sequence : null,
      last_cursor: latest,
    };
  }
  async markRead(ctx: ServiceContext, id: string) {
    const r = (
      await this.deps.db.query(
        'UPDATE notifications SET read_at=COALESCE(read_at,$3) WHERE id=$1 AND user_id=$2 RETURNING id,read_at',
        [id, ctx.actor.id, ctx.clock.now()],
      )
    ).rows[0];
    requireState(r, 'NOTIFICATION_NOT_FOUND', 'Notifikasi tidak ditemukan.', 404);
    return r;
  }
  async issueTicket(ctx: ServiceContext, after = '0') {
    sequenceSchema.parse(after);
    const ticket = `${secretToken()}.${after}`;
    const expires = new Date(ctx.clock.now().getTime() + 45000);
    await this.deps.db.query(
      'INSERT INTO ws_tickets(hash,session_id,expires_at) VALUES($1,$2,$3)',
      [hash(ticket), ctx.actor.sessionId, expires],
    );
    return { ticket, expires_at: expires.toISOString() };
  }
  async consumeTicket(ticket: string) {
    requireState(
      /^[A-Za-z0-9_-]{43}\.(0|[1-9]\d{0,18})$/.test(ticket),
      'INVALID_WS_TICKET',
      'Tiket koneksi tidak valid.',
      401,
    );
    const after = ticket.split('.')[1]!;
    sequenceSchema.parse(after);
    const now = this.deps.clock.now();
    return this.deps.db.transaction(async (tx) => {
      const row = (
        await tx.query<{ hash: string; session_id: string; user_id: string; session_expiry: Date }>(
          `SELECT t.hash,t.session_id,s.user_id,s.expires_at AS session_expiry FROM ws_tickets t JOIN sessions s ON s.id=t.session_id WHERE t.hash=$1 AND t.used_at IS NULL AND t.expires_at>$2 AND s.revoked_at IS NULL AND s.expires_at>$2 FOR UPDATE OF t`,
          [hash(ticket), now],
        )
      ).rows[0];
      requireState(
        row,
        'INVALID_WS_TICKET',
        'Tiket koneksi tidak valid atau sudah kedaluwarsa.',
        401,
      );
      await tx.query('UPDATE ws_tickets SET used_at=$2 WHERE hash=$1', [row.hash, now]);
      return {
        userId: row.user_id,
        sessionId: row.session_id,
        after,
        expires: new Date(Math.min(now.getTime() + 900000, row.session_expiry.getTime())),
      };
    });
  }
}
export async function publishPending(deps: Dependencies) {
  let claimed: { id: string; user_id: string; attempts: number }[] = [];
  try {
    return await deps.db.transaction(async (tx) => {
      claimed = (
        await tx.query(
          `SELECT o.id,o.attempts,n.user_id FROM outbox o JOIN notifications n ON n.id=o.notification_id WHERE o.published_at IS NULL AND o.attempts<10 AND o.next_attempt<=$1 ORDER BY o.next_attempt,o.id FOR UPDATE OF o SKIP LOCKED LIMIT 25`,
          [deps.clock.now()],
        )
      ).rows;
      for (const user of new Set(claimed.map((r) => r.user_id)))
        await tx.query("SELECT pg_notify('sisarasa_notifications',$1)", [user]);
      for (const item of claimed)
        await tx.query('UPDATE outbox SET published_at=$2 WHERE id=$1', [
          item.id,
          deps.clock.now(),
        ]);
      return claimed.length;
    });
  } catch (e) {
    for (const item of claimed)
      await deps.db
        .query(
          'UPDATE outbox SET attempts=attempts+1,next_attempt=$2 WHERE id=$1 AND published_at IS NULL',
          [
            item.id,
            new Date(deps.clock.now().getTime() + Math.min(300000, 5000 * 2 ** item.attempts)),
          ],
        )
        .catch(() => {});
    throw new ApiError(503, 'OUTBOX_UNAVAILABLE', 'Pengiriman notifikasi sementara tertunda.');
  }
}
