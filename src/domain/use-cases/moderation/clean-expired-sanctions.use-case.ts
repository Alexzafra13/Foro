// src/domain/use-cases/moderation/clean-expired-sanctions.use-case.ts
import { UserRepository } from '../../repositories/user.repository';
import { SanctionRepository } from '../../repositories/sanction.repository';
import { ActivityLogRepository } from '../../repositories/activity-log.repository';

export interface ExpiredSanctionsCleanupResult {
  processedSanctions: number;
  updatedUsers: number;
  errors: number;
  startTime: Date;
  endTime: Date;
  executionTimeMs: number;
  details: Array<{
    sanctionId: number;
    userId: number;
    sanctionType: string;
    action: 'deactivated' | 'user_updated' | 'error';
    error?: string;
  }>;
}

export class CleanExpiredSanctions {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly sanctionRepository: SanctionRepository,
    private readonly activityLogRepository: ActivityLogRepository
  ) {}

  async execute(): Promise<ExpiredSanctionsCleanupResult> {
    const startTime = new Date();
    let processedSanctions = 0;
    let updatedUsers = 0;
    let errors = 0;
    const details: ExpiredSanctionsCleanupResult['details'] = [];

    try {
      // 1. Usar método existente para desactivar sanciones expiradas
      const deactivatedCount = await this.sanctionRepository.deactivateExpiredSanctions();
      console.log(`🔧 [CleanExpiredSanctions] Deactivated ${deactivatedCount} expired sanctions`);

      if (deactivatedCount === 0) {
        const endTime = new Date();
        return {
          processedSanctions: 0,
          updatedUsers: 0,
          errors: 0,
          startTime,
          endTime,
          executionTimeMs: endTime.getTime() - startTime.getTime(),
          details: []
        };
      }

      // 2. Obtener usuarios que podrían necesitar actualizaciones por sanciones que acaban de expirar
      const usersToUpdate = await this.getUsersWithExpiredSanctions();

      // 3. Actualizar estado de usuarios afectados
      for (const userId of usersToUpdate) {
        try {
          const updated = await this.updateUserSanctionStatus(userId);
          if (updated) {
            updatedUsers++;
            details.push({
              sanctionId: 0, // Multiple sanctions
              userId,
              sanctionType: 'multiple',
              action: 'user_updated'
            });
          }
        } catch (error) {
          errors++;
          details.push({
            sanctionId: 0,
            userId,
            sanctionType: 'update_error',
            action: 'error',
            error: error instanceof Error ? error.message : 'Unknown error'
          });
          console.error(`Failed to update user ${userId}:`, error);
        }
      }

      processedSanctions = deactivatedCount;

      // 4. Log de actividad si procesamos algo
      if (processedSanctions > 0) {
        await this.logCleanupActivity(processedSanctions, updatedUsers, errors);
      }

      const endTime = new Date();
      return {
        processedSanctions,
        updatedUsers,
        errors,
        startTime,
        endTime,
        executionTimeMs: endTime.getTime() - startTime.getTime(),
        details
      };

    } catch (error) {
      console.error('Critical error in sanctions cleanup:', error);
      throw error;
    }
  }

  /**
   * Obtener IDs de usuarios que tienen sanciones que podrían haber expirado
   */
  private async getUsersWithExpiredSanctions(): Promise<number[]> {
    try {
      // Buscar usuarios que tienen o tenían sanciones activas que afectan su estado
      const filters = { isActive: false }; // Recién desactivadas
      const result = await this.sanctionRepository.findMany(filters, { page: 1, limit: 1000 });
      
      // Extraer IDs únicos de usuarios
      const userIds = [...new Set(
        result.data
          .filter(sanction => ['temp_suspend', 'silence', 'restriction'].includes(sanction.sanctionType))
          .map(sanction => sanction.userId)
      )];

      return userIds;
    } catch (error) {
      console.error('Error getting users with expired sanctions:', error);
      return [];
    }
  }

  /**
   * Actualizar el estado de un usuario basado en sus sanciones activas actuales
   */
  private async updateUserSanctionStatus(userId: number): Promise<boolean> {
    try {
      // Obtener sanciones activas actuales del usuario
      const activeSanctions = await this.sanctionRepository.findActiveSanctionsForUser(userId);
      
      // Determinar el nuevo estado basado en sanciones activas
      const updates: any = {};
      
      // Check ban status
      const banSanctions = activeSanctions.filter(s => 
        ['temp_suspend', 'permanent_ban', 'ip_ban'].includes(s.sanctionType)
      );
      
      if (banSanctions.length === 0) {
        // No hay bans activos, remover ban si existía
        updates.isBanned = false;
        updates.bannedAt = null;
        updates.bannedBy = null;
        updates.banReason = null;
      }

      // Check silence status
      const silenceSanctions = activeSanctions.filter(s => s.sanctionType === 'silence');
      
      if (silenceSanctions.length === 0) {
        // No hay silencios activos, remover silencio si existía
        updates.isSilenced = false;
        updates.silencedUntil = null;
      }

      // Solo actualizar si hay cambios
      if (Object.keys(updates).length > 0) {
        await this.userRepository.updateById(userId, updates);
        console.log(`📝 Updated user ${userId} status:`, updates);
        return true;
      }

      return false;
    } catch (error) {
      console.error(`Error updating user ${userId} status:`, error);
      throw error;
    }
  }

  /**
   * Registrar la actividad de limpieza en el log
   */
  private async logCleanupActivity(processed: number, updated: number, errors: number): Promise<void> {
    try {
      // Buscar el primer admin para usar como "usuario sistema" en los logs
      const systemUser = await this.userRepository.findByRole('admin');
      const systemUserId = systemUser.length > 0 ? systemUser[0].id : null;
      
      if (systemUserId) {
        await this.activityLogRepository.create({
          userId: systemUserId, // Primer admin como usuario sistema
          action: 'sanctions_cleanup',
          details: {
            processedSanctions: processed,
            updatedUsers: updated,
            errors,
            timestamp: new Date().toISOString(),
            automated: true,
            systemAction: true // Flag para indicar que es acción automática
          },
          ipAddress: '127.0.0.1',
          userAgent: 'System-Cleanup-Task'
        });
        console.log('📝 Cleanup activity logged successfully');
      } else {
        console.log('⚠️ No admin user found for logging, skipping activity log');
      }
    } catch (error) {
      console.error('Failed to log cleanup activity:', error);
      // No lanzar error aquí para no interrumpir el proceso principal
    }
  }
}