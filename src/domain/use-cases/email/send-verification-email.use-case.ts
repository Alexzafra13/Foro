import { EmailVerificationTokenRepository } from '../../repositories/email-verification-token.repository';
import { UserRepository } from '../../repositories/user.repository';
import { EmailAdapter } from '@/config/email.adapter'; 
import { UserErrors } from '../../../shared/errors';
import { EmailVerificationTokenEntity } from '@/domain/entities/email-verification-token.entity'; 
import { envs } from '../../../config/envs';

export interface SendVerificationEmailRequestDto {
  userId: number;
}

export interface SendVerificationEmailResponseDto {
  success: boolean;
  message: string;
  tokenId: number;
  expiresAt: Date;
}

interface SendVerificationEmailUseCase {
  execute(dto: SendVerificationEmailRequestDto): Promise<SendVerificationEmailResponseDto>;
}

export class SendVerificationEmail implements SendVerificationEmailUseCase {
  constructor(
    private readonly emailVerificationTokenRepository: EmailVerificationTokenRepository,
    private readonly userRepository: UserRepository,
    private readonly emailAdapter: EmailAdapter
  ) {}

  async execute(dto: SendVerificationEmailRequestDto): Promise<SendVerificationEmailResponseDto> {
    const { userId } = dto;

    // 1. Verificar que el usuario existe
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw UserErrors.userNotFound(userId);
    }

    // 2. Verificar que el email no está ya verificado
    if (user.isEmailVerified) {
      throw new Error('Email is already verified');
    }

    // 3. Limpiar tokens antiguos del usuario
    await this.emailVerificationTokenRepository.deleteByUserId(userId);

    // 4. Generar token único
    const token = EmailVerificationTokenEntity.generateToken();
    const expiresAt = EmailVerificationTokenEntity.calculateExpirationDate(24); // 24 horas

    // 5. Guardar token en la base de datos
    const verificationToken = await this.emailVerificationTokenRepository.create({
      userId,
      token,
      expiresAt
    });

    // 6. Generar link de verificación
    const verificationLink = `${envs.FRONTEND_URL}/verify-email?token=${token}`;

    // 7. Preparar el contenido del email
    const emailHtml = this.generateVerificationEmailHtml(user.username, verificationLink);
    const emailText = this.generateVerificationEmailText(user.username, verificationLink);

    // 8. Enviar email
    const emailSent = await this.emailAdapter.sendEmail({
      to: user.email,
      subject: '✅ Verifica tu cuenta en el Foro',
      html: emailHtml,
      text: emailText
    });

    if (!emailSent) {
      throw new Error('Failed to send verification email');
    }

    // 9. Retornar respuesta
    return {
      success: true,
      message: 'Verification email sent successfully',
      tokenId: verificationToken.id,
      expiresAt: verificationToken.expiresAt
    };
  }

  private generateVerificationEmailHtml(username: string, verificationLink: string): string {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Verificación de Email</title>
        <style>
            .container { max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; }
            .header { background: #2563eb; color: white; padding: 20px; text-align: center; }
            .content { padding: 30px 20px; }
            .button { 
                display: inline-block; 
                background: #10b981; 
                color: white; 
                padding: 12px 30px; 
                text-decoration: none; 
                border-radius: 5px; 
                margin: 20px 0;
            }
            .footer { background: #f3f4f6; padding: 20px; text-align: center; color: #6b7280; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🎉 ¡Bienvenido al Foro!</h1>
            </div>
            <div class="content">
                <h2>Hola ${username},</h2>
                <p>Gracias por registrarte en nuestro foro. Para completar tu registro y poder acceder a todas las funcionalidades, necesitas verificar tu dirección de email.</p>
                
                <p><strong>Haz click en el siguiente botón para verificar tu cuenta:</strong></p>
                
                <a href="${verificationLink}" class="button">✅ Verificar Mi Email</a>
                
                <p>Si el botón no funciona, copia y pega este enlace en tu navegador:</p>
                <p style="word-break: break-all; color: #2563eb;">${verificationLink}</p>
                
                <p><strong>⏰ Este enlace expira en 24 horas.</strong></p>
                
                <hr style="margin: 30px 0;">
                
                <p><small>Si no te registraste en nuestro foro, puedes ignorar este email.</small></p>
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

  private generateVerificationEmailText(username: string, verificationLink: string): string {
    return `
¡Bienvenido al Foro, ${username}!

Gracias por registrarte en nuestro foro. Para completar tu registro y poder acceder a todas las funcionalidades, necesitas verificar tu dirección de email.

Haz click en el siguiente enlace para verificar tu cuenta:
${verificationLink}

⏰ Este enlace expira en 24 horas.

Si no te registraste en nuestro foro, puedes ignorar este email.

---
Foro Platform - Comunidad Privada
Este email fue enviado automáticamente, no responder.
    `;
  }
}