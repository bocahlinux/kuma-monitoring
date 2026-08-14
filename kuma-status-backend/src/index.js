import http from 'node:http';
import express from 'express';
import cors from 'cors';

import { config } from './config.js';
import KumaClient from './kuma/kumaClient.js';
import { initDb } from './db/index.js';
import { createStatusPagesRepo } from './db/statusPagesRepo.js';
import { apiKeyAuth } from './middleware/apiKeyAuth.js';
import { createHealthRouter } from './routes/health.js';
import { createMonitorsRouter } from './routes/monitors.js';
import { createPublicStatusPagesRouter, createStatusPagesRouter } from './routes/statusPages.js';
import { createWsServer } from './ws/wsServer.js';

const db = initDb(config.dbPath);
const statusPagesRepo = createStatusPagesRepo(db);

const kumaClient = new KumaClient(config.kuma);
kumaClient.connect();

const app = express();
app.use(cors({ origin: config.corsOrigin === '*' ? true : config.corsOrigin.split(',') }));
app.use(express.json());

// /health tanpa proteksi API key supaya mudah dipakai load balancer / uptime check lain.
app.use(createHealthRouter(kumaClient));

// Publik -- dikonsumsi langsung oleh frontend status page, tanpa API key.
app.use('/api', createPublicStatusPagesRouter(statusPagesRepo, kumaClient));

// Admin -- wajib API key.
app.use('/api', apiKeyAuth, createMonitorsRouter(kumaClient));
app.use('/api', apiKeyAuth, createStatusPagesRouter(statusPagesRepo, kumaClient));

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
