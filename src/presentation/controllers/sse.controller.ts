// src/presentation/controllers/sse.controller.ts - MEJORADO CONSERVANDO TU BASE
import { Request, Response } from 'express';

interface SSEConnection {
  response: Response;
  userId: number;
  connectedAt: Date;
  lastPing: Date;
  keepAliveInterval?: NodeJS.Timeout; // ✅ AÑADIDO: referencia al interval
  isAlive?: boolean; // ✅ AÑADIDO: estado de la conexión
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

    // ✅ HEADERS MEJORADOS (manteniendo tu configuración base)
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-store, must-revalidate', // ✅ MEJORADO: más estricto
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': process.env.FRONTEND_URL || 'http://localhost:5173', // ✅ MEJORADO: configurable
      'Access-Control-Allow-Headers': 'Cache-Control, Authorization',
      'Access-Control-Allow-Credentials': 'true',
      'X-Accel-Buffering': 'no', // ✅ AÑADIDO: para Nginx
    });

    // ✅ CERRAR CONEXIÓN ANTERIOR DE FORMA SEGURA (tu lógica existente mejorada)
    const existingConnection = SSEController.connections.get(userId);
    if (existingConnection) {
      console.log(`⚠️ Closing previous SSE connection for user ${userId}`);
      
      // ✅ MEJORADO: cleanup seguro de la conexión anterior
      if (existingConnection.keepAliveInterval) {
        clearInterval(existingConnection.keepAliveInterval);
      }
      
      try {
        if (!existingConnection.response.destroyed) {
          existingConnection.response.end();
        }
      } catch (error: unknown) {
        console.warn(`Warning closing previous connection for user ${userId}:`, error instanceof Error ? error.message : String(error));
      }
    }

    // Enviar mensaje de conexión inicial (tu código existente)
    const welcomeMessage = {
      type: 'connected',
      message: 'SSE connection established',
      timestamp: new Date().toISOString(),
      userId: userId
    };
    
    // ✅ MEJORADO: manejo de errores en escritura inicial
    try {
      res.write(`data: ${JSON.stringify(welcomeMessage)}\n\n`);
    } catch (error: unknown) {
      console.error(`❌ Failed to send welcome message to user ${userId}:`, error instanceof Error ? error.message : String(error));
      return; // ✅ AÑADIDO: salir si no podemos escribir
    }

    // ✅ KEEP-ALIVE MEJORADO (conservando tu lógica de 30 segundos)
    const keepAliveInterval = setInterval(() => {
      const currentConnection = SSEController.connections.get(userId);
      
      // ✅ MEJORADO: verificar que la conexión sigue siendo la misma
      if (!currentConnection || currentConnection !== connection) {
        console.log(`🔌 Keep-alive: Connection changed for user ${userId}`);
        clearInterval(keepAliveInterval);
        return;
      }

      // ✅ MEJORADO: verificar estado de la conexión
      if (currentConnection.isAlive === false) {
        console.log(`🔌 Keep-alive: Connection marked as dead for user ${userId}`);
        clearInterval(keepAliveInterval);
        SSEController.connections.delete(userId);
        return;
      }

      const pingMessage = {
        type: 'ping',
        timestamp: new Date().toISOString(),
        serverTime: Date.now() // ✅ AÑADIDO: timestamp del servidor
      };
      
      try {
        currentConnection.response.write(`data: ${JSON.stringify(pingMessage)}\n\n`);
        currentConnection.lastPing = new Date();
        console.log(`🏓 Keep-alive ping sent to user ${userId}`);
      } catch (error: unknown) {
        console.log(`❌ Keep-alive failed for user ${userId}:`, error instanceof Error ? error.message : String(error));
        
        // ✅ MEJORADO: marcar conexión como muerta
        currentConnection.isAlive = false;
        clearInterval(keepAliveInterval);
        SSEController.connections.delete(userId);
      }
    }, 30000); // Manteniendo tus 30 segundos

    // ✅ GUARDAR NUEVA CONEXIÓN (tu estructura existente + mejoras)
    const connection: SSEConnection = {
      response: res,
      userId: userId,
      connectedAt: new Date(),
      lastPing: new Date(),
      keepAliveInterval: keepAliveInterval, // ✅ AÑADIDO: guardar referencia
      isAlive: true // ✅ AÑADIDO: estado inicial
    };
    
    SSEController.connections.set(userId, connection);
    console.log(`✅ SSE connection established for user ${userId} (total: ${SSEController.connections.size})`);

    // ✅ FUNCIÓN DE CLEANUP MEJORADA
    const cleanup = () => {
      console.log(`🔌 SSE connection cleanup for user ${userId}`);
      
      if (connection.keepAliveInterval) {
        clearInterval(connection.keepAliveInterval);
      }
      
      connection.isAlive = false;
      SSEController.connections.delete(userId);
    };

    // ✅ MANEJAR DESCONEXIÓN (tu código existente mejorado)
    req.on('close', () => {
      console.log(`🔌 SSE connection closed for user ${userId}`);
      cleanup();
    });

    req.on('error', (error: any) => {
      // ✅ MEJORADO: filtrar errores normales vs errores reales
      const errorCode = error?.code || 'UNKNOWN';
      const errorMessage = error?.message || String(error);
      
      if (errorCode === 'ECONNRESET' || errorCode === 'EPIPE') {
        console.log(`🔌 SSE connection reset for user ${userId} (normal browser navigation/refresh)`);
      } else {
        console.error(`❌ SSE connection error for user ${userId}:`, errorMessage);
      }
      cleanup();
    });
  }

  // ✅ TU MÉTODO EXISTENTE CON MEJORAS MÍNIMAS
  static sendNotificationToUser(userId: number, notificationData: any): boolean {
    const connection = SSEController.connections.get(userId);
    
    if (!connection) {
      console.log(`⚠️ No SSE connection found for user ${userId}`);
      return false;
    }

    // ✅ AÑADIDO: verificar si la conexión está viva
    if (connection.isAlive === false) {
      console.log(`⚠️ SSE connection for user ${userId} is marked as dead`);
      SSEController.connections.delete(userId);
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
    } catch (error: unknown) {
      console.error(`❌ Failed to send notification via SSE to user ${userId}:`, error instanceof Error ? error.message : String(error));
      
      // ✅ MEJORADO: marcar como muerta y limpiar
      connection.isAlive = false;
      if (connection.keepAliveInterval) {
        clearInterval(connection.keepAliveInterval);
      }
      SSEController.connections.delete(userId);
      return false;
    }
  }

  // ✅ TU MÉTODO EXISTENTE CON MEJORAS MÍNIMAS
  static sendUnreadCountToUser(userId: number, count: number): boolean {
    const connection = SSEController.connections.get(userId);
    
    if (!connection) {
      return false;
    }

    // ✅ AÑADIDO: verificar si la conexión está viva
    if (connection.isAlive === false) {
      SSEController.connections.delete(userId);
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
    } catch (error: unknown) {
      console.error(`❌ Failed to send unread count via SSE to user ${userId}:`, error instanceof Error ? error.message : String(error));
      
      // ✅ MEJORADO: cleanup completo
      connection.isAlive = false;
      if (connection.keepAliveInterval) {
        clearInterval(connection.keepAliveInterval);
      }
      SSEController.connections.delete(userId);
      return false;
    }
  }

  // ✅ TU MÉTODO EXISTENTE CON MEJORAS MÍNIMAS
  static broadcastToAll(message: any): number {
    let sentCount = 0;
    const deadConnections: number[] = []; // ✅ AÑADIDO: rastrear conexiones muertas
    
    for (const [userId, connection] of SSEController.connections) {
      // ✅ AÑADIDO: skip conexiones marcadas como muertas
      if (connection.isAlive === false) {
        deadConnections.push(userId);
        continue;
      }

      try {
        const broadcastMessage = {
          type: 'broadcast',
          data: message,
          timestamp: new Date().toISOString()
        };

        connection.response.write(`data: ${JSON.stringify(broadcastMessage)}\n\n`);
        sentCount++;
      } catch (error: unknown) {
        console.error(`❌ Failed to broadcast to user ${userId}:`, error instanceof Error ? error.message : String(error));
        
        // ✅ MEJORADO: marcar como muerta
        connection.isAlive = false;
        if (connection.keepAliveInterval) {
          clearInterval(connection.keepAliveInterval);
        }
        deadConnections.push(userId);
      }
    }

    // ✅ AÑADIDO: limpiar conexiones muertas
    deadConnections.forEach(userId => {
      SSEController.connections.delete(userId);
    });

    console.log(`📢 Broadcast sent to ${sentCount} connected users${deadConnections.length > 0 ? `, cleaned ${deadConnections.length} dead connections` : ''}`);
    return sentCount;
  }

  // ✅ TUS MÉTODOS EXISTENTES SIN CAMBIOS
  async getConnectionStats(req: Request, res: Response) {
    const stats = {
      activeConnections: SSEController.connections.size,
      connectedUsers: Array.from(SSEController.connections.keys()),
      connections: Array.from(SSEController.connections.values()).map(conn => ({
        userId: conn.userId,
        connectedAt: conn.connectedAt,
        lastPing: conn.lastPing,
        connectionAge: Date.now() - conn.connectedAt.getTime(),
        isAlive: conn.isAlive // ✅ AÑADIDO: mostrar estado
      }))
    };

    res.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString()
    });
  }

  static closeConnection(userId: number): boolean {
    const connection = SSEController.connections.get(userId);
    
    if (connection) {
      // ✅ MEJORADO: cleanup completo
      connection.isAlive = false;
      
      if (connection.keepAliveInterval) {
        clearInterval(connection.keepAliveInterval);
      }
      
      try {
        if (!connection.response.destroyed) {
          connection.response.end();
        }
      } catch (error: unknown) {
        console.warn(`Warning closing connection for user ${userId}:`, error instanceof Error ? error.message : String(error));
      }
      
      SSEController.connections.delete(userId);
      console.log(`🔌 SSE connection forcibly closed for user ${userId}`);
      return true;
    }
    
    return false;
  }

  static getStats() {
    return {
      activeConnections: SSEController.connections.size,
      connectedUsers: Array.from(SSEController.connections.keys()),
      aliveConnections: Array.from(SSEController.connections.values()).filter(conn => conn.isAlive !== false).length, // ✅ AÑADIDO
      oldestConnection: Array.from(SSEController.connections.values())
        .reduce((oldest, conn) => 
          !oldest || conn.connectedAt < oldest.connectedAt ? conn : oldest, 
          null as SSEConnection | null
        )?.connectedAt
    };
  }
}