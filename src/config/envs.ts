interface EnvConfig {
  PORT: number;
  NODE_ENV: string;
  POSTGRES_URL: string;
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;
  BCRYPT_ROUNDS: number;
}

const getEnvVar = (key: string, defaultValue?: string): string => {
  const value = process.env[key] || defaultValue;
  
  // En modo test, permite valores por defecto para POSTGRES_URL
  if (!value && process.env.NODE_ENV !== 'test') {
    throw new Error(`Variable de entorno ${key} es requerida`);
  }
  
  // Valor por defecto para tests
  if (!value && process.env.NODE_ENV === 'test' && key === 'POSTGRES_URL') {
    return 'postgresql://test:test@localhost:5432/test_db';
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
};