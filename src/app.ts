// src/app.ts - MODIFICADO CON SISTEMA DE LIMPIEZA DE SANCIONES
import { Server } from './presentation/server';
import { envs } from './config';
import { Dependencies } from './infrastructure/dependencies';
// ✅ IMPORTAR EL NUEVO TASK
import { SanctionsCleanupTask } from './infrastructure/tasks/sanctions-cleanup.task';

// ✅ VARIABLE GLOBAL PARA EL TASK (para poder limpiarlo en shutdown)
let sanctionsCleanupTask: SanctionsCleanupTask | null = null;

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

    // ✅ **NUEVO**: INICIALIZAR SISTEMA DE LIMPIEZA DE SANCIONES
    if (envs.NODE_ENV !== 'test') { // No ejecutar en tests
      console.log('⏰ Initializing sanctions cleanup system...');
      sanctionsCleanupTask = new SanctionsCleanupTask();
      
      // Configurar limpieza automática cada 30 minutos
      sanctionsCleanupTask.schedulePeriodicCleanup(30);
      
      console.log('✅ Sanctions cleanup system initialized');
    }

    // ✅ EL SERVIDOR AHORA SE MANTIENE CORRIENDO
    console.log('✅ Server is running and ready to accept connections');
    console.log('📊 Active systems:');
    console.log('   🌐 HTTP Server');
    console.log('   🗄️ Database Connection');
    console.log('   🧹 Sanctions Cleanup (every 30min)');
    console.log('   📧 Email Service');

  } catch (error) {
    console.error('❌ Fatal error starting application:', error);
    
    // ✅ CERRAR CONEXIONES LIMPIAMENTE EN CASO DE ERROR
    try {
      await cleanup();
    } catch (cleanupError) {
      console.error('❌ Error during cleanup:', cleanupError);
    }
    
    process.exit(1);
  }
}

// ✅ FUNCIÓN DE LIMPIEZA MEJORADA
async function cleanup() {
  console.log('🧹 Cleaning up resources...');
  
  try {
    // Detener task de sanciones
    if (sanctionsCleanupTask) {
      console.log('🛑 Stopping sanctions cleanup task...');
      sanctionsCleanupTask.stop();
      sanctionsCleanupTask = null;
    }

    // Cerrar conexiones de BD
    console.log('🔌 Closing database connections...');
    await Dependencies.cleanup();
    
    console.log('✅ Cleanup completed successfully');
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    throw error;
  }
}

// ✅ MANEJO LIMPIO DE SEÑALES DE CIERRE
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
    await cleanup();
    console.log('👋 Server shutdown completed');
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
  } finally {
    process.exit(0);
  }
}

// ✅ INICIAR LA APLICACIÓN
main();