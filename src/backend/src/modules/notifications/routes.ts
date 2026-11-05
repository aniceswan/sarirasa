import { Router } from 'express';
import { z } from 'zod';
import type { Dependencies } from '../../core/contracts.js';
import { authenticated, context } from '../../core/auth.js';
import { asyncRoute } from '../../core/http.js';
import { RateLimiter } from '../../core/rate-limit.js';
import { NotificationService, notificationQuerySchema, ticketSchema } from './service.js';
export function notificationRoutes(deps: Dependencies) {
  const r = Router();
  const s = new NotificationService(deps);
  const limiter = new RateLimiter(deps);
  r.use(authenticated(deps));
  r.get(
    '/',
    asyncRoute(async (req, res) =>
      res.json(await s.list(context(res, deps), notificationQuerySchema.parse(req.query))),
    ),
  );
  r.post(
    '/ws-ticket',
    asyncRoute(async (req, res) => {
      const ctx = context(res, deps);
      await limiter.take(`ws-ticket:${ctx.actor.id}`, 30, 60000);
      res.json(await s.issueTicket(ctx, ticketSchema.parse(req.body ?? {}).after));
    }),
  );
  r.post(
    '/:id/read',
    asyncRoute(async (req, res) =>
      res.json(await s.markRead(context(res, deps), z.uuid().parse(req.params.id))),
    ),
  );
  return r;
}
