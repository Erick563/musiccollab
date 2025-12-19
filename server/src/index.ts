import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import os from 'os';
import path from 'path';

import { config, connectDatabase } from './config/database';
import { logger } from './utils/logger';

import authRoutes from './routes/auth';
import projectRoutes from './routes/projects';
import trackRoutes from './routes/tracks';

import { errorHandler } from './middleware/errorHandler';
import { notFound } from './middleware/notFound';
import { setupCollaborationHandlers } from './handlers/collaborationHandler';

dotenv.config();

const app = express();
const server = createServer(app);

server.timeout = 120000;
server.keepAliveTimeout = 65000;
server.headersTimeout = 66000;

const io = new Server(server, {
  cors: {
    origin: 'http://localhost:3000',
    methods: ["GET", "POST"],
    credentials: true
  },
  pingTimeout: 10000,
  pingInterval: 5000,
  connectTimeout: 10000,
  maxHttpBufferSize: 1e8,
  transports: ['websocket', 'polling'],
  allowUpgrades: true,
  perMessageDeflate: {
    threshold: 1024
  }
});

const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || '0.0.0.0';

const isProduction = process.env.NODE_ENV === 'production';
app.use(helmet({
  contentSecurityPolicy: isProduction ? false : undefined,
}));
app.use(compression());

app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.options('*', cors({
  origin: 'http://localhost:3000',
  credentials: true,
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(morgan('combined', { stream: { write: (message) => logger.info(message.trim()) } }));

app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/tracks', trackRoutes);

if (isProduction) {
  const clientBuildPath = path.join(__dirname, '../../client/build');
  app.use(express.static(clientBuildPath));
  
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.join(clientBuildPath, 'index.html'));
  });
}

app.use(notFound);
app.use(errorHandler);

setupCollaborationHandlers(io);

server.listen(PORT as number, HOST as string, async () => {
  await connectDatabase();
  
  const networkInterfaces = os.networkInterfaces();
  const localIPs: string[] = [];
  
  Object.keys(networkInterfaces).forEach((interfaceName) => {
    const addresses = networkInterfaces[interfaceName];
    if (addresses) {
      addresses.forEach((address) => {
        const family = address.family;
        const isIPv4 = family === 'IPv4' || (typeof family === 'number' && family === 4);
        if (isIPv4 && !address.internal) {
          localIPs.push(address.address);
        }
      });
    }
  });
  
  logger.info(`🚀 Servidor rodando na porta ${PORT}`);
  logger.info(`🌐 Acessível em:`);
  logger.info(`   - http://localhost:${PORT}`);
  logger.info(`   - http://127.0.0.1:${PORT}`);
  if (localIPs.length > 0) {
    localIPs.forEach(ip => {
      logger.info(`   - http://${ip}:${PORT}`);
    });
  }
  logger.info(`📡 Socket.IO configurado com colaboração em tempo real`);
});

export { app, server, io };
