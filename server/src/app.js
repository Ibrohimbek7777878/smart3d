/* ═══════════════════ SMART3D EXPRESS APP ═══════════════════ */
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { fileURLToPath } from 'url';

import config from './config.js';
import { notFound, errorHandler, asyncHandler } from './middleware/error.js';
import { apiLimiter } from './middleware/rateLimit.js';
import { query } from './db.js';

// Routes
import authRoutes from './routes/auth.js';
import materialRoutes from './routes/materials.js';
import fragmentRoutes from './routes/fragments.js';
import projectRoutes from './routes/projects.js';
import orderRoutes from './routes/orders.js';
import aiRoutes from './routes/ai.js';
import exportRoutes from './routes/export.js';
import adminRoutes from './routes/admin.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/* ═══════════════════ APP ═══════════════════ */
const app = express();

/* Security */
app.use(helmet({
  contentSecurityPolicy: false,  // Frontend uchun
  crossOriginEmbedderPolicy: false,
}));

/* CORS */
app.use(cors({
  origin: config.corsOrigins,
  credentials: true,
}));

/* Body parsing */
app.use(express.json({ limit: '10mb' }));

/* Static files (frontend) */
app.use(express.static(path.join(__dirname, '../../app')));

/* ═══════════════════ API ROUTES ═══════════════════ */
app.use('/api/auth', authRoutes);
app.use('/api/materials', apiLimiter, materialRoutes);
app.use('/api/fragments', apiLimiter, fragmentRoutes);
app.use('/api/projects', apiLimiter, projectRoutes);
app.use('/api/orders', apiLimiter, orderRoutes);
app.use('/api/ai', apiLimiter, aiRoutes);
app.use('/api/export', apiLimiter, exportRoutes);
app.use('/api/admin', apiLimiter, adminRoutes);

/* ═══════════════════ HEALTH ═══════════════════ */
app.get('/api/health', asyncHandler(async (req, res) => {
  const [users, materials, projects, orders] = await Promise.all([
    query('SELECT COUNT(*) as n FROM users'),
    query('SELECT COUNT(*) as n FROM materials WHERE is_active = true'),
    query('SELECT COUNT(*) as n FROM projects WHERE is_deleted = false'),
    query('SELECT COUNT(*) as n FROM orders'),
  ]);

  res.json({
    ok: true,
    version: '2.0.0',
    users: users.rows[0].n,
    materials: materials.rows[0].n,
    projects: projects.rows[0].n,
    orders: orders.rows[0].n,
    uptime: process.uptime(),
    memory: process.memoryUsage(),
  });
}));

/* ═══════════════════ METRICS (Prometheus) ═══════════════════ */
app.get('/metrics', asyncHandler(async (req, res) => {
  const { default: promClient } = await import('prom-client');
  res.set('Content-Type', promClient.register.contentType);
  res.end(await promClient.register.metrics());
}));

/* ═══════════════════ SPA FALLBACK ═══════════════════ */
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) return notFound(req, res);
  res.sendFile(path.join(__dirname, '../../app/index.html'));
});

/* ═══════════════════ ERROR HANDLING ═══════════════════ */
app.use(notFound);
app.use(errorHandler);

export default app;
