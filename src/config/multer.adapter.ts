// src/config/multer.adapter.ts
import multer from 'multer';
import { envs } from './envs';

const storage = multer.memoryStorage();

export const multerAdapter = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB máximo
    files: 1
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      // Multer espera null en el primer parámetro para errores
      const error = new Error('Solo se permiten archivos de imagen') as any;
      cb(error, false);
    }
  }
});