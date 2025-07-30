// src/config/envs.ts - VERSIÓN DE DEBUG
interface EnvConfig {
  PORT: number;
  NODE_ENV: string;
  POSTGRES_URL: string;
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;
  BCRYPT_ROUNDS: number;
  
  // ✅ VARIABLES PARA GMAIL
  MAILER_SERVICE: string;
  MAILER_EMAIL: string;
  MAILER_SECRET_KEY: string;
  
  // ✅ PARA LINKS DE VERIFICACIÓN
  FRONTEND_URL: string;
  EMAIL_VERIFICATION_SECRET: string;
}

// ✅ DEBUG: Imprimir todas las variables de entorno al inicio
console.log('🔍 Environment Variables Debug:');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('POSTGRES_URL:', process.env.POSTGRES_URL);
console.log('JWT_SECRET:', process.env.JWT_SECRET);
console.log('PORT:', process.env.PORT);
console.log('Todas las env vars que empiezan con POSTGRES:', 
  Object.keys(process.env).filter(key => key.startsWith('POSTGRES')));

const getEnvVar = (key: string, defaultValue?: string): string => {
  const value = process.env[key] || defaultValue;
  
  // ✅ DEBUG: Imprimir el valor específico que está buscando
  console.log(`🔍 Buscando variable: ${key}, valor encontrado: "${value}"`);
  
  // En modo test, permite valores por defecto
  if (!value && process.env.NODE_ENV !== 'test') {
    console.error(`❌ Variable de entorno ${key} no encontrada. Valor actual: "${process.env[key]}"`);
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

export const envs: EnvConfig = {
  PORT: parseInt(process.env.PORT || '3000'),
  NODE_ENV: process.env.NODE_ENV || 'development',
  POSTGRES_URL: getEnvVar('POSTGRES_URL'),
  JWT_SECRET: getEnvVar('JWT_SECRET', 'test-secret'),
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '2h',
  BCRYPT_ROUNDS: parseInt(process.env.BCRYPT_ROUNDS || '12'),
  
  // Gmail configuration
  MAILER_SERVICE: getEnvVar('MAILER_SERVICE', 'gmail'),
  MAILER_EMAIL: getEnvVar('MAILER_EMAIL'),
  MAILER_SECRET_KEY: getEnvVar('MAILER_SECRET_KEY'),
  
  // Frontend URL for verification links
  FRONTEND_URL: getEnvVar('FRONTEND_URL', 'http://localhost:3000'),
  EMAIL_VERIFICATION_SECRET: getEnvVar('EMAIL_VERIFICATION_SECRET', 'email-verification-secret'),
};