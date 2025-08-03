// src/infrastructure/database.ts - VERSIÓN FINAL SIMPLE Y ROBUSTA
import { PrismaClient } from '@prisma/client';

// ✅ CONFIGURACIÓN OPTIMIZADA PARA PGBOUNCER + ALTO TRÁFICO
const createPrismaClient = () => {
  return new PrismaClient({
    datasources: {
      db: {
        url: process.env.POSTGRES_URL, // ✅ Apunta a PgBouncer (puerto 6432)
      },
    },
    
    // ✅ LOGS SIMPLES - SIN EVENTOS PARA EVITAR PROBLEMAS DE TIPOS
    log: process.env.NODE_ENV === 'development' 
      ? (process.env.ENABLE_QUERY_LOGGING === 'true' 
          ? ['query', 'info', 'warn', 'error']
          : ['info', 'warn', 'error']
        )
      : ['error'],
    
    // ✅ CONFIGURACIÓN DE ERROR HANDLING
    errorFormat: 'minimal',
  });
};

// ✅ PATRÓN GLOBAL RECOMENDADO POR PRISMA
declare global {
  var __prisma: PrismaClient | undefined;
}

export const prisma = globalThis.__prisma || createPrismaClient();

// ✅ SOLO EN DESARROLLO, REUTILIZAR LA INSTANCIA
if (process.env.NODE_ENV !== 'production') {
  globalThis.__prisma = prisma;
}

// ✅ FUNCIÓN PARA HEALTH CHECK
export async function checkDatabaseHealth(): Promise<{
  status: 'healthy' | 'unhealthy';
  pgbouncer: boolean;
  postgres: boolean;
  latency: number;
}> {
  const startTime = Date.now();
  
  try {
    // Test básico de conexión
    await prisma.$queryRaw`SELECT 1 as test`;
    
    // Test específico de PgBouncer
    const pgbouncerTest = await testPgBouncerConnection();
    
    const latency = Date.now() - startTime;
    
    return {
      status: 'healthy',
      pgbouncer: pgbouncerTest,
      postgres: true,
      latency
    };
  } catch (error) {
    console.error('❌ Database health check failed:', error);
    return {
      status: 'unhealthy',
      pgbouncer: false,
      postgres: false,
      latency: Date.now() - startTime
    };
  }
}

// ✅ FUNCIÓN PARA TESTEAR PGBOUNCER
async function testPgBouncerConnection(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SHOW POOLS`;
    console.log('✅ PgBouncer connection confirmed');
    return true;
  } catch (error) {
    console.warn('⚠️  PgBouncer not detected, using direct PostgreSQL connection');
    return false;
  }
}

// ✅ FUNCIÓN PARA ESTADÍSTICAS SIMPLES
export async function getConnectionStats(): Promise<{
  activeConnections: number;
  totalConnections: number;
}> {
  try {
    const pgStats = await prisma.$queryRaw`
      SELECT count(*) as active_connections 
      FROM pg_stat_activity 
      WHERE state = 'active'
    ` as any[];

    const totalConnections = await prisma.$queryRaw`
      SELECT count(*) as total_connections 
      FROM pg_stat_activity
    ` as any[];

    return {
      activeConnections: Number(pgStats[0]?.active_connections || 0),
      totalConnections: Number(totalConnections[0]?.total_connections || 0),
    };
  } catch (error) {
    console.error('❌ Error getting connection stats:', error);
    return {
      activeConnections: 0,
      totalConnections: 0
    };
  }
}

// ✅ FUNCIÓN LIMPIA DE DESCONEXIÓN
export async function disconnectDatabase(): Promise<void> {
  try {
    await prisma.$disconnect();
    console.log('✅ Database disconnected cleanly');
  } catch (error) {
    console.error('❌ Error disconnecting database:', error);
  }
}

// ✅ MANEJO DE SEÑALES DE CIERRE
process.on('beforeExit', async () => {
  await disconnectDatabase();
});

process.on('SIGINT', async () => {
  await disconnectDatabase();
});

process.on('SIGTERM', async () => {
  await disconnectDatabase();
});