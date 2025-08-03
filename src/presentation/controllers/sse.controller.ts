import { Request, Response } from 'express';

export class SSEController {
  private static connections = new Map<number, Response>();

  async notificationStream(req: Request, res: Response) {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    });

    // Conexión inicial
    res.write(`event: connected\ndata: ${JSON.stringify({
      message: 'Conexión establecida',
      timestamp: new Date().toISOString()
    })}\n\n`);

    SSEController.connections.set(userId, res);
    console.log(`✅ SSE connection established for user ${userId}`);

    const keepAlive = setInterval(() => {
      res.write(`event: ping\ndata: ${JSON.stringify({
        timestamp: new Date().toISOString()
      })}\n\n`);
    }, 30000);

    req.on('close', () => {
      clearInterval(keepAlive);
      SSEController.connections.delete(userId);
      console.log(`❌ SSE connection closed for user ${userId}`);
    });
  }

  static sendNotificationToUser(userId: number, notification: any): boolean {
    const connection = SSEController.connections.get(userId);

    if (connection) {
      try {
        connection.write(`event: notification\ndata: ${JSON.stringify({
          data: notification,
          timestamp: new Date().toISOString()
        })}\n\n`);
        console.log(`📬 Notification sent to user ${userId} via SSE`);
        return true;
      } catch (e) {
        console.warn(`⚠️ Failed to send SSE notification to user ${userId}`, e);
        SSEController.connections.delete(userId);
      }
    }

    return false;
  }

  static sendUnreadCountToUser(userId: number, count: number): boolean {
    const connection = SSEController.connections.get(userId);

    if (connection) {
      try {
        connection.write(`event: unread_count\ndata: ${JSON.stringify({
          count,
          timestamp: new Date().toISOString()
        })}\n\n`);
        return true;
      } catch (e) {
        SSEController.connections.delete(userId);
      }
    }

    return false;
  }

  static getConnectionStats() {
    return {
      activeConnections: SSEController.connections.size,
      connectedUsers: Array.from(SSEController.connections.keys())
    };
  }
}
