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

// Configurar timeouts do servidor HTTP para evitar conexões penduradas
server.timeout = 120000; // 120 segundos
server.keepAliveTimeout = 65000; // 65 segundos (maior que o padrão de load balancers)
server.headersTimeout = 66000; // 66 segundos (deve ser maior que keepAliveTimeout)

// Configurar Socket.IO para aceitar conexões da rede local
const socketCorsOrigin = process.env.SOCKET_CORS_ORIGIN;
const io = new Server(server, {
  cors: {
    origin: true,
    methods: ["GET", "POST"],
    credentials: true
  },
  // Configurações para detectar desconexões rapidamente
  pingTimeout: 10000, // 10 segundos - tempo para aguardar resposta do ping antes de considerar desconectado
  pingInterval: 5000, // 5 segundos - intervalo entre pings para detectar desconexão mais rápido
  connectTimeout: 10000, // 10 segundos - timeout para conexão inicial
  maxHttpBufferSize: 1e8, // 100 MB - limite de dados por mensagem
  // Configurações de transporte
  transports: ['websocket', 'polling'],
  allowUpgrades: true,
  // Configurações adicionais de performance
  perMessageDeflate: {
    threshold: 1024 // Comprimir mensagens maiores que 1KB
  }
});

const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || '0.0.0.0'; // Escuta em todas as interfaces de rede

// Configurar Helmet - em produção, permitir recursos estáticos do React
const isProduction = process.env.NODE_ENV === 'production';
app.use(helmet({
  contentSecurityPolicy: isProduction ? false : undefined, // Desabilitar CSP em produção para permitir recursos do React
}));
app.use(compression());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Muitas tentativas de acesso, tente novamente em 15 minutos.'
});
app.use('/api/', limiter);

// Configurar CORS para aceitar requisições da rede local
const corsOptions = {
  origin: function (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
    // Permitir requisições sem origin (mobile apps, Postman, etc)
    if (!origin) {
      console.log('[CORS] Requisição sem origin - PERMITIDA');
      return callback(null, true);
    }
    
    // Permitir localhost e IPs da rede local (192.168.x.x, 10.x.x.x, 172.16-31.x.x)
    const allowedOrigins = [
      /^http:\/\/localhost:\d+$/,
      /^http:\/\/127\.0\.0\.1:\d+$/,
      /^http:\/\/192\.168\.\d+\.\d+:\d+$/,
      /^http:\/\/10\.\d+\.\d+\.\d+:\d+$/,
      /^http:\/\/172\.(1[6-9]|2[0-9]|3[0-1])\.\d+\.\d+:\d+$/
    ];
    
    // Se SOCKET_CORS_ORIGIN estiver definido, também permitir
    if (process.env.SOCKET_CORS_ORIGIN) {
      const origins = process.env.SOCKET_CORS_ORIGIN.split(',');
      origins.forEach(o => {
        allowedOrigins.push(new RegExp('^' + o.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$'));
      });
    }
    
    const isAllowed = allowedOrigins.some(pattern => pattern.test(origin));
    
    if (isAllowed) {
      console.log('[CORS] Origin permitida:', origin);
      callback(null, true); // Allow the request
    } else {
      console.log('[CORS] Origin BLOQUEADA:', origin);
      callback(null, false); // Explicitly deny
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(morgan('combined', { stream: { write: (message) => logger.info(message.trim()) } }));

app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/tracks', trackRoutes);

// Servir arquivos estáticos do React em produção
if (isProduction) {
  const clientBuildPath = path.join(__dirname, '../../client/build');
  app.use(express.static(clientBuildPath));
  
  // Para todas as rotas que não são API, servir o index.html do React (SPA)
  // Rotas da API não encontradas serão tratadas pelo middleware notFound abaixo
  app.get('*', (req, res, next) => {
    // Se for rota da API, passar para o próximo middleware (notFound)
    if (req.path.startsWith('/api')) {
      return next();
    }
    // Caso contrário, servir o index.html do React
    res.sendFile(path.join(clientBuildPath, 'index.html'));
  });
}

// Middleware para rotas não encontradas (principalmente rotas da API)
app.use(notFound);
app.use(errorHandler);

// Configurar handlers de colaboração WebSocket
setupCollaborationHandlers(io);

server.listen(PORT as number, HOST as string, async () => {
  await connectDatabase();
  
  // Obter IP da máquina na rede local
  const networkInterfaces = os.networkInterfaces();
  const localIPs: string[] = [];
  
  Object.keys(networkInterfaces).forEach((interfaceName) => {
    const addresses = networkInterfaces[interfaceName];
    if (addresses) {
      addresses.forEach((address) => {
        // Compatível com Node.js antigo (family === 'IPv4') e novo (family === 4)
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
