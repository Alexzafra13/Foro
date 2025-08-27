// src/infrastructure/tasks/sanctions-cleanup.task.ts
import { CleanExpiredSanctions } from '../../domain/use-cases/moderation/clean-expired-sanctions.use-case';
import { Dependencies } from '../dependencies';

export class SanctionsCleanupTask {
  private isRunning = false;
  private intervalId: NodeJS.Timeout | null = null;
  private cleanupUseCase: CleanExpiredSanctions | null = null;

  /**
   * Inicializar el task con dependencias
   */
  private async initializeIfNeeded(): Promise<void> {
    if (!this.cleanupUseCase) {
      const deps = await Dependencies.create();
      this.cleanupUseCase = new CleanExpiredSanctions(
        deps.repositories.userRepository,
        deps.repositories.sanctionRepository,
        deps.repositories.activityLogRepository
      );
    }
  }

  /**
   * Ejecutar limpieza una vez
   */
  async executeOnce(): Promise<void> {
    if (this.isRunning) {
      console.log('⏸️ [SanctionsCleanup] Already running, skipping...');
      return;
    }

    this.isRunning = true;
    const startTime = new Date();
    
    try {
      await this.initializeIfNeeded();
      
      console.log('🧹 [SanctionsCleanup] Starting cleanup...');
      const result = await this.cleanupUseCase!.execute();
      
      if (result.processedSanctions > 0 || result.updatedUsers > 0 || result.errors > 0) {
        console.log('✅ [SanctionsCleanup] Cleanup completed:', {
          processed: result.processedSanctions,
          updated: result.updatedUsers,
          errors: result.errors,
          executionTime: `${result.executionTimeMs}ms`
        });
        
        // Log detalles si hay errores
        if (result.errors > 0) {
          console.warn('⚠️ [SanctionsCleanup] Some errors occurred:', 
            result.details.filter(d => d.action === 'error')
          );
        }
      } else {
        console.log('✨ [SanctionsCleanup] No expired sanctions found');
      }
      
    } catch (error) {
      console.error('❌ [SanctionsCleanup] Failed:', error);
      
      // En caso de error crítico, intentar reinicializar dependencias en la próxima ejecución
      this.cleanupUseCase = null;
    } finally {
      this.isRunning = false;
      
      const executionTime = new Date().getTime() - startTime.getTime();
      console.log(`⏱️ [SanctionsCleanup] Execution completed in ${executionTime}ms`);
    }
  }

  /**
   * Programar ejecución periódica
   */
  schedulePeriodicCleanup(intervalMinutes: number = 30): void {
    if (this.intervalId) {
      console.log('⚠️ [SanctionsCleanup] Already scheduled, clearing previous schedule');
      this.stop();
    }

    console.log(`⏰ [SanctionsCleanup] Scheduling cleanup every ${intervalMinutes} minutes`);
    
    // Configurar intervalo
    this.intervalId = setInterval(async () => {
      try {
        await this.executeOnce();
      } catch (error) {
        console.error('❌ [SanctionsCleanup] Scheduled execution failed:', error);
      }
    }, intervalMinutes * 60 * 1000);

    // Ejecutar una vez al iniciar (después de 5 segundos para que el servidor termine de inicializar)
    setTimeout(async () => {
      try {
        console.log('🚀 [SanctionsCleanup] Running initial cleanup...');
        await this.executeOnce();
      } catch (error) {
        console.error('❌ [SanctionsCleanup] Initial execution failed:', error);
      }
    }, 5000);
  }

  /**
   * Detener ejecución programada
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('🛑 [SanctionsCleanup] Scheduled cleanup stopped');
    }
  }

  /**
   * Verificar si está ejecutándose
   */
  isCurrentlyRunning(): boolean {
    return this.isRunning;
  }

  /**
   * Obtener información de estado
   */
  getStatus(): {
    isRunning: boolean;
    isScheduled: boolean;
    nextExecution?: string;
  } {
    return {
      isRunning: this.isRunning,
      isScheduled: this.intervalId !== null,
      nextExecution: this.intervalId ? 'Scheduled' : 'Not scheduled'
    };
  }
}