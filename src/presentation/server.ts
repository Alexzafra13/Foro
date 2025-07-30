// src/presentation/server.ts - VERSIÓN DE DEPURACIÓN
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

    if (process.env.NODE_ENV === 'development') {
      this.app.use((req, res, next) => {
        console.log(`${req.method} ${req.path} - Origin: ${req.get('Origin')}`);
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

    console.log("✅ Health route loaded");

    // Cargar rutas una por una para detectar el problema
    try {
      console.log("🔄 Loading AuthRoutes...");
      const { AuthRoutes } = await import("./routes/auth.routes");
      this.app.use("/api/auth", await AuthRoutes.getRoutes());
      console.log("✅ AuthRoutes loaded");
    } catch (error) {
      console.error("❌ Error loading AuthRoutes:", error);
      throw error;
    }

    try {
      console.log("🔄 Loading EmailVerificationRoutes...");
      const { EmailVerificationRoutes } = await import("./routes/email-verification.routes");
      this.app.use("/api/auth", await EmailVerificationRoutes.getRoutes());
      console.log("✅ EmailVerificationRoutes loaded");
    } catch (error) {
      console.error("❌ Error loading EmailVerificationRoutes:", error);
      throw error;
    }

    try {
      console.log("🔄 Loading UserRoutes...");
      const { UserRoutes } = await import("./routes/user.routes");
      this.app.use("/api/users", await UserRoutes.getRoutes());
      console.log("✅ UserRoutes loaded");
    } catch (error) {
      console.error("❌ Error loading UserRoutes:", error);
      throw error;
    }

    try {
      console.log("🔄 Loading PostRoutes...");
      const { PostRoutes } = await import("./routes/post.routes");
      this.app.use("/api/posts", await PostRoutes.getRoutes());
      console.log("✅ PostRoutes loaded");
    } catch (error) {
      console.error("❌ Error loading PostRoutes:", error);
      throw error;
    }

    try {
      console.log("🔄 Loading CommentRoutes...");
      const { CommentRoutes } = await import("./routes/comment.routes");
      this.app.use("/api", await CommentRoutes.getRoutes());
      console.log("✅ CommentRoutes loaded");
    } catch (error) {
      console.error("❌ Error loading CommentRoutes:", error);
      throw error;
    }

    try {
      console.log("🔄 Loading CategoryRoutes...");
      const { CategoryRoutes } = await import("./routes/category.routes");
      this.app.use("/api/categories", await CategoryRoutes.getRoutes());
      console.log("✅ CategoryRoutes loaded");
    } catch (error) {
      console.error("❌ Error loading CategoryRoutes:", error);
      throw error;
    }

    try {
      console.log("🔄 Loading ChannelRoutes...");
      const { ChannelRoutes } = await import("./routes/channel.routes");
      this.app.use("/api/channels", await ChannelRoutes.getRoutes());
      console.log("✅ ChannelRoutes loaded");
    } catch (error) {
      console.error("❌ Error loading ChannelRoutes:", error);
      throw error;
    }

    try {
      console.log("🔄 Loading InviteRoutes...");
      const { InviteRoutes } = await import("./routes/invite.routes");
      this.app.use("/api/invites", await InviteRoutes.getRoutes());
      console.log("✅ InviteRoutes loaded");
    } catch (error) {
      console.error("❌ Error loading InviteRoutes:", error);
      throw error;
    }

    // 404 handler
    this.app.use('*', (req, res) => {
      res.status(404).json({
        success: false,
        error: `Route ${req.originalUrl} not found`,
        code: 'ROUTE_NOT_FOUND'
      });
    });

    console.log("✅ All routes loaded successfully");
  }

  async start() {
    try {
      await this.routes();
      
      this.app.listen(this.port, () => {
        console.log(`🚀 Server running on port ${this.port}`);
        console.log(`📡 Health check: http://localhost:${this.port}/health`);
        console.log(`🌐 CORS enabled for frontend: http://localhost:5173`);
        console.log(`\n🎯 Ready for testing!`);
      });
    } catch (error) {
      console.error("❌ Failed to start server:", error);
      process.exit(1);
    }
  }
}