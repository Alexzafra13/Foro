// src/config/envs.ts - VERSIÓN CON FALLBACK DE BD + CORS AUTO-DETECCIÓN
import { execSync } from 'child_process';
import { networkInterfaces } from 'os';

interface EnvConfig {
  PORT: number;
  NODE_ENV: string;
  POSTGRES_URL: string;
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;
  BCRYPT_ROUNDS: number;
  
  // Gmail configuration
  MAILER_SERVICE: string;
  MAILER_EMAIL: string;
  MAILER_SECRET_KEY: string;
  
  // Frontend URL for verification links - CON AUTO-DETECCIÓN
  FRONTEND_URL: string;
  EMAIL_VERIFICATION_SECRET: string;
  
  // 🆕 CORS AUTO-DETECCIÓN
  ALLOWED_ORIGINS: string[];
}

const getEnvVar = (key: string, defaultValue?: string): string => {
  const value = process.env[key] || defaultValue;
  
  // En modo test, permite valores por defecto
  if (!value && process.env.NODE_ENV !== 'test') {
    throw new Error(`Variable de entorno ${key} es requerida`);
  }
  
  // Valores por defecto para tests
  if (!value && process.env.NODE_ENV === 'test') {
    const testDefaults: { [key: string]: string } = {
      'POSTGRES_URL': 'postgresql://test:test@localhost:5432/test_db',
      'MAILER_SERVICE': 'gmail',
      'MAILER_EMAIL': 'test@test.com',
      'MAILER_SECRET_KEY': 'testpass',
      'FRONTEND_URL': 'http://localhost:3000',
      'EMAIL_VERIFICATION_SECRET': 'test-verification-secret'
    };
    return testDefaults[key] || '';
  }
  
  return value || '';
};

// 🧠 FUNCIÓN DE AUTO-DETECCIÓN INTELIGENTE (TU CÓDIGO ORIGINAL)
const autoDetectFrontendUrl = (): string => {
  console.log('🔍 Auto-detectando FRONTEND_URL...');
  
  // 1. Si está definida explícitamente, usarla
  if (process.env.FRONTEND_URL) {
    console.log(`✅ FRONTEND_URL explícita: ${process.env.FRONTEND_URL}`);
    return process.env.FRONTEND_URL;
  }
  
  // 2. Auto-construcción basada en variables disponibles
  try {
    const port = process.env.FRONTEND_PORT || '9050';
    
    // Opción A: Si hay SERVER_IP configurado
    if (process.env.SERVER_IP && process.env.SERVER_IP !== 'localhost') {
      // Detectar si es un dominio o una IP
      const isIP = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(process.env.SERVER_IP);
      const isDomain = process.env.SERVER_IP.includes('.') && !isIP;
      
      let protocol = 'http';
      let finalHost = process.env.SERVER_IP;
      let finalPort = port;
      
      // Si es un dominio, probablemente use HTTPS
      if (isDomain) {
        protocol = 'https';
        // Los dominios con HTTPS normalmente no necesitan puerto
        if (port === '443') finalPort = '';
      }
      
      // Si es IP, usar HTTP con puerto
      if (isIP) {
        protocol = 'http';
      }
      
      const url = `${protocol}://${finalHost}${finalPort && finalPort !== '80' && finalPort !== '443' ? `:${finalPort}` : ''}`;
      console.log(`✅ Construido desde SERVER_IP: ${url}`);
      return url;
    }
    
    // Opción B: Auto-detectar IP de la red local
    try {
      const interfaces = networkInterfaces();
      for (const [name, ifaces] of Object.entries(interfaces)) {
        if (ifaces) {
          for (const iface of ifaces) {
            if (iface.family === 'IPv4' && !iface.internal && iface.address.startsWith('192.168.')) {
              const detectedIP = iface.address;
              const url = `http://${detectedIP}:${port}`;
              console.log(`✅ Auto-detectada IP local: ${url}`);
              return url;
            }
          }
        }
      }
    } catch (error) {
      console.log('⚠️ No se pudo auto-detectar IP local');
    }
    
    // Opción C: Detectar desde hostname del contenedor
    if (process.env.NODE_ENV === 'production') {
      try {
        const hostname = execSync('hostname 2>/dev/null || echo ""', 
          { encoding: 'utf8', timeout: 2000 }).trim();
        
        if (hostname && hostname !== 'localhost' && hostname.includes('.')) {
          const url = `https://${hostname}`;
          console.log(`✅ Detectado desde hostname: ${url}`);
          return url;
        }
      } catch (error) {
        // Continuar con fallback
      }
    }
    
    // Opción D: Fallback local
    const fallbackUrl = `http://localhost:${port}`;
    console.log(`⚠️ Usando fallback local: ${fallbackUrl}`);
    return fallbackUrl;
    
  } catch (error) {
    console.error('❌ Error en auto-detección:', error);
    return `http://localhost:${process.env.FRONTEND_PORT || '9050'}`;
  }
};

