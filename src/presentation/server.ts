import express, { Application } from "express";
import { AuthRoutes } from "../presentation/routes/auth.routes";
import { UserRoutes } from "./routes/user.routes";

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
    this.app.get("/health", (req, res) => {
      res.json({
        status: "OK",
        timestamp: new Date().toISOString(),
        service: "Forum API",
      });
    });

    // Rutas de autenticación
    this.app.use("/api/auth", await AuthRoutes.getRoutes());
    
    // Rutas de usuario (protegidas)
    this.app.use("/api/users", await UserRoutes.getRoutes());
}

  async start() {
    await this.routes();

    this.app.listen(this.port, () => {
      console.log(`🚀 Server running on port ${this.port}`);
      console.log(`📡 Health check: http://localhost:${this.port}/health`);
      console.log(`🔗 Auth API: http://localhost:${this.port}/api/auth`);
    });
  }
}
