// src/presentation/server.ts - VERSIÓN FINAL LIMPIA
import express, { Application } from "express";
import cors from "cors";

export class Server {
  private app: Application;
  private port: number;

  constructor(port: number = 3000) {
    this.app = express();
    this.port = port;
    this.middlewares();
  }

  private middlewares() {
    this.app.use(cors({
      origin: [
        'http://localhost:5173',
        'http://localhost:3000',
        'http://127.0.0.1:5173',
      ],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: [
        'Content-Type', 
        'Authorization', 
        'X-Requested-With',
        'Accept',
        'Origin'
      ]
    }));

    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));

    // Request logging solo en desarrollo
    if (process.env.NODE_ENV === 'development') {
      this.app.use((req, res, next) => {
        console.log(`${req.method} ${req.path}`);
        next();
      });
    }
  }

  private async routes() {
    // Health check
    this.app.get("/health", (req, res) => {
      res.json({
        status: "OK",
        timestamp: new Date().toISOString(),
        service: "Forum API",
        version: "1.0.0"
      });
    });

    // Cargar todas las rutas
    const { AuthRoutes } = await import("./routes/auth.routes");
    const { EmailVerificationRoutes } = await import("./routes/email-verification.routes");
    const { UserRoutes } = await import("./routes/user.routes");
    const { PostRoutes } = await import("./routes/post.routes");
    const { CommentRoutes } = await import("./routes/comment.routes");
    const { CategoryRoutes } = await import("./routes/category.routes");
    const { ChannelRoutes } = await import("./routes/channel.routes");
    const { InviteRoutes } = await import("./routes/invite.routes");

    // Registrar rutas
    this.app.use("/api/auth", await AuthRoutes.getRoutes());
    this.app.use("/api/auth", await EmailVerificationRoutes.getRoutes());
    this.app.use("/api/users", await UserRoutes.getRoutes());
    this.app.use("/api/posts", await PostRoutes.getRoutes());
    this.app.use("/api", await CommentRoutes.getRoutes());
    this.app.use("/api/categories", await CategoryRoutes.getRoutes());
    this.app.use("/api/channels", await ChannelRoutes.getRoutes());
    this.app.use("/api/invites", await InviteRoutes.getRoutes());

    // 404 handler
    this.app.use((req, res) => {
      res.status(404).json({
        success: false,
        error: `Route ${req.originalUrl} not found`,
        code: 'ROUTE_NOT_FOUND'
      });
    });
  }

  async start() {
    try {
      await this.routes();
      
      this.app.listen(this.port, () => {
        console.log(`🚀 Forum API running on port ${this.port}`);
        console.log(`📡 Health check: http://localhost:${this.port}/health`);
        
        if (process.env.NODE_ENV === 'development') {
          console.log(`🌐 CORS enabled for frontend: http://localhost:5173`);
          console.log(`\n🎯 Ready for development!`);
        }
      });
    } catch (error) {
      console.error("❌ Failed to start server:", error);
      process.exit(1);
    }
  }
}