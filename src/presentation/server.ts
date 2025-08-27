import express, { Application } from "express";
import { envs } from "../config/envs";
import { CorsMiddleware } from "./middlewares/cors.middleware";

export class Server {
  private app: Application;
  private port: number;

  constructor(port: number = 3000) {
    this.app = express();
    this.port = port;
    this.middlewares();
  }

  private middlewares() {
    // CORS dinámico usando middleware separado
    this.app.use(CorsMiddleware.dynamicCors);
    
    // Log de configuración al inicio
    CorsMiddleware.logConfiguration();

    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));

    // Request logging solo en desarrollo
    if (envs.NODE_ENV === 'development') {
      this.app.use((req, res, next) => {
        console.log(`${req.method} ${req.path}`);
        next();
      });
    }
  }

  private async routes() {
    // Health check mejorado
    this.app.get("/health", (req, res) => {
      res.json({
        status: "OK",
        timestamp: new Date().toISOString(),
        service: "Forum API",
        version: "1.0.0",
        config: {
          frontend_url: envs.FRONTEND_URL,
          allowed_origins_count: envs.ALLOWED_ORIGINS.length,
          environment: envs.NODE_ENV,
          cors_enabled: true
        }
      });
    });

    // Endpoint para debug de CORS (solo desarrollo)
    if (envs.NODE_ENV === 'development') {
      this.app.get("/debug/cors", (req, res) => {
        res.json({
          frontend_url: envs.FRONTEND_URL,
          allowed_origins: envs.ALLOWED_ORIGINS,
          request_origin: req.get('origin') || 'No origin header',
          cors_status: envs.ALLOWED_ORIGINS.includes(req.get('origin') || '') ? 'ALLOWED' : 'BLOCKED'
        });
      });
    }

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
    const { ModerationRoutes } = await import("./routes/moderation.routes");
    const { SSERoutes } = await import("./routes/sse.routes");

    // Registrar rutas de autenticación
    this.app.use("/api/auth", await AuthRoutes.getRoutes());
    this.app.use("/api/auth", await EmailVerificationRoutes.getRoutes());
    this.app.use("/api/auth", await PasswordResetRoutes.getRoutes());

    // Registrar rutas de usuarios (incluye rutas públicas)
    this.app.use("/api/users", await UserRoutes.getRoutes());
    this.app.use("/api/users", await ProfileRoutes.getRoutes());

    // Registrar rutas de notificaciones
    this.app.use("/api/notifications", await NotificationRoutes.getRoutes());

    // Registrar rutas de moderación
    this.app.use("/api/moderation", await ModerationRoutes.getRoutes());

    // Registrar rutas de comentarios
    this.app.use("/api/comments", await CommentRoutes.getRoutes());

    this.app.use("/api/sse", await SSERoutes.getRoutes());

    // Registrar rutas de votos
    this.app.use("/api", await VoteRoutes.getRoutes());

    // Registrar rutas de contenido
    this.app.use("/api/posts", await PostRoutes.getRoutes());
    
    // Registrar rutas de estructura
    this.app.use("/api/categories", await CategoryRoutes.getRoutes());
    this.app.use("/api/channels", await ChannelRoutes.getRoutes());
    
    // Registrar rutas de invitaciones
    this.app.use("/api/invites", await InviteRoutes.getRoutes());

    // 404 handler - debe ir al final
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
        
        console.log(`🌐 Frontend URL detectada: ${envs.FRONTEND_URL}`);
        console.log(`🌍 CORS configurado para ${envs.ALLOWED_ORIGINS.length} orígenes`);
        
        if (envs.NODE_ENV === 'development') {
          console.log(`\n🎯 Ready for development!`);
          console.log(`🔧 Debug CORS: http://localhost:${this.port}/debug/cors`);
          console.log(`\n📚 Available endpoints:`);
          console.log(`   Auth: /api/auth/*`);
          console.log(`   Users: /api/users/* (includes public profiles)`);
          console.log(`   Posts: /api/posts/*`);
          console.log(`   Comments: /api/posts/:id/comments, /api/comments/*`);
          console.log(`   Votes: /api/posts/:id/vote, /api/comments/:id/vote`);
          console.log(`   Categories: /api/categories`);
          console.log(`   Channels: /api/channels/*`);
          console.log(`   Invites: /api/invites/*`);
          console.log(`   Notifications: /api/notifications/*`);
          console.log(`   Moderation: /api/moderation/*`);
        }
      });
    } catch (error) {
      console.error("❌ Failed to start server:", error);
      process.exit(1);
    }
  }
}