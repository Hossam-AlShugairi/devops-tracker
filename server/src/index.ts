import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import path from 'node:path';
import dotenv from 'dotenv';
import { initDatabase } from './db';
import { apiRouter } from './routes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || true,
    credentials: true,
  })
);

// Initialize DB and Seed
initDatabase();

// API routes
app.use('/api', apiRouter);

// Serve static frontend in production
const clientDistPath = path.resolve(process.cwd(), 'client', 'dist');
app.use(express.static(clientDistPath));

app.get('*', (_req, res) => {
  res.sendFile(path.join(clientDistPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 DevOps Tracker server listening on port ${PORT}`);
});
