import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  await prisma.track.deleteMany();
  await prisma.projectCollaborator.deleteMany();
  await prisma.project.deleteMany();
  await prisma.user.deleteMany();

  const hashedPassword = await bcrypt.hash('123456', 10);

  const user1 = await prisma.user.create({
    data: {
      email: 'admin@musiccollab.com',
      password: hashedPassword,
      name: 'Administrador',
    },
  });

  const user2 = await prisma.user.create({
    data: {
      email: 'musician@musiccollab.com',
      password: hashedPassword,
      name: 'Músico Exemplo',
    },
  });

  const user3 = await prisma.user.create({
    data: {
      email: 'producer@musiccollab.com',
      password: hashedPassword,
      name: 'Produtor Musical',
    },
  });

  const project1 = await prisma.project.create({
    data: {
      title: 'Álbum Colaborativo',
      status: 'IN_PROGRESS',
      ownerId: user1.id,
    },
  });

  const project2 = await prisma.project.create({
    data: {
      title: 'Single Experimental',
      status: 'DRAFT',
      ownerId: user2.id,
    },
  });

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

  console.log('Seed executado com sucesso!');
}

main()
  .catch(() => {
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