// 🆕 FUNCIÓN PARA AUTO-DETECTAR ALLOWED_ORIGINS
const generateAllowedOrigins = (frontendUrl: string): string[] => {
  console.log('🔍 Generando ALLOWED_ORIGINS...');
  
  const origins = new Set<string>();
  
  // 1. FRONTEND_URL principal
  origins.add(frontendUrl);
  
  // 2. Si hay ALLOWED_ORIGINS manual, agregarlos
  if (process.env.ALLOWED_ORIGINS) {
    const customOrigins = process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim());
    customOrigins.forEach(origin => origins.add(origin));
    console.log(`✅ ALLOWED_ORIGINS manuales agregados: ${customOrigins.join(', ')}`);
  }
  
  // 3. Extraer IP/host y puerto del FRONTEND_URL para generar variaciones
  try {
    const url = new URL(frontendUrl);
    const host = url.hostname;
    const port = url.port || (url.protocol === 'https:' ? '443' : '80');
    const protocol = url.protocol;
    
    // Variaciones comunes
    origins.add(`${protocol}//${host}:${port}`);
    origins.add(`http://${host}:${port}`);
    origins.add(`https://${host}:${port}`);
    
    // Si no es localhost, agregar localhost también para desarrollo
    if (host !== 'localhost' && host !== '127.0.0.1') {
      origins.add(`http://localhost:${port}`);
      origins.add(`http://127.0.0.1:${port}`);
    }
    
    // Agregar variaciones sin puerto para puertos estándar
    if (port === '80' || port === '443') {
      origins.add(`${protocol}//${host}`);
    }
    
  } catch (error) {
    console.log('⚠️ No se pudo parsear FRONTEND_URL para generar variaciones');
  }
  
  // 4. Agregar orígenes comunes de desarrollo
  if (process.env.NODE_ENV === 'development') {
    [
      'http://localhost:3000',
      'http://localhost:5173',
      'http://localhost:9050',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:9050'
    ].forEach(origin => origins.add(origin));
  }
  
  const finalOrigins = Array.from(origins);
  console.log(`✅ ALLOWED_ORIGINS generados: ${finalOrigins.join(', ')}`);
  
  return finalOrigins;
};

// 🔗 CONFIGURACIÓN DE BD CON FALLBACK AUTOMÁTICO (TU CÓDIGO ORIGINAL)
const getDatabaseUrl = (): string => {
  // Prioridad: POSTGRES_URL -> POSTGRES_FALLBACK_URL -> POSTGRES_DIRECT_URL
  const primaryUrl = process.env.POSTGRES_URL;
  const fallbackUrl = process.env.POSTGRES_FALLBACK_URL;
  const directUrl = process.env.POSTGRES_DIRECT_URL;
  
  if (primaryUrl) {
    console.log(`🔗 Usando conexión primaria: ${primaryUrl.includes('pgbouncer') ? 'PgBouncer' : 'PostgreSQL directo'}`);
    return primaryUrl;
  } else if (fallbackUrl) {
    console.log('🔗 Usando conexión de fallback');
    return fallbackUrl;
  } else if (directUrl) {
    console.log('🔗 Usando conexión directa');
    return directUrl;
  } else {
    throw new Error('No se encontró configuración de base de datos válida');
  }
};

// 🚀 EJECUTAR AUTO-DETECCIÓN
const detectedFrontendUrl = autoDetectFrontendUrl();
const databaseUrl = getDatabaseUrl();
const allowedOrigins = generateAllowedOrigins(detectedFrontendUrl);

export const envs: EnvConfig = {
  PORT: parseInt(process.env.PORT || '3000'),
  NODE_ENV: process.env.NODE_ENV || 'development',
  POSTGRES_URL: databaseUrl,
  JWT_SECRET: getEnvVar('JWT_SECRET', 'default-secret-key'),
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '2h',
  BCRYPT_ROUNDS: parseInt(process.env.BCRYPT_ROUNDS || '12'),
  
  // Gmail configuration
  MAILER_SERVICE: getEnvVar('MAILER_SERVICE', 'gmail'),
  MAILER_EMAIL: getEnvVar('MAILER_EMAIL'),
  MAILER_SECRET_KEY: getEnvVar('MAILER_SECRET_KEY'),
  
  // 🧠 AUTO-DETECCIÓN APLICADA
  FRONTEND_URL: detectedFrontendUrl,
  EMAIL_VERIFICATION_SECRET: getEnvVar('EMAIL_VERIFICATION_SECRET', 'email-verification-secret'),
  
  // 🆕 CORS AUTO-CONFIGURADO
  ALLOWED_ORIGINS: allowedOrigins,
};

// 📊 LOG DE CONFIGURACIÓN
console.log('🚀 Configuración del Backend:');
console.log(`   🌐 Frontend URL: ${envs.FRONTEND_URL}`);
console.log(`   🔧 Backend Port: ${envs.PORT}`);
console.log(`   🗄️ Database: ${envs.POSTGRES_URL.includes('pgbouncer') ? 'PgBouncer + Fallback' : 'PostgreSQL Directo'}`);
console.log(`   📧 Email Service: ${envs.MAILER_SERVICE}`);
console.log(`   🌍 CORS Origins: ${envs.ALLOWED_ORIGINS.length} orígenes configurados`);