import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import os from 'os';

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

// Configurar Socket.IO para aceitar conexões da rede local e produção
const socketCorsOrigin = process.env.SOCKET_CORS_ORIGIN;
const allowedSocketOrigins = ['https://musiccollab-frontend.onrender.com'];

if (socketCorsOrigin) {
  allowedSocketOrigins.push(...socketCorsOrigin.split(',').map(o => o.trim()));
}

const io = new Server(server, {
  cors: {
    origin: allowedSocketOrigins,
    methods: ["GET", "POST"],
    credentials: true
  },
  // Configurações para evitar conexões penduradas e timeouts
  pingTimeout: 60000, // 60 segundos - tempo para aguardar resposta do ping
  pingInterval: 25000, // 25 segundos - intervalo entre pings
  connectTimeout: 45000, // 45 segundos - timeout para conexão inicial
  maxHttpBufferSize: 1e8, // 100 MB - limite de dados por mensagem
  // Configurações de transporte - permitir polling e websocket
  transports: ['polling', 'websocket'],
  allowUpgrades: true,
  upgradeTimeout: 10000,
  // Configurações adicionais de performance
  perMessageDeflate: {
    threshold: 1024 // Comprimir mensagens maiores que 1KB
  },
  // Configurações de cookie para autenticação (se necessário)
  cookie: false,
  // Configurações adicionais para produção
  serveClient: false,
  // Path padrão
  path: '/socket.io/'
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

// Configurar CORS para aceitar requisições da rede local e produção
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
    
    // Adicionar origens de produção permitidas
    const allowedProductionOrigins = [
      'https://musiccollab-frontend.onrender.com'
    ];
    
    // Se CORS_ORIGIN estiver definido (para permitir outros domínios), também permitir
    if (process.env.CORS_ORIGIN) {
      const origins = process.env.CORS_ORIGIN.split(',');
      origins.forEach(o => allowedProductionOrigins.push(o.trim()));
    }
    
    // Se SOCKET_CORS_ORIGIN estiver definido, também permitir
    if (process.env.SOCKET_CORS_ORIGIN) {
      const origins = process.env.SOCKET_CORS_ORIGIN.split(',');
      origins.forEach(o => allowedProductionOrigins.push(o.trim()));
    }
    
    // Verificar se a origin está nas listas permitidas
    const isAllowedPattern = allowedOrigins.some(pattern => pattern.test(origin));
    const isAllowedExact = allowedProductionOrigins.includes(origin);
    
    if (isAllowedPattern || isAllowedExact) {
      console.log('[CORS] Origin permitida:', origin);
      callback(null, true); // Allow the request
    } else {
      console.log('[CORS] Origin BLOQUEADA:', origin);
      callback(new Error('Not allowed by CORS')); // Send error with proper headers
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 200 // For legacy browsers
};

app.use(cors(corsOptions));

// Handle preflight requests explicitly
app.options('*', cors(corsOptions));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(morgan('combined', { stream: { write: (message: string) => logger.info(message.trim()) } }));

// Health check e status endpoints
app.get('/health', (req: Request, res: Response) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

app.get('/api/status', (req: Request, res: Response) => {
  const connectedSockets = io.sockets.sockets.size;
  res.json({ 
    status: 'ok', 
    socketio: {
      connected: connectedSockets,
      transports: ['polling', 'websocket']
    },
    timestamp: new Date().toISOString()
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/tracks', trackRoutes);

// Middleware para rotas não encontradas
app.use(notFound);
app.use(errorHandler);

// Configurar handlers de colaboração WebSocket
setupCollaborationHandlers(io);

const startServer = async () => {
  try {
    // Conectar ao banco ANTES de iniciar o servidor
    await connectDatabase();
    
    server.listen(PORT as number, HOST as string, () => {
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
  } catch (error) {
    logger.error('❌ Falha ao iniciar servidor:', error);
    logger.error('💡 Verifique se:');
    logger.error('   1. A variável DATABASE_URL está configurada corretamente');
    logger.error('   2. O banco de dados PostgreSQL está acessível');
    logger.error('   3. As credenciais de conexão estão corretas');
    process.exit(1);
  }
};

// Iniciar o servidor
startServer();

export { app, server, io };
