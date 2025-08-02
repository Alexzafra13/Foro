// src/presentation/server.ts
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
    const { PasswordResetRoutes } = await import("./routes/password-reset.routes");
    const { UserRoutes } = await import("./routes/user.routes");
    const { ProfileRoutes } = await import("./routes/profile.routes");
    const { PostRoutes } = await import("./routes/post.routes");
    const { CommentRoutes } = await import("./routes/comment.routes");
    const { CategoryRoutes } = await import("./routes/category.routes");
    const { ChannelRoutes } = await import("./routes/channel.routes");
    const { InviteRoutes } = await import("./routes/invite.routes");
    const { VoteRoutes } = await import("./routes/vote.routes");
    const { NotificationRoutes } = await import("./routes/notification.routes");

    // Registrar rutas de autenticación
    this.app.use("/api/auth", await AuthRoutes.getRoutes());
    this.app.use("/api/auth", await EmailVerificationRoutes.getRoutes());
    this.app.use("/api/auth", await PasswordResetRoutes.getRoutes());

    // Registrar rutas de usuarios
    this.app.use("/api/users", await UserRoutes.getRoutes());
    this.app.use("/api/users", await ProfileRoutes.getRoutes());

     // Registrar rutas de notificaciones ✅ NUEVO
    this.app.use("/api/notifications", await NotificationRoutes.getRoutes());

    // 🔥 CORRECCIÓN CRÍTICA: Registrar rutas de comentarios con prefijo específico
    this.app.use("/api/comments", await CommentRoutes.getRoutes());

    // Registrar rutas de votos (pueden ir después ahora)
    this.app.use("/api", await VoteRoutes.getRoutes());

    // Registrar rutas de contenido
    this.app.use("/api/posts", await PostRoutes.getRoutes());
    
    // Registrar rutas de estructura
    this.app.use("/api/categories", await CategoryRoutes.getRoutes());
    this.app.use("/api/channels", await ChannelRoutes.getRoutes());
    
    // Registrar rutas de invitaciones
    this.app.use("/api/invites", await InviteRoutes.getRoutes());

    // 404 handler - DEBE IR AL FINAL
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
          console.log(`\n📚 Available endpoints:`);
          console.log(`   Auth: /api/auth/*`);
          console.log(`   Users: /api/users/*`);
          console.log(`   Posts: /api/posts/*`);
          console.log(`   Comments: /api/posts/:id/comments, /api/comments/*`);
          console.log(`   Votes: /api/posts/:id/vote, /api/comments/:id/vote`);
          console.log(`   Categories: /api/categories`);
          console.log(`   Channels: /api/channels/*`);
          console.log(`   Invites: /api/invites/*`);
          console.log(`   Notifications: /api/notifications/*`);
        }
      });
    } catch (error) {
      console.error("❌ Failed to start server:", error);
      process.exit(1);
    }
  }
}