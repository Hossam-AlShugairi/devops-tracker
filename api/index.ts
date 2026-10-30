import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import { apiRouter } from '../server/src/routes';

const app = express();

app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

app.use('/api', apiRouter);

export default app;
