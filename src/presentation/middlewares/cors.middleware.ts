import cors from 'cors';
import { envs } from '../../config/envs';

export class CorsMiddleware {
  
  // 🧠 CORS DINÁMICO CON AUTO-DETECCIÓN
  static get dynamicCors() {
    return cors({
      origin: (origin, callback) => {
        // Permitir requests sin origin (mobile apps, postman, curl, etc.)
        if (!origin) {
          return callback(null, true);
        }
        
        // Verificar si el origin está en la lista auto-generada
        if (envs.ALLOWED_ORIGINS.includes(origin)) {
          return callback(null, true);
        }
        
        // En desarrollo, ser más permisivo
        if (envs.NODE_ENV === 'development') {
          // Permitir cualquier localhost o 127.0.0.1
          if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
            console.log(`⚠️ CORS: Permitiendo origin de desarrollo: ${origin}`);
            return callback(null, true);
          }
          
          // Permitir IPs locales en desarrollo
          if (origin.match(/^https?:\/\/192\.168\.\d+\.\d+(:\d+)?$/)) {
            console.log(`⚠️ CORS: Permitiendo IP local en desarrollo: ${origin}`);
            return callback(null, true);
          }
        }
        
        // En producción, rechazar origins no autorizados
        console.log(`❌ CORS: Origin no permitido: ${origin}`);
        console.log(`✅ CORS: Origins permitidos: ${envs.ALLOWED_ORIGINS.join(', ')}`);
        
        const err = new Error(`CORS: Origin ${origin} no está permitido`);
        return callback(err, false);
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: [
        'Content-Type', 
        'Authorization', 
        'X-Requested-With',
        'Accept',
        'Origin'
      ]
    });
  }
  
  // 🛠️ CORS SIMPLE PARA TESTING/DEBUGGING
  static get permissiveCors() {
    return cors({
      origin: true, // Permitir cualquier origin
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: [
        'Content-Type', 
        'Authorization', 
        'X-Requested-With',
        'Accept',
        'Origin'
      ]
    });
  }

  // 📊 LOG DE CONFIGURACIÓN
  static logConfiguration() {
    console.log('🌍 CORS Configuración:');
    console.log(`   🧠 Auto-detección activada: ${envs.ALLOWED_ORIGINS.length} orígenes`);
    console.log(`   🌐 FRONTEND_URL: ${envs.FRONTEND_URL}`);
    console.log(`   🔧 Modo: ${envs.NODE_ENV}`);
    
    if (envs.NODE_ENV === 'development') {
      console.log(`   ⚠️ Desarrollo: Permitiendo localhost y IPs locales adicionales`);
    }
  }
}