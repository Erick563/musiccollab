import { PrismaClient } from '@prisma/client';

export const config = {
  database: {
    url: 'postgresql://musiccollab_db_user:aG3cJmM93Io6VSUAOCYHGLsqcmM6WGuV@dpg-d4qp1d95pdvs738rvmp0-a.virginia-postgres.render.com/musiccollab_db',
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

export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
});

export const connectDatabase = async () => {
  try {
    console.log('🔄 Conectando ao banco de dados...');
    await prisma.$connect();
    console.log('✅ Conectado ao banco de dados com sucesso!');
  } catch (error) {
    console.error('❌ Erro ao conectar ao banco de dados:', error);
    console.error('DATABASE_URL:', process.env.DATABASE_URL ? 'Definida' : 'NÃO DEFINIDA');
    throw error; // Lançar erro ao invés de exit(2) para ver a stack trace completa
  }
};

export const disconnectDatabase = async () => {
  await prisma.$disconnect();
};
