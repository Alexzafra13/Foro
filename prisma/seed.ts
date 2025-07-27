// prisma/seed.ts - CORREGIDO
import { PrismaClient } from '@prisma/client';
import { genSaltSync, hashSync } from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seeding con categorías...');

  try {
    // =========================================
    // 1. ROLES DEL SISTEMA
    // =========================================
    
    console.log('📝 Insertando roles...');
    const rolesData = ['admin', 'moderator', 'user'];

    for (const roleName of rolesData) {
      await prisma.role.upsert({
        where: { name: roleName },
        update: {},
        create: { name: roleName },
      });
    }

    console.log('✅ Roles insertados correctamente');

    // =========================================
    // 2. CATEGORÍAS DE CANALES
    // =========================================
    
    console.log('📁 Creando categorías...');
    
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

    console.log('✅ Categorías creadas correctamente');

    // =========================================
    // 3. OBTENER IDs DE CATEGORÍAS
    // =========================================
    
    const generalCategory = await prisma.category.findUnique({ where: { name: 'General' } });
    const techCategory = await prisma.category.findUnique({ where: { name: 'Tecnología' } });
    const entertainmentCategory = await prisma.category.findUnique({ where: { name: 'Entretenimiento' } });
    const gamingCategory = await prisma.category.findUnique({ where: { name: 'Gaming' } });
    const creativeCategory = await prisma.category.findUnique({ where: { name: 'Creatividad' } });
    const variosCategory = await prisma.category.findUnique({ where: { name: 'Varios' } });
    const staffCategory = await prisma.category.findUnique({ where: { name: 'Staff' } });

    if (!generalCategory || !techCategory || !entertainmentCategory || 
        !gamingCategory || !creativeCategory || !variosCategory || !staffCategory) {
      throw new Error('Error: No se pudieron crear todas las categorías');
    }

    // =========================================
    // 4. CANALES ORGANIZADOS POR CATEGORÍA
    // =========================================
    
    console.log('📝 Creando canales organizados...');

    const channelsData = [
      // 🏠 GENERAL
      { 
        name: 'general', 
        categoryId: generalCategory.id,
        description: 'Discusiones generales y presentaciones', 
        icon: '💬',
        position: 1,
        isPrivate: false,
        isVisible: true
      },
      { 
        name: 'anuncios', 
        categoryId: generalCategory.id,
        description: 'Anuncios importantes del foro', 
        icon: '📢',
        position: 2,
        isPrivate: false,
        isVisible: true
      },
      { 
        name: 'sugerencias', 
        categoryId: generalCategory.id,
        description: 'Sugerencias para mejorar el foro', 
        icon: '💡',
        position: 3,
        isPrivate: false,
        isVisible: true
      },

      // 💻 TECNOLOGÍA
      { 
        name: 'programacion', 
        categoryId: techCategory.id,
        description: 'Desarrollo, frameworks y lenguajes', 
        icon: '👨‍💻',
        position: 1,
        isPrivate: false,
        isVisible: true
      },
      { 
        name: 'hardware', 
        categoryId: techCategory.id,
        description: 'PCs, componentes y builds', 
        icon: '🔧',
        position: 2,
        isPrivate: false,
        isVisible: true
      },
      { 
        name: 'linux', 
        categoryId: techCategory.id,
        description: 'Distribuciones y open source', 
        icon: '🐧',
        position: 3,
        isPrivate: false,
        isVisible: true
      },

      // 🎬 ENTRETENIMIENTO
      { 
        name: 'peliculas-series', 
        categoryId: entertainmentCategory.id,
        description: 'Recomendaciones y reseñas', 
        icon: '📺',
        position: 1,
        isPrivate: false,
        isVisible: true
      },
      { 
        name: 'enlaces-media', 
        categoryId: entertainmentCategory.id,
        description: 'Enlaces a contenido multimedia', 
        icon: '🔗',
        position: 2,
        isPrivate: false,
        isVisible: true
      },
      { 
        name: 'libros', 
        categoryId: entertainmentCategory.id,
        description: 'Literatura y recomendaciones', 
        icon: '📚',
        position: 3,
        isPrivate: false,
        isVisible: true
      },

      // 🎮 GAMING
      { 
        name: 'juegos-pc', 
        categoryId: gamingCategory.id,
        description: 'Steam, mods y gaming en PC', 
        icon: '🖥️',
        position: 1,
        isPrivate: false,
        isVisible: true
      },
      { 
        name: 'juegos-console', 
        categoryId: gamingCategory.id,
        description: 'PlayStation, Xbox, Nintendo', 
        icon: '🎮',
        position: 2,
        isPrivate: false,
        isVisible: true
      },
      { 
        name: 'juegos-mobile', 
        categoryId: gamingCategory.id,
        description: 'Gaming móvil y casual', 
        icon: '📱',
        position: 3,
        isPrivate: false,
        isVisible: true
      },

      // 🎨 CREATIVIDAD
      { 
        name: 'arte-diseño', 
        categoryId: creativeCategory.id,
        description: 'Arte digital y diseño gráfico', 
        icon: '🎨',
        position: 1,
        isPrivate: false,
        isVisible: true
      },
      { 
        name: 'musica', 
        categoryId: creativeCategory.id,
        description: 'Géneros, artistas y recomendaciones', 
        icon: '🎵',
        position: 2,
        isPrivate: false,
        isVisible: true
      },

      // 🌍 VARIOS
      { 
        name: 'deportes', 
        categoryId: variosCategory.id,
        description: 'Fútbol, baloncesto, esports', 
        icon: '⚽',
        position: 1,
        isPrivate: false,
        isVisible: true
      },
      { 
        name: 'viajes', 
        categoryId: variosCategory.id,
        description: 'Destinos y experiencias', 
        icon: '✈️',
        position: 2,
        isPrivate: false,
        isVisible: true
      },
      { 
        name: 'cocina', 
        categoryId: variosCategory.id,
        description: 'Recetas y gastronomía', 
        icon: '👨‍🍳',
        position: 3,
        isPrivate: false,
        isVisible: true
      },
      { 
        name: 'off-topic', 
        categoryId: variosCategory.id,
        description: 'Conversaciones casuales', 
        icon: '💭',
        position: 4,
        isPrivate: false,
        isVisible: true
      },

      // 🔒 STAFF
      { 
        name: 'moderadores', 
        categoryId: staffCategory.id,
        description: 'Coordinación del equipo', 
        icon: '👮',
        position: 1,
        isPrivate: true,
        isVisible: true
      },
      { 
        name: 'admin', 
        categoryId: staffCategory.id,
        description: 'Gestión administrativa', 
        icon: '⚙️',
        position: 2,
        isPrivate: true,
        isVisible: true
      },
    ];

    for (const channelData of channelsData) {
      await prisma.channel.upsert({
        where: { name: channelData.name },
        update: { 
          categoryId: channelData.categoryId,
          description: channelData.description,
          icon: channelData.icon,
          position: channelData.position,
          isPrivate: channelData.isPrivate,
          isVisible: channelData.isVisible
        },
        create: {
          name: channelData.name,
          categoryId: channelData.categoryId,
          description: channelData.description,
          icon: channelData.icon,
          position: channelData.position,
          isPrivate: channelData.isPrivate,
          isVisible: channelData.isVisible
        },
      });
    }

    console.log('✅ Canales organizados creados correctamente');

    // =========================================
    // 5. USUARIOS DE DESARROLLO
    // =========================================
    
    if (process.env.NODE_ENV === 'development') {
      console.log('👤 Creando usuarios de desarrollo...');
      
      const adminRole = await prisma.role.findUnique({ where: { name: 'admin' } });
      const moderatorRole = await prisma.role.findUnique({ where: { name: 'moderator' } });
      const userRole = await prisma.role.findUnique({ where: { name: 'user' } });
      
      if (adminRole && moderatorRole && userRole) {
        // Generar hash correcto para admin123
        const salt = genSaltSync(12);
        const correctPasswordHash = hashSync('admin123', salt);
        
        console.log('🔐 Generando hash correcto para contraseñas...');
        
        // Usuario admin
        await prisma.user.upsert({
          where: { email: 'admin@foro.local' },
          update: {},
          create: {
            username: 'admin',
            email: 'admin@foro.local',
            passwordHash: correctPasswordHash,
            roleId: adminRole.id,
            reputation: 1000,
          },
        });

        // Usuario moderador
        await prisma.user.upsert({
          where: { email: 'mod@foro.local' },
          update: {},
          create: {
            username: 'moderador',
            email: 'mod@foro.local',
            passwordHash: correctPasswordHash,
            roleId: moderatorRole.id,
            reputation: 500,
          },
        });

        // Usuario normal
        await prisma.user.upsert({
          where: { email: 'user@foro.local' },
          update: {},
          create: {
            username: 'usuario_prueba',
            email: 'user@foro.local',
            passwordHash: correctPasswordHash,
            roleId: userRole.id,
            reputation: 100,
          },
        });

        console.log('✅ Usuarios de desarrollo creados:');
        console.log('   • admin@foro.local (password: admin123)');
        console.log('   • mod@foro.local (password: admin123)');
        console.log('   • user@foro.local (password: admin123)');
      }
    }

    // =========================================
    // 6. POSTS DE BIENVENIDA (OPCIONAL)
    // =========================================
    
    if (process.env.NODE_ENV === 'development') {
      console.log('📝 Creando posts de bienvenida...');
      
      const generalChannel = await prisma.channel.findFirst({ 
        where: { name: 'general' } 
      });
      const anunciosChannel = await prisma.channel.findFirst({ 
        where: { name: 'anuncios' } 
      });
      const adminUser = await prisma.user.findFirst({ 
        where: { email: 'admin@foro.local' } 
      });
      
      if (generalChannel && anunciosChannel && adminUser) {
        // Post de bienvenida en anuncios
        await prisma.post.create({
          data: {
            channelId: anunciosChannel.id,
            authorId: adminUser.id,
            title: '¡Bienvenidos al Foro!',
            content: `¡Hola y bienvenidos a nuestro foro organizado!

**📋 Normas básicas:**
• Mantén el respeto hacia otros usuarios
• Publica en el canal apropiado según la categoría
• No spam ni contenido ofensivo
• ¡Diviértete y comparte conocimientos!

**📁 Nuestras categorías:**
• 🏠 **General**: Presentaciones y discusiones generales
• 💻 **Tecnología**: Programación, hardware, Linux
• 🎬 **Entretenimiento**: Películas, series, libros, enlaces
• 🎮 **Gaming**: Juegos de PC, consola y móvil
• 🎨 **Creatividad**: Arte, música y expresión
• 🌍 **Varios**: Deportes, viajes, cocina y más

¡Esperamos que disfrutes tu estancia aquí!`,
            isPinned: true,
          },
        });

        // Post en general
        await prisma.post.create({
          data: {
            channelId: generalChannel.id,
            authorId: adminUser.id,
            title: 'Preséntate aquí',
            content: '¡Nuevos usuarios! Este es el lugar perfecto para presentarse y conocer a la comunidad. Cuéntanos un poco sobre ti, tus intereses y qué te trae por aquí. ¡Bienvenidos!',
            isPinned: true,
          },
        });

        console.log('✅ Posts de bienvenida creados');
      }
    }

    // =========================================
    // 7. RESUMEN FINAL
    // =========================================
    
    const stats = {
      roles: await prisma.role.count(),
      categories: await prisma.category.count(),
      channels: await prisma.channel.count(),
      users: await prisma.user.count(),
      posts: await prisma.post.count(),
    };

    console.log('\n🎉 ¡FORO ORGANIZADO CREADO EXITOSAMENTE!');
    console.log('📊 ESTADÍSTICAS:');
    console.log(`   🔐 ${stats.roles} roles`);
    console.log(`   📁 ${stats.categories} categorías`);
    console.log(`   📺 ${stats.channels} canales`);
    console.log(`   👥 ${stats.users} usuarios`);
    console.log(`   📝 ${stats.posts} posts`);
    
    if (process.env.NODE_ENV === 'development') {
      console.log('\n🔑 ACCESOS DE DESARROLLO:');
      console.log('   Admin: admin@foro.local / admin123');
      console.log('   Mod:   mod@foro.local / admin123');  
      console.log('   User:  user@foro.local / admin123');
      console.log('\n💡 Tip: Usa "npx prisma studio" para ver los datos');
    }

  } catch (error) {
    console.error('❌ Error durante el seeding:', error);
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
    console.log('🔌 Conexión a base de datos cerrada');
  });