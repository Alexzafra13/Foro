// src/presentation/controllers/sse.controller.ts - CORS CORREGIDO
import { Request, Response } from 'express';

interface SSEConnection {
  response: Response;
  userId: number;
  connectedAt: Date;
  lastPing: Date;
}

export class SSEController {
  // Map de conexiones activas: userId -> SSEConnection
  private static connections = new Map<number, SSEConnection>();

  // Endpoint principal para stream de notificaciones
  async notificationStream(req: Request, res: Response) {
    const userId = req.user?.userId;
    
    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        error: 'Authentication required for SSE connection' 
      });
    }

    console.log(`🔌 SSE connection request from user ${userId}`);

    // ✅ CORREGIR HEADERS SSE PARA CORS
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': 'http://localhost:5173', // ✅ ESPECÍFICO, NO WILDCARD
      'Access-Control-Allow-Headers': 'Cache-Control, Authorization',
      'Access-Control-Allow-Credentials': 'true',
    });

    // Enviar mensaje de conexión inicial
    const welcomeMessage = {
      type: 'connected',
      message: 'SSE connection established',
      timestamp: new Date().toISOString(),
      userId: userId
    };
    
    res.write(`data: ${JSON.stringify(welcomeMessage)}\n\n`);

    // Cerrar conexión anterior si existe
    const existingConnection = SSEController.connections.get(userId);
    if (existingConnection) {
      console.log(`⚠️ Closing previous SSE connection for user ${userId}`);
      existingConnection.response.end();
    }

    // Guardar nueva conexión
    const connection: SSEConnection = {
      response: res,
      userId: userId,
      connectedAt: new Date(),
      lastPing: new Date()
    };
    
    SSEController.connections.set(userId, connection);
    console.log(`✅ SSE connection established for user ${userId}`);

    // Keep-alive ping cada 30 segundos
    const keepAliveInterval = setInterval(() => {
      if (SSEController.connections.has(userId)) {
        const pingMessage = {
          type: 'ping',
          timestamp: new Date().toISOString()
        };
        
        try {
          res.write(`data: ${JSON.stringify(pingMessage)}\n\n`);
          connection.lastPing = new Date();
        } catch (error) {
          console.log(`❌ Keep-alive failed for user ${userId}, removing connection`);
          clearInterval(keepAliveInterval);
          SSEController.connections.delete(userId);
        }
      } else {
        clearInterval(keepAliveInterval);
      }
    }, 30000);

    // Manejar desconexión del cliente
    req.on('close', () => {
      console.log(`🔌 SSE connection closed for user ${userId}`);
      clearInterval(keepAliveInterval);
      SSEController.connections.delete(userId);
    });

    req.on('error', (error) => {
      console.error(`❌ SSE connection error for user ${userId}:`, error);
      clearInterval(keepAliveInterval);
      SSEController.connections.delete(userId);
    });
  }

  // Método estático para enviar notificación a usuario específico
  static sendNotificationToUser(userId: number, notificationData: any): boolean {
    const connection = SSEController.connections.get(userId);
    
    if (!connection) {
      console.log(`⚠️ No SSE connection found for user ${userId}`);
      return false;
    }

    try {
      const sseMessage = {
        type: 'notification',
        data: notificationData,
        timestamp: new Date().toISOString()
      };

      connection.response.write(`data: ${JSON.stringify(sseMessage)}\n\n`);
      console.log(`📬 Notification sent via SSE to user ${userId}: ${notificationData.type || 'unknown'}`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to send notification via SSE to user ${userId}:`, error);
      // Remover conexión rota
      SSEController.connections.delete(userId);
      return false;
    }
  }

  // Método estático para enviar contador de no leídas
  static sendUnreadCountToUser(userId: number, count: number): boolean {
    const connection = SSEController.connections.get(userId);
    
    if (!connection) {
      return false;
    }

    try {
      const countMessage = {
        type: 'unread_count',
        count: count,
        timestamp: new Date().toISOString()
      };

      connection.response.write(`data: ${JSON.stringify(countMessage)}\n\n`);
      console.log(`🔢 Unread count (${count}) sent via SSE to user ${userId}`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to send unread count via SSE to user ${userId}:`, error);
      SSEController.connections.delete(userId);
      return false;
    }
  }

  // Método para broadcast a todos los usuarios conectados
  static broadcastToAll(message: any): number {
    let sentCount = 0;
    
    for (const [userId, connection] of SSEController.connections) {
      try {
        const broadcastMessage = {
          type: 'broadcast',
          data: message,
          timestamp: new Date().toISOString()
        };

        connection.response.write(`data: ${JSON.stringify(broadcastMessage)}\n\n`);
        sentCount++;
      } catch (error) {
        console.error(`❌ Failed to broadcast to user ${userId}:`, error);
        SSEController.connections.delete(userId);
      }
    }

    console.log(`📢 Broadcast sent to ${sentCount} connected users`);
    return sentCount;
  }

  // Endpoint para obtener estadísticas de conexiones (debugging)
  async getConnectionStats(req: Request, res: Response) {
    const stats = {
      activeConnections: SSEController.connections.size,
      connectedUsers: Array.from(SSEController.connections.keys()),
      connections: Array.from(SSEController.connections.values()).map(conn => ({
        userId: conn.userId,
        connectedAt: conn.connectedAt,
        lastPing: conn.lastPing,
        connectionAge: Date.now() - conn.connectedAt.getTime()
      }))
    };

    res.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString()
    });
  }

  // Método para cerrar conexión específica (admin)
  static closeConnection(userId: number): boolean {
    const connection = SSEController.connections.get(userId);
    
    if (connection) {
      connection.response.end();
      SSEController.connections.delete(userId);
      console.log(`🔌 SSE connection forcibly closed for user ${userId}`);
      return true;
    }
    
    return false;
  }

  // Método para obtener estadísticas (uso interno)
  static getStats() {
    return {
      activeConnections: SSEController.connections.size,
      connectedUsers: Array.from(SSEController.connections.keys()),
      oldestConnection: Array.from(SSEController.connections.values())
        .reduce((oldest, conn) => 
          !oldest || conn.connectedAt < oldest.connectedAt ? conn : oldest, 
          null as SSEConnection | null
        )?.connectedAt
    };
  }
}