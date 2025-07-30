// src/presentation/server.ts - ACTUALIZADO
import express, { Application } from "express";
import { AuthRoutes } from "./routes/auth.routes";
import { UserRoutes } from "./routes/user.routes";
import { PostRoutes } from "./routes/post.routes";
import { InviteRoutes } from "./routes/invite.routes";
import { EmailVerificationRoutes } from "./routes/email-verification.routes";
import { CommentRoutes } from "./routes/comment.routes";
import { CategoryRoutes } from "./routes/category.routes"; // ✅ NUEVO
import { ChannelRoutes } from "./routes/channel.routes"; // ✅ NUEVO

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
        version: "1.0.0"
      });
    });

    // ========================================
    // RUTAS DE AUTENTICACIÓN Y USUARIOS
    // ========================================
    
    // Rutas de autenticación (incluye registro con invite code)
    this.app.use("/api/auth", await AuthRoutes.getRoutes());
    
    // Rutas de verificación de email
    this.app.use("/api/auth", await EmailVerificationRoutes.getRoutes());
    
    // Rutas de usuario (protegidas)
    this.app.use("/api/users", await UserRoutes.getRoutes());
    
    // ========================================
    // RUTAS DE ESTRUCTURA DEL FORO ✅ NUEVO
    // ========================================

    // Rutas de categorías
    this.app.use("/api/categories", await CategoryRoutes.getRoutes());
    
    // Rutas de canales
    this.app.use("/api/channels", await ChannelRoutes.getRoutes());
    
    // ========================================
    // RUTAS DE CONTENIDO
    // ========================================

    // Rutas de posts (algunas protegidas)
    this.app.use("/api/posts", await PostRoutes.getRoutes());
    
    // Rutas de comentarios
    this.app.use("/api", await CommentRoutes.getRoutes());
    
    // ========================================
    // RUTAS DE ADMINISTRACIÓN
    // ========================================
    
    // Rutas de códigos de invitación
    this.app.use("/api/invites", await InviteRoutes.getRoutes());
  }

  async start() {
    await this.routes();

    this.app.listen(this.port, () => {
      console.log(`🚀 Server running on port ${this.port}`);
      console.log(`📡 Health check: http://localhost:${this.port}/health`);
      console.log(`\n🔗 Available APIs:`);
      console.log(`   🔐 Auth: http://localhost:${this.port}/api/auth`);
      console.log(`   📧 Email Verification: http://localhost:${this.port}/api/auth/verify-email`);
      console.log(`   👥 Users: http://localhost:${this.port}/api/users`);
      console.log(`   📁 Categories: http://localhost:${this.port}/api/categories`); // ✅ NUEVO
      console.log(`   📺 Channels: http://localhost:${this.port}/api/channels/:id`); // ✅ NUEVO
      console.log(`   📝 Posts: http://localhost:${this.port}/api/posts`);
      console.log(`   💬 Comments: http://localhost:${this.port}/api/posts/:postId/comments`);
      console.log(`   🎫 Invites: http://localhost:${this.port}/api/invites`);
      console.log(`\n🎯 Ready for testing!`);
    });
  }
}