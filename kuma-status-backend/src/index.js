import http from 'node:http';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';

import { config } from './config.js';
import KumaClient from './kuma/kumaClient.js';
import { createIncidentTracker } from './kuma/incidentTracker.js';
import { initDb } from './db/index.js';
import { createStatusPagesRepo } from './db/statusPagesRepo.js';
import { createIncidentsRepo } from './db/incidentsRepo.js';
import { createUsersRepo } from './db/usersRepo.js';
import { createSessionsRepo } from './db/sessionsRepo.js';
import { hashPassword } from './lib/passwordHash.js';
import { createSessionAuth } from './middleware/sessionAuth.js';
import { createHealthRouter } from './routes/health.js';
import { createMonitorsRouter } from './routes/monitors.js';
import { createPublicStatusPagesRouter, createStatusPagesRouter } from './routes/statusPages.js';
import { createAuthRouter } from './routes/auth.js';
import { createUsersRouter } from './routes/users.js';
import { createWsServer } from './ws/wsServer.js';

const db = initDb(config.dbPath);
const statusPagesRepo = createStatusPagesRepo(db);
const incidentsRepo = createIncidentsRepo(db);
const usersRepo = createUsersRepo(db);
const sessionsRepo = createSessionsRepo(db);

// Bikin akun admin pertama dari .env, TAPI cuma kalau tabel users masih kosong --
// dianggap seed sekali doang, nggak disinkron ulang tiap restart supaya nggak nimpa
// password yang udah diganti admin lewat panel /admin.
async function bootstrapAdmin() {
  if (usersRepo.hasAnyUsers()) return;

  if (!config.adminUsername || !config.adminPassword) {
    console.warn(
      '[bootstrap] ADMIN_USERNAME/ADMIN_PASSWORD belum diisi -- belum ada user admin, panel /admin tidak bisa login sampai user dibuat manual atau env ini diisi lalu server di-restart.'
    );
    return;
  }

  const passwordHash = await hashPassword(config.adminPassword);
  usersRepo.createUser({ username: config.adminUsername, passwordHash });
  console.log(`[bootstrap] admin user "${config.adminUsername}" dibuat dari ADMIN_USERNAME/ADMIN_PASSWORD`);
}

await bootstrapAdmin();

const kumaClient = new KumaClient(config.kuma);
kumaClient.connect();
createIncidentTracker(kumaClient, incidentsRepo);

const sessionAuth = createSessionAuth({ sessionsRepo, usersRepo });

const app = express();
app.use(cors({ origin: config.corsOrigin === '*' ? true : config.corsOrigin.split(','), credentials: true }));
app.use(express.json());
app.use(cookieParser());

// /health tanpa proteksi API key supaya mudah dipakai load balancer / uptime check lain.
app.use(createHealthRouter(kumaClient));

// Publik -- dikonsumsi langsung oleh frontend status page, tanpa API key.
app.use('/api', createPublicStatusPagesRouter(statusPagesRepo, incidentsRepo, kumaClient));

// Login/logout harus bisa diakses walau belum login -- makanya nggak dipasangi sessionAuth
// di level router, cuma /auth/me yang gembok sendiri (lihat routes/auth.js).
app.use('/api', createAuthRouter({ usersRepo, sessionsRepo, sessionAuth }));

// Admin -- wajib login (cookie sesi) atau x-api-key.
app.use('/api', sessionAuth, createMonitorsRouter(kumaClient));
app.use('/api', sessionAuth, createStatusPagesRouter(statusPagesRepo, incidentsRepo, kumaClient));
app.use('/api', sessionAuth, createUsersRouter({ usersRepo, sessionsRepo }));

app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.use((err, req, res, next) => {
  console.error('[http] unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

const server = http.createServer(app);
createWsServer(server, kumaClient);

server.listen(config.port, () => {
  console.log(`[server] listening on http://localhost:${config.port}`);
  console.log(`[server] websocket endpoint: ws://localhost:${config.port}/ws`);
});

function shutdown() {
  console.log('\n[server] shutting down...');
  server.close(() => {
    db.close();
    process.exit(0);
  });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
