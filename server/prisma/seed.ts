import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed do banco de dados...');

  // Limpar dados existentes
  await prisma.notification.deleteMany();
  await prisma.message.deleteMany();
  await prisma.track.deleteMany();
  await prisma.projectCollaborator.deleteMany();
  await prisma.project.deleteMany();
  await prisma.user.deleteMany();

  // Criar usuários de exemplo
  const hashedPassword = await bcrypt.hash('123456', 10);

  const user1 = await prisma.user.create({
    data: {
      email: 'admin@musiccollab.com',
      username: 'admin',
      password: hashedPassword,
      name: 'Administrador',
      bio: 'Administrador da plataforma MusicCollab',
    },
  });

  const user2 = await prisma.user.create({
    data: {
      email: 'musician@musiccollab.com',
      username: 'musician',
      password: hashedPassword,
      name: 'Músico Exemplo',
      bio: 'Produtor musical e compositor',
    },
  });

  const user3 = await prisma.user.create({
    data: {
      email: 'producer@musiccollab.com',
      username: 'producer',
      password: hashedPassword,
      name: 'Produtor Musical',
      bio: 'Especialista em produção e mixagem',
    },
  });

  // Criar projetos de exemplo
  const project1 = await prisma.project.create({
    data: {
      title: 'Álbum Colaborativo',
      description: 'Um álbum criado em colaboração entre múltiplos artistas',
      genre: 'Pop Rock',
      isPublic: true,
      status: 'IN_PROGRESS',
      ownerId: user1.id,
    },
  });

  const project2 = await prisma.project.create({
    data: {
      title: 'Single Experimental',
      description: 'Experimentação com novos sons e técnicas',
      genre: 'Electronic',
      isPublic: false,
      status: 'DRAFT',
      ownerId: user2.id,
    },
  });

  // Adicionar colaboradores aos projetos
  await prisma.projectCollaborator.create({
    data: {
      userId: user2.id,
      projectId: project1.id,
      role: 'COLLABORATOR',
    },
  });

  await prisma.projectCollaborator.create({
    data: {
      userId: user3.id,
      projectId: project1.id,
      role: 'COLLABORATOR',
    },
  });

  await prisma.projectCollaborator.create({
    data: {
      userId: user1.id,
      projectId: project2.id,
      role: 'ADMIN',
    },
  });

  // Criar algumas mensagens de exemplo
  await prisma.message.create({
    data: {
      content: 'Bem-vindos ao projeto! Vamos criar algo incrível juntos.',
      authorId: user1.id,
      projectId: project1.id,
    },
  });

  await prisma.message.create({
    data: {
      content: 'Já tenho algumas ideias para a melodia principal.',
      authorId: user2.id,
      projectId: project1.id,
    },
  });

  // Criar notificações de exemplo
  await prisma.notification.create({
    data: {
      title: 'Bem-vindo à MusicCollab!',
      message: 'Sua conta foi criada com sucesso. Comece explorando os projetos.',
      type: 'SUCCESS',
      userId: user1.id,
    },
  });

  await prisma.notification.create({
    data: {
      title: 'Novo colaborador',
      message: 'Você foi adicionado como colaborador no projeto "Álbum Colaborativo".',
      type: 'INFO',
      userId: user2.id,
    },
  });

  console.log('✅ Seed concluído com sucesso!');
  console.log(`👤 Usuários criados: ${await prisma.user.count()}`);
  console.log(`🎵 Projetos criados: ${await prisma.project.count()}`);
  console.log(`🤝 Colaborações criadas: ${await prisma.projectCollaborator.count()}`);
  console.log(`💬 Mensagens criadas: ${await prisma.message.count()}`);
  console.log(`🔔 Notificações criadas: ${await prisma.notification.count()}`);
}

main()
  .catch((e) => {
    console.error('❌ Erro durante o seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
