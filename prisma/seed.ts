import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seeding...');

  // Verificar si ya existen roles
  const existingRoles = await prisma.role.count();
  
  if (existingRoles > 0) {
    console.log('✅ Roles ya existen, saltando seed');
    return;
  }

  // Crear roles básicos
  const roles = await prisma.role.createMany({
    data: [
      { name: 'admin' },
      { name: 'moderator' },
      { name: 'user' }
    ],
    skipDuplicates: true
  });

  console.log('✅ Roles creados:', roles.count);
  
  // Mostrar roles creados
  const allRoles = await prisma.role.findMany();
  console.log('📋 Roles en BD:', allRoles);
}

main()
  .catch((e) => {
    console.error('❌ Error en seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });