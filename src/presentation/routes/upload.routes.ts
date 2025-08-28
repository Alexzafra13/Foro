// src/presentation/routes/upload.routes.ts
import { Router } from 'express';
import { Dependencies } from '../../infrastructure/dependencies';
import { AuthMiddleware } from '../middlewares/auth.middleware';
import { UploadMiddleware } from '../middlewares/upload.middleware';
import express from 'express';
import path from 'path';

export class UploadRoutes {
  static async getRoutes(): Promise<Router> {
    const router = Router();
    const deps = await Dependencies.create();

    // ========================================
    // RUTAS DE UPLOAD - Requieren autenticación
    // ========================================
    
    // POST /api/upload/avatar - Subir avatar
    router.post('/avatar',
      AuthMiddleware.validateToken,
      UploadMiddleware.validateUploadPermissions('avatar'),
      UploadMiddleware.uploadSingle,
      UploadMiddleware.handleMulterError,
      UploadMiddleware.processImage('avatar'),
      deps.controllers.uploadController.upload.bind(deps.controllers.uploadController)
    );

    // POST /api/upload/post - Subir imagen para post
    router.post('/post',
      AuthMiddleware.validateToken,
      UploadMiddleware.validateUploadPermissions('post'),
      UploadMiddleware.uploadSingle,
      UploadMiddleware.handleMulterError,
      UploadMiddleware.processImage('post'),
      deps.controllers.uploadController.upload.bind(deps.controllers.uploadController)
    );

    // POST /api/upload/comment - Subir imagen para comentario
    router.post('/comment',
      AuthMiddleware.validateToken,
      UploadMiddleware.validateUploadPermissions('comment'),
      UploadMiddleware.uploadSingle,
      UploadMiddleware.handleMulterError,
      UploadMiddleware.processImage('comment'),
      deps.controllers.uploadController.upload.bind(deps.controllers.uploadController)
    );

    // ========================================
    // RUTAS DE GESTIÓN - Requieren autenticación
    // ========================================

    // DELETE /api/upload/:fileId - Eliminar archivo
    router.delete('/:fileId',
      AuthMiddleware.validateToken,
      deps.controllers.uploadController.delete.bind(deps.controllers.uploadController)
    );

    // GET /api/upload/my-files - Mis archivos
    router.get('/my-files',
      AuthMiddleware.validateToken,
      deps.controllers.uploadController.getMyFiles.bind(deps.controllers.uploadController)
    );

    // GET /api/upload/my-stats - Mis estadísticas
    router.get('/my-stats',
      AuthMiddleware.validateToken,
      deps.controllers.uploadController.getMyStats.bind(deps.controllers.uploadController)
    );

    // GET /api/upload/user/:userId/files - Archivos de usuario específico
    router.get('/user/:userId/files',
      AuthMiddleware.validateToken,
      deps.controllers.uploadController.getFilesForUser.bind(deps.controllers.uploadController)
    );

    // ========================================
    // RUTAS ADMINISTRATIVAS - Requieren permisos especiales
    // ========================================

    // GET /api/upload/stats - Estadísticas globales (solo admin)
    router.get('/stats',
      AuthMiddleware.validateToken,
      deps.controllers.uploadController.getStats.bind(deps.controllers.uploadController)
    );

    // ========================================
    // RUTAS DE UTILIDAD - Públicas
    // ========================================

    // GET /api/upload/health - Health check del sistema de upload
    router.get('/health',
      deps.controllers.uploadController.healthCheck.bind(deps.controllers.uploadController)
    );

    return router;
  }

  // ========================================
  // RUTA ESTÁTICA PARA SERVIR ARCHIVOS
  // ========================================
  
  static getStaticRoute(): Router {
    const router = Router();
    
    // Servir archivos estáticos desde /uploads
    router.use('/uploads', 
      express.static(
        path.join(process.cwd(), 'uploads'),
        {
          // Configuraciones de seguridad y rendimiento
          maxAge: '1d', // Cache por 1 día
          etag: true,   // Usar ETags para validación de cache
          lastModified: true,
          dotfiles: 'deny', // Denegar archivos que empiecen con .
          index: false, // No mostrar índices de directorio
          
          // Headers de seguridad
          setHeaders: (res, path) => {
            // Solo permitir ciertos tipos de archivo
            const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
            const ext = require('path').extname(path).toLowerCase();
            
            if (!allowedExtensions.includes(ext)) {
              res.status(403).end();
              return;
            }

            // Headers de seguridad
            res.setHeader('X-Content-Type-Options', 'nosniff');
            res.setHeader('Cache-Control', 'public, max-age=86400'); // 1 día
          }
        }
      )
    );

    // Middleware para logging de accesos a archivos
    router.use('/uploads', (req, res, next) => {
      console.log(`📁 File access: ${req.path} from ${req.ip}`);
      next();
    });

    return router;
  }

  // ========================================
  // MIDDLEWARE PARA CREAR DIRECTORIOS
  // ========================================
  
  static ensureUploadDirectories(): void {
    const fs = require('fs');
    const uploadsPath = path.join(process.cwd(), 'uploads');
    
    // Crear directorio principal
    if (!fs.existsSync(uploadsPath)) {
      fs.mkdirSync(uploadsPath, { recursive: true });
      console.log('📁 Created uploads directory:', uploadsPath);
    }

    // Crear subdirectorios para cada tipo
    const subdirs = ['avatars', 'posts', 'comments'];
    subdirs.forEach(subdir => {
      const subdirPath = path.join(uploadsPath, subdir);
      if (!fs.existsSync(subdirPath)) {
        fs.mkdirSync(subdirPath, { recursive: true });
        console.log(`📁 Created ${subdir} directory:`, subdirPath);
      }
    });

    // Crear .gitkeep para mantener directorios en git
    subdirs.forEach(subdir => {
      const gitkeepPath = path.join(uploadsPath, subdir, '.gitkeep');
      if (!fs.existsSync(gitkeepPath)) {
        fs.writeFileSync(gitkeepPath, '# Keep this directory in git');
      }
    });

    console.log('✅ Upload directories ensured');
  }
}