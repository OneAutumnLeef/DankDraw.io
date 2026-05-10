import cors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import Fastify from 'fastify';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ClientToServerEvents, ServerToClientEvents } from '@dankdraw/shared';
import { Server } from 'socket.io';
import { attachGateway } from './gateway.js';
import { RoomManager } from './RoomManager.js';

interface SocketData {
  name?: string;
  avatar?: string;
  color?: string;
  roomCode?: string;
  cleanup?: () => void;
}

const PORT = Number(process.env.PORT ?? 3000);
const HOST = process.env.HOST ?? '0.0.0.0';

const __dirname = dirname(fileURLToPath(import.meta.url));
const clientDist = join(__dirname, '..', '..', 'client', 'dist');

async function main() {
  const app = Fastify({ logger: { level: process.env.LOG_LEVEL ?? 'info' } });
  await app.register(cors, { origin: true, credentials: true });

  if (existsSync(clientDist)) {
    await app.register(fastifyStatic, {
      root: clientDist,
      prefix: '/',
      wildcard: false,
    });
    app.setNotFoundHandler((req, reply) => {
      // SPA fallback.
      if (req.method === 'GET' && req.headers.accept?.includes('text/html')) {
        return reply.sendFile('index.html');
      }
      return reply.status(404).send({ error: 'not found' });
    });
  }

  const manager = new RoomManager();

  app.get('/api/health', async () => ({ ok: true, rooms: manager.count() }));
  app.get('/api/rooms', async () => manager.publicListing());

  await app.listen({ port: PORT, host: HOST });

  const io = new Server<
    ClientToServerEvents,
    ServerToClientEvents,
    Record<string, never>,
    SocketData
  >(app.server, {
    cors: { origin: true, credentials: true },
    maxHttpBufferSize: 1e6,
    pingTimeout: 30_000,
  });
  attachGateway(io, manager);

  app.log.info(`🎨 DankDraw server ready on http://${HOST}:${PORT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
