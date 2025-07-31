// src/presentation/routes/user.routes.ts - LIMPIO Y SIN DUPLICADOS
import { Router } from 'express';

export class UserRoutes {
  static async getRoutes(): Promise<Router> {
    const router = Router();
    
    // ✅ ESTA CLASE ESTÁ RESERVADA PARA FUTURAS RUTAS DE USUARIOS
    // Como: búsqueda de usuarios públicos, listado de usuarios, etc.
    // Las rutas de perfil están en ProfileRoutes
    
    // Por ahora, no hay rutas aquí para evitar duplicados
    // Si necesitas rutas de usuarios en el futuro, las agregas aquí
    
    return router;
  }
}