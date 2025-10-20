import { PrismaClient } from '@prisma/client';

// Configuração do banco de dados
export const config = {
  database: {
    url: process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/musiccollab',
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  server: {
    port: process.env.PORT || 3001,
    nodeEnv: process.env.NODE_ENV || 'development',
  },
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  },
  socket: {
    corsOrigin: process.env.SOCKET_CORS_ORIGIN || 'http://localhost:3000',
  },
  upload: {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '50000000'), // 50MB
    allowedMimeTypes: ['audio/mpeg', 'audio/wav', 'audio/flac', 'audio/aac'],
    uploadPath: process.env.UPLOAD_PATH || './uploads',
  }
};

// Instância do Prisma Client
export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
});

// Função para conectar ao banco
export const connectDatabase = async () => {
  try {
    await prisma.$connect();
    console.log('Conectado ao banco de dados PostgreSQL');
  } catch (error) {
    console.error('Erro ao conectar ao banco de dados:', error);
    process.exit(1);
  }
};

// Função para desconectar do banco
export const disconnectDatabase = async () => {
  await prisma.$disconnect();
  console.log('📡 Desconectado do banco de dados');
};
