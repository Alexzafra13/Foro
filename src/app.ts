// src/app.ts - CORREGIDO PARA MANTENER SERVIDOR ACTIVO
import { Server } from './presentation/server';
import { envs } from './config';
import { Dependencies } from './infrastructure/dependencies';

async function main() {
  try {
    console.log('🚀 Starting Forum API...');

    // ✅ VERIFICAR VARIABLES DE ENTORNO CRÍTICAS
    if (!envs.POSTGRES_URL) {
      throw new Error('POSTGRES_URL environment variable is required');
    }
    if (!envs.JWT_SECRET) {
      throw new Error('JWT_SECRET environment variable is required');
    }

    console.log('📋 Environment variables loaded');

    // ✅ INICIALIZAR DEPENDENCIAS (INCLUYE CONEXIÓN A BD)
    console.log('🔧 Initializing dependencies...');
    await Dependencies.create();

    // ✅ INICIALIZAR SERVIDOR
    console.log('🌐 Starting server...');
    const server = new Server(envs.PORT);
    await server.start();

    // ✅ EL SERVIDOR AHORA SE MANTIENE CORRIENDO
    console.log('✅ Server is running and ready to accept connections');

  } catch (error) {
    console.error('❌ Fatal error starting application:', error);
    
    // ✅ CERRAR CONEXIONES LIMPIAMENTE EN CASO DE ERROR
    try {
      await Dependencies.cleanup();
    } catch (cleanupError) {
      console.error('❌ Error during cleanup:', cleanupError);
    }
    
    process.exit(1);
  }
}

// ✅ MANEJO LIMPIO DE SEÑALES DE CIERRE (SOLO CUANDO REALMENTE SE CIERRE)
process.on('SIGINT', async () => {
  console.log('\n🔄 Graceful shutdown initiated (SIGINT)...');
  await shutdown();
});

process.on('SIGTERM', async () => {
  console.log('\n🔄 Graceful shutdown initiated (SIGTERM)...');
  await shutdown();
});

// ✅ SOLO MANEJAR ERRORES CRÍTICOS, NO EXITS NORMALES
process.on('uncaughtException', async (error) => {
  console.error('❌ Uncaught Exception:', error);
  await shutdown();
  process.exit(1);
});

process.on('unhandledRejection', async (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  await shutdown();
  process.exit(1);
});

async function shutdown() {
  try {
    console.log('🧹 Cleaning up database connections...');
    await Dependencies.cleanup();
    console.log('✅ Cleanup completed');
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
  } finally {
    // Solo exit aquí cuando realmente queremos cerrar
    process.exit(0);
  }
}

// ✅ INICIAR LA APLICACIÓN
main();