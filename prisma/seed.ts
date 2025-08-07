// prisma/seed.ts - VERSIÓN INTELIGENTE (ejecuta siempre que no haya datos)

import { PrismaClient } from '@prisma/client';
import { genSaltSync, hashSync } from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed inteligente...');

  try {
    // =========================================
    // 🎯 VERIFICAR SI YA HAY DATOS
    // =========================================
    
    const existingUsers = await prisma.user.count();
    const existingRoles = await prisma.role.count();
    const existingCategories = await prisma.category.count();
    
    console.log(`📊 Estado actual: ${existingRoles} roles, ${existingCategories} categorías, ${existingUsers} usuarios`);
    
    // =========================================
    // 1. ROLES DEL SISTEMA (siempre verificar)
    // =========================================
    
    console.log('📝 Verificando roles...');
    const rolesData = ['admin', 'moderator', 'user'];

    for (const roleName of rolesData) {
      await prisma.role.upsert({
        where: { name: roleName },
        update: {},
        create: { name: roleName },
      });
    }
    console.log('✅ Roles verificados');

    // =========================================
    // 2. CATEGORÍAS (siempre verificar)
    // =========================================
    
    console.log('📁 Verificando categorías...');
    
    const categoriesData = [
      { 
        name: 'General', 
        description: 'Canales generales del foro',
        icon: '🏠', 
        position: 1,
        isVisible: true
      },
      { 
        name: 'Tecnología', 
        description: 'Programación, hardware y tecnología',
        icon: '💻', 
        position: 2,
        isVisible: true
      },
      { 
        name: 'Entretenimiento', 
        description: 'Películas, series, libros y multimedia',
        icon: '🎬', 
        position: 3,
        isVisible: true
      },
      { 
        name: 'Gaming', 
        description: 'Videojuegos en todas sus formas',
        icon: '🎮', 
        position: 4,
        isVisible: true
      },
      { 
        name: 'Creatividad', 
        description: 'Arte, música y expresión creativa',
        icon: '🎨', 
        position: 5,
        isVisible: true
      },
      { 
        name: 'Varios', 
        description: 'Otros temas de interés',
        icon: '🌍', 
        position: 6,
        isVisible: true
      },
      { 
        name: 'Staff', 
        description: 'Canales privados del equipo',
        icon: '🔒', 
        position: 99,
        isVisible: true
      },
    ];

    for (const categoryData of categoriesData) {
      await prisma.category.upsert({
        where: { name: categoryData.name },
        update: { 
          description: categoryData.description,
          icon: categoryData.icon,
          position: categoryData.position,
          isVisible: categoryData.isVisible
        },
        create: {
          name: categoryData.name,
          description: categoryData.description,
          icon: categoryData.icon,
          position: categoryData.position,
          isVisible: categoryData.isVisible
        },
      });
    }
    console.log('✅ Categorías verificadas');

    // =========================================
    // 3. CANALES (solo si no existen)
    // =========================================
    
    const existingChannels = await prisma.channel.count();
    
    if (existingChannels === 0) {
      console.log('📝 Creando canales (primera vez)...');
      
      // Obtener IDs de categorías
      const categories = await prisma.category.findMany();
      const categoryMap = Object.fromEntries(categories.map(cat => [cat.name, cat.id]));
      
      const channelsData = [
        // 🏠 GENERAL
        { name: 'general', category: 'General', description: 'Discusiones generales y presentaciones', icon: '💬', position: 1 },
        { name: 'anuncios', category: 'General', description: 'Anuncios importantes del foro', icon: '📢', position: 2 },
        { name: 'sugerencias', category: 'General', description: 'Sugerencias para mejorar el foro', icon: '💡', position: 3 },
        
        // 💻 TECNOLOGÍA
        { name: 'programacion', category: 'Tecnología', description: 'Desarrollo, frameworks y lenguajes', icon: '👨‍💻', position: 1 },
        { name: 'hardware', category: 'Tecnología', description: 'PCs, componentes y builds', icon: '🔧', position: 2 },
        { name: 'linux', category: 'Tecnología', description: 'Distribuciones y open source', icon: '🐧', position: 3 },
        
        // 🎬 ENTRETENIMIENTO
        { name: 'peliculas-series', category: 'Entretenimiento', description: 'Recomendaciones y reseñas', icon: '📺', position: 1 },
        { name: 'enlaces-media', category: 'Entretenimiento', description: 'Enlaces a contenido multimedia', icon: '🔗', position: 2 },
        { name: 'libros', category: 'Entretenimiento', description: 'Literatura y recomendaciones', icon: '📚', position: 3 },
        
        // 🎮 GAMING
        { name: 'juegos-pc', category: 'Gaming', description: 'Steam, mods y gaming en PC', icon: '🖥️', position: 1 },
        { name: 'juegos-console', category: 'Gaming', description: 'PlayStation, Xbox, Nintendo', icon: '🎮', position: 2 },
        { name: 'juegos-mobile', category: 'Gaming', description: 'Gaming móvil y casual', icon: '📱', position: 3 },
        
        // 🎨 CREATIVIDAD
        { name: 'arte-diseño', category: 'Creatividad', description: 'Arte digital y diseño gráfico', icon: '🎨', position: 1 },
        { name: 'musica', category: 'Creatividad', description: 'Géneros, artistas y recomendaciones', icon: '🎵', position: 2 },
        
        // 🌍 VARIOS
        { name: 'deportes', category: 'Varios', description: 'Fútbol, baloncesto, esports', icon: '⚽', position: 1 },
        { name: 'viajes', category: 'Varios', description: 'Destinos y experiencias', icon: '✈️', position: 2 },
        { name: 'cocina', category: 'Varios', description: 'Recetas y gastronomía', icon: '👨‍🍳', position: 3 },
        { name: 'off-topic', category: 'Varios', description: 'Conversaciones casuales', icon: '💭', position: 4 },
        
        // 🔒 STAFF
        { name: 'moderadores', category: 'Staff', description: 'Coordinación del equipo', icon: '👮', position: 1, isPrivate: true },
        { name: 'admin', category: 'Staff', description: 'Gestión administrativa', icon: '⚙️', position: 2, isPrivate: true },
      ];

      for (const channelData of channelsData) {
        await prisma.channel.create({
          data: {
            name: channelData.name,
            categoryId: categoryMap[channelData.category],
            description: channelData.description,
            icon: channelData.icon,
            position: channelData.position,
            isPrivate: channelData.isPrivate || false,
            isVisible: true
          }
        });
      }
      
      console.log('✅ Canales creados');
    } else {
      console.log(`ℹ️  Ya existen ${existingChannels} canales, omitiendo creación`);
    }

    // =========================================
    // 4. USUARIOS ADMIN (solo si no hay usuarios)
    // =========================================
    
    if (existingUsers === 0) {
      console.log('👤 Creando usuarios iniciales...');
      
      const adminRole = await prisma.role.findUnique({ where: { name: 'admin' } });
      const moderatorRole = await prisma.role.findUnique({ where: { name: 'moderator' } });
      const userRole = await prisma.role.findUnique({ where: { name: 'user' } });
      
      if (adminRole && moderatorRole && userRole) {
        const salt = genSaltSync(12);
        const adminPasswordHash = hashSync('admin123', salt);
        const verificationDate = new Date();
        
        // ✅ Usuario admin
        await prisma.user.create({
          data: {
            username: 'admin',
            email: 'admin@foro.local',
            passwordHash: adminPasswordHash,
            roleId: adminRole.id,
            reputation: 1000,
            isEmailVerified: true,
            emailVerifiedAt: verificationDate,
          }
        });

        // ✅ Usuario moderador
        await prisma.user.create({
          data: {
            username: 'moderador',
            email: 'mod@foro.local',
            passwordHash: adminPasswordHash,
            roleId: moderatorRole.id,
            reputation: 500,
            isEmailVerified: true,
            emailVerifiedAt: verificationDate,
          }
        });

        // ✅ Usuario normal
        await prisma.user.create({
          data: {
            username: 'usuario_demo',
            email: 'user@foro.local',
            passwordHash: adminPasswordHash,
            roleId: userRole.id,
            reputation: 100,
            isEmailVerified: true,
            emailVerifiedAt: verificationDate,
          }
        });

        console.log('✅ Usuarios iniciales creados:');
        console.log('   • admin@foro.local (password: admin123) - Admin');
        console.log('   • mod@foro.local (password: admin123) - Moderador');
        console.log('   • user@foro.local (password: admin123) - Usuario');
      }
    } else {
      console.log(`ℹ️  Ya existen ${existingUsers} usuarios, omitiendo creación`);
    }

    // =========================================
    // 5. POSTS DE BIENVENIDA (solo si no hay posts)
    // =========================================
    
    const existingPosts = await prisma.post.count();
    
    if (existingPosts === 0) {
      console.log('📝 Creando posts de bienvenida...');
      
      const generalChannel = await prisma.channel.findFirst({ where: { name: 'general' } });
      const anunciosChannel = await prisma.channel.findFirst({ where: { name: 'anuncios' } });
      const adminUser = await prisma.user.findFirst({ where: { email: 'admin@foro.local' } });
      
      if (generalChannel && anunciosChannel && adminUser) {
        // Post de bienvenida
        await prisma.post.create({
          data: {
            channelId: anunciosChannel.id,
            authorId: adminUser.id,
            title: '¡Bienvenidos al Foro!',
            content: `¡Hola y bienvenidos a nuestro foro!

**📋 Normas básicas:**
• Respeta a otros usuarios
• Publica en el canal apropiado
• No spam ni contenido ofensivo
• ¡Diviértete y comparte!

**📁 Categorías disponibles:**
• 🏠 General • 💻 Tecnología • 🎬 Entretenimiento
• 🎮 Gaming • 🎨 Creatividad • 🌍 Varios • 🔒 Staff

¡Esperamos que disfrutes tu estancia aquí!`,
            isPinned: true,
          },
        });

        console.log('✅ Posts de bienvenida creados');
      }
    } else {
      console.log(`ℹ️  Ya existen ${existingPosts} posts, omitiendo posts de bienvenida`);
    }

    // =========================================
    // 7. RESUMEN FINAL
    // =========================================
    
    const finalStats = {
      roles: await prisma.role.count(),
      categories: await prisma.category.count(),
      channels: await prisma.channel.count(),
      users: await prisma.user.count(),
      posts: await prisma.post.count(),
    };

    console.log('\n🎉 SEED INTELIGENTE COMPLETADO');
    console.log('📊 ESTADÍSTICAS FINALES:');
    console.log(`   🔐 ${finalStats.roles} roles`);
    console.log(`   📁 ${finalStats.categories} categorías`);
    console.log(`   📺 ${finalStats.channels} canales`);
    console.log(`   👥 ${finalStats.users} usuarios`);
    console.log(`   📝 ${finalStats.posts} posts`);

    if (finalStats.users > 0) {
      console.log('\n🔑 USUARIOS DISPONIBLES:');
      console.log('   Admin: admin@foro.local / admin123');
      console.log('   Mod:   mod@foro.local / admin123');
      console.log('   User:  user@foro.local / admin123');
    }

  } catch (error) {
    console.error('❌ Error durante el seed:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error('❌ Error crítico:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    console.log('🔌 Desconectado de la base de datos');
  });