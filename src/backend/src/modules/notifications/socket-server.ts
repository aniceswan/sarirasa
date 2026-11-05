import { WebSocketServer, WebSocket } from 'ws';
import type { Server, IncomingMessage } from 'node:http';
import type { Duplex } from 'node:stream';
import type { PoolClient, Notification } from 'pg';
import type { Dependencies } from '../../core/contracts.js';
import { ApiError } from '../../core/errors.js';
import { RateLimiter } from '../../core/rate-limit.js';
import { NotificationService } from './service.js';
type Connection = {
  userId: string;
  sessionId: string;
  after: string;
  expires: Date;
  alive: boolean;
  sending: boolean;
  again: boolean;
};
export class SocketServer {
  private wss = new WebSocketServer({
    noServer: true,
    maxPayload: 16384,
    perMessageDeflate: false,
  });
  private clients = new Map<WebSocket, Connection>();
  private listener: PoolClient | undefined;
  private connecting: Promise<void> | undefined;
  private stopped = false;
  private heartbeat: NodeJS.Timeout;
  private reconnect: NodeJS.Timeout;
  readonly ready: Promise<void>;
  constructor(
    server: Server,
    private deps: Dependencies,
  ) {
    server.on('upgrade', (req, socket, head) => {
      void this.upgrade(req, socket, head).catch(() => socket.destroy());
    });
    this.ready = this.connectListener();
    this.heartbeat = setInterval(() => {
      void this.checkSessions();
      for (const [ws, c] of this.clients) {
        if (!c.alive) {
          ws.terminate();
          continue;
        }
        c.alive = false;
        ws.ping();
        this.requestFlush(ws, c);
      }
    }, 30000);
    this.heartbeat.unref();
    this.reconnect = setInterval(() => {
      if (!this.listener && !this.stopped) void this.connectListener();
    }, 5000);
    this.reconnect.unref();
  }
  private async connectListener() {
    if (this.connecting) return this.connecting;
    this.connecting = (async () => {
      let client: PoolClient | undefined;
      try {
        client = await this.deps.db.pool.connect();
        await client.query('LISTEN sisarasa_notifications');
        await client.query('LISTEN sisarasa_sessions');
        if (this.stopped) {
          client.release(true);
          return;
        }
        this.listener = client;
        client.on('notification', (n: Notification) => {
          if (n.channel === 'sisarasa_sessions') {
            void this.checkSessions();
            return;
          }
          for (const [ws, c] of this.clients) if (c.userId === n.payload) this.requestFlush(ws, c);
        });
        client.once('error', () => {
          this.listener = undefined;
          client!.release(true);
          for (const ws of this.clients.keys()) ws.close(1013, 'Koneksi database terputus.');
        });
      } catch {
        client?.release(true);
      }
    })().finally(() => {
      this.connecting = undefined;
    });
    return this.connecting;
  }
  private async upgrade(req: IncomingMessage, socket: Duplex, head: Buffer) {
    const ignore = () => {};
    socket.on('error', ignore);
    try {
      if (this.stopped) throw new ApiError(503, 'STOPPING', 'Server sedang berhenti.');
      const url = new URL(req.url ?? '', 'http://localhost');
      if (
        url.pathname !== '/ws' ||
        [...url.searchParams.keys()].some((k) => k !== 'ticket') ||
        url.searchParams.getAll('ticket').length !== 1
      )
        throw new ApiError(401, 'INVALID_WS_TICKET', 'Tiket tidak valid.');
      await new RateLimiter(this.deps).take(`ws-upgrade:${req.socket.remoteAddress}`, 300, 60000);
      const auth = await new NotificationService(this.deps).consumeTicket(
        url.searchParams.get('ticket') ?? '',
      );
      socket.removeListener('error', ignore);
      this.wss.handleUpgrade(req, socket, head, (ws) => {
        const c: Connection = { ...auth, alive: true, sending: false, again: false };
        this.clients.set(ws, c);
        ws.on('pong', () => {
          c.alive = true;
        });
        ws.on('close', () => this.clients.delete(ws));
        ws.on('error', () => {});
        ws.on('message', () => ws.close(1008, 'Koneksi ini hanya untuk inbox.'));
        this.requestFlush(ws, c);
      });
    } catch (e) {
      const status = e instanceof ApiError ? e.status : 503;
      socket.end(`HTTP/1.1 ${status} Rejected\r\nConnection: close\r\nContent-Length: 0\r\n\r\n`);
    }
  }
  async checkSessions() {
    if (!this.clients.size) return;
    try {
      const active = new Set(
        (
          await this.deps.db.query<{ id: string }>(
            'SELECT id FROM sessions WHERE id=ANY($1::uuid[]) AND revoked_at IS NULL AND expires_at>$2',
            [
              [...new Set([...this.clients.values()].map((c) => c.sessionId))],
              this.deps.clock.now(),
            ],
          )
        ).rows.map((r) => r.id),
      );
      for (const [ws, c] of this.clients)
        if (!active.has(c.sessionId) || c.expires <= this.deps.clock.now())
          ws.close(1008, 'Sesi berakhir.');
    } catch {
      for (const ws of this.clients.keys()) ws.close(1013, 'Sesi belum dapat diverifikasi.');
    }
  }
  private requestFlush(ws: WebSocket, c: Connection) {
    if (c.sending) {
      c.again = true;
      return;
    }
    c.sending = true;
    void this.flush(ws, c)
      .catch(() => ws.close(1013, 'Inbox sementara tertunda.'))
      .finally(() => {
        c.sending = false;
        if (c.again) {
          c.again = false;
          this.requestFlush(ws, c);
        }
      });
  }
  private async flush(ws: WebSocket, c: Connection) {
    const now = this.deps.clock.now();
    if (c.expires <= now) {
      ws.close(1008, 'Sesi berakhir.');
      return;
    }
    const session = (
      await this.deps.db.query(
        'SELECT id FROM sessions WHERE id=$1 AND revoked_at IS NULL AND expires_at>$2',
        [c.sessionId, now],
      )
    ).rowCount;
    if (!session) {
      ws.close(1008, 'Sesi berakhir.');
      return;
    }
    for (let page = 0; page < 5 && ws.readyState === WebSocket.OPEN; page++) {
      const result = await new NotificationService(this.deps).list(
        { actor: { id: c.userId, role: 'buyer', sessionId: c.sessionId }, clock: this.deps.clock },
        { after: c.after, limit: 50 },
      );
      for (const item of result.items) {
        if (ws.readyState !== WebSocket.OPEN) return;
        if (ws.bufferedAmount > 1048576) {
          ws.close(1013, 'Muat ulang inbox.');
          return;
        }
        ws.send(JSON.stringify(item));
        c.after = item.sequence;
      }
      if (!result.next_cursor) return;
    }
    if (ws.readyState === WebSocket.OPEN) ws.close(1013, 'Lanjutkan sinkronisasi inbox.');
  }
  async stop() {
    if (this.stopped) return;
    this.stopped = true;
    clearInterval(this.heartbeat);
    clearInterval(this.reconnect);
    for (const ws of this.clients.keys()) ws.terminate();
    await this.connecting;
    const listener = this.listener;
    this.listener = undefined;
    if (listener) {
      listener.removeAllListeners('notification');
      listener.removeAllListeners('error');
      await listener.query('UNLISTEN *').catch(() => {});
      listener.release(true);
    }
    await new Promise<void>((resolve) => this.wss.close(() => resolve()));
  }
}
