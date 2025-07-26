import express, { Application } from 'express';
import { RoleRoutes } from '@/presentation/routes/role.routes';

export class Server {
  private app: Application;
  private port: number;

  constructor(port: number = 3000) {
    this.app = express();
    this.port = port;
    this.middlewares();
  }

  private middlewares() {
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
  }

  private async routes() {
    // Ruta de health check
    this.app.get('/health', (req, res) => {
      res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        service: 'Forum API'
      });
    });

    // Rutas de roles
    this.app.use('/api/roles', await RoleRoutes.getRoutes());
  }

  async start() {
    await this.routes(); // ✅ Importante: await aquí
    
    this.app.listen(this.port, () => {
      console.log(`🚀 Server running on port ${this.port}`);
      console.log(`📡 Health check: http://localhost:${this.port}/health`);
      console.log(`🔗 Roles API: http://localhost:${this.port}/api/roles`);
    });
  }
}