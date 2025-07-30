import { UserRepository } from '../../repositories/user.repository';
import { PasswordResetTokenRepository } from '../../repositories/password-reset-token.repository';
import { EmailAdapter } from '../../../config/email.adapter';
import { ActivityLogRepository } from '../../repositories/activity-log.repository';
import { UserErrors } from '../../../shared/errors';
import { PasswordResetTokenEntity } from '../../entities/password-reset-token.entity';
import { ActivityLogEntity } from '../../entities/activity-log.entity';
import { envs } from '../../../config/envs';

export interface RequestPasswordResetDto {
  email: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface RequestPasswordResetResponseDto {
  success: boolean;
  message: string;
  expiresAt: Date;
}

interface RequestPasswordResetUseCase {
  execute(dto: RequestPasswordResetDto): Promise<RequestPasswordResetResponseDto>;
}

export class RequestPasswordReset implements RequestPasswordResetUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly passwordResetTokenRepository: PasswordResetTokenRepository,
    private readonly emailAdapter: EmailAdapter,
    private readonly activityLogRepository: ActivityLogRepository
  ) {}

  async execute(dto: RequestPasswordResetDto): Promise<RequestPasswordResetResponseDto> {
    const { email, ipAddress, userAgent } = dto;

    // 1. Validar email
    const normalizedEmail = email.toLowerCase().trim();
    if (!this.isValidEmail(normalizedEmail)) {
      throw UserErrors.invalidCredentials(); // No revelar si el email existe
    }

    // 2. Buscar usuario
    const user = await this.userRepository.findByEmail(normalizedEmail);
    if (!user) {
      // Por seguridad, no revelar si el email existe
      // Pero simular el proceso igual
      await this.simulateDelay();
      return {
        success: true,
        message: 'If the email exists, you will receive reset instructions',
        expiresAt: PasswordResetTokenEntity.calculateExpirationDate(1)
      };
    }

    // 3. Verificar que el usuario no esté baneado
    if (user.isBanned) {
      throw UserErrors.insufficientPermissions();
    }

    // 4. Limpiar tokens antiguos del usuario
    await this.passwordResetTokenRepository.deleteByUserId(user.id);

    // 5. Generar nuevo token
    const token = PasswordResetTokenEntity.generateToken();
    const expiresAt = PasswordResetTokenEntity.calculateExpirationDate(1); // 1 hora

    // 6. Guardar token en la base de datos
    const resetToken = await this.passwordResetTokenRepository.create({
      userId: user.id,
      token,
      expiresAt
    });

    // 7. Enviar email de recuperación
    const resetLink = `${envs.FRONTEND_URL}/reset-password?token=${token}`;
    
    const emailSent = await this.sendPasswordResetEmail(
      user.email,
      user.username,
      resetLink
    );

    if (!emailSent) {
      // No fallar la operación, pero logear el error
      console.error('Failed to send password reset email to:', user.email);
    }

    // 8. Registrar actividad
    try {
      const activityLog = ActivityLogEntity.createPasswordResetRequestLog(
        user.id,
        ipAddress,
        userAgent
      );
      await this.activityLogRepository.create(activityLog);
    } catch (error) {
      console.error('Error logging password reset request:', error);
    }

    // 9. Retornar respuesta (siempre exitosa por seguridad)
    return {
      success: true,
      message: 'If the email exists, you will receive reset instructions',
      expiresAt: resetToken.expiresAt
    };
  }

  private async sendPasswordResetEmail(
    email: string,
    username: string,
    resetLink: string
  ): Promise<boolean> {
    const emailHtml = this.generatePasswordResetEmailHtml(username, resetLink);
    const emailText = this.generatePasswordResetEmailText(username, resetLink);

    return await this.emailAdapter.sendEmail({
      to: email,
      subject: '🔐 Recuperar contraseña - Foro',
      html: emailHtml,
      text: emailText
    });
  }

  private generatePasswordResetEmailHtml(username: string, resetLink: string): string {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Recuperar Contraseña</title>
        <style>
            .container { max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; }
            .header { background: #dc3545; color: white; padding: 20px; text-align: center; }
            .content { padding: 30px 20px; }
            .button { 
                display: inline-block; 
                background: #dc3545; 
                color: white; 
                padding: 12px 30px; 
                text-decoration: none; 
                border-radius: 5px; 
                margin: 20px 0;
            }
            .warning { 
                background: #fff3cd; 
                border: 1px solid #ffeaa7; 
                padding: 15px; 
                border-radius: 5px; 
                margin: 20px 0; 
            }
            .footer { background: #f3f4f6; padding: 20px; text-align: center; color: #6b7280; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🔐 Recuperar Contraseña</h1>
            </div>
            <div class="content">
                <h2>Hola ${username},</h2>
                <p>Hemos recibido una solicitud para restablecer la contraseña de tu cuenta en el foro.</p>
                
                <p><strong>Haz click en el siguiente botón para crear una nueva contraseña:</strong></p>
                
                <a href="${resetLink}" class="button">🔐 Restablecer Contraseña</a>
                
                <p>Si el botón no funciona, copia y pega este enlace en tu navegador:</p>
                <p style="word-break: break-all; color: #dc3545;">${resetLink}</p>
                
                <div class="warning">
                    <strong>⚠️ Importante:</strong>
                    <ul>
                        <li>Este enlace expira en <strong>1 hora</strong></li>
                        <li>Solo puedes usarlo una vez</li>
                        <li>Si no solicitaste este cambio, ignora este email</li>
                    </ul>
                </div>
                
                <hr style="margin: 30px 0;">
                
                <p><small>Si no solicitaste este restablecimiento, tu cuenta sigue siendo segura. Simplemente ignora este email.</small></p>
            </div>
            <div class="footer">
                <p>Foro Platform - Comunidad Privada</p>
                <p>Este email fue enviado automáticamente, no responder.</p>
            </div>
        </div>
    </body>
    </html>
    `;
  }

  private generatePasswordResetEmailText(username: string, resetLink: string): string {
    return `
🔐 Recuperar Contraseña - ${username}

Hemos recibido una solicitud para restablecer la contraseña de tu cuenta en el foro.

Haz click en el siguiente enlace para crear una nueva contraseña:
${resetLink}

⚠️ IMPORTANTE:
- Este enlace expira en 1 hora
- Solo puedes usarlo una vez
- Si no solicitaste este cambio, ignora este email

Si no solicitaste este restablecimiento, tu cuenta sigue siendo segura.

---
Foro Platform - Comunidad Privada
Este email fue enviado automáticamente, no responder.
    `;
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private async simulateDelay(): Promise<void> {
    // Simular delay para no revelar timing de emails existentes vs no existentes
    await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 500));
  }
}
