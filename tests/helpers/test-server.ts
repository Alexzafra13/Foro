import express, { Application } from 'express';
import { AuthRoutes } from '@/presentation/routes/auth.routes';
import { UserRoutes } from '@/presentation/routes/user.routes';

export class TestServer {
  private app: Application;

  constructor() {
    this.app = express();
    this.middlewares();
  }

  private middlewares() {
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
  }

  async getApp(): Promise<Application> {
    await this.routes();
    return this.app;
  }

  private async routes() {
    this.app.get('/health', (req, res) => {
      res.json({ status: 'OK' });
    });

    this.app.use('/api/auth', await AuthRoutes.getRoutes());
    this.app.use('/api/users', await UserRoutes.getRoutes());
  }
}