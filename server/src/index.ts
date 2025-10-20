import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';

import { config, connectDatabase } from './config/database';
import { logger } from './utils/logger';

import authRoutes from './routes/auth';

import { errorHandler } from './middleware/errorHandler';
import { notFound } from './middleware/notFound';

dotenv.config();

const app = express();
const server = createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.SOCKET_CORS_ORIGIN || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3001;

app.use(helmet());
app.use(compression());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Muitas tentativas de acesso, tente novamente em 15 minutos.'
});
app.use('/api/', limiter);

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(morgan('combined', { stream: { write: (message) => logger.info(message.trim()) } }));

app.use('/api/auth', authRoutes);

app.use(notFound);
app.use(errorHandler);

server.listen(PORT, async () => {
  await connectDatabase();
  logger.info(`🚀 Servidor rodando na porta ${PORT}`);
  logger.info(`📡 Socket.IO configurado`);
});

export { app, server, io };
