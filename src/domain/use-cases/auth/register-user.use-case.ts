// src/domain/use-cases/auth/register-user.use-case.ts - CORREGIDO
import { UserRepository } from '../../repositories/user.repository';
import { InviteCodeRepository } from '../../repositories/invite-code.repository';
import { UserErrors, ValidationErrors, InviteCodeErrors } from '../../../shared/errors';
import { bcryptAdapter } from '../../../config/bcrypt.adapter';
import { JwtAdapter } from '../../../config/jwt.adapter';
import { SendVerificationEmail } from '../email/send-verification-email.use-case';

// DTOs actualizados
export interface RegisterUserDto {
  username: string;
  email: string;
  password: string;
  inviteCode: string;
}

export interface AuthResponseDto {
  user: {
    id: number;
    username: string;
    email: string;
    role: {
      id: number;
      name: string;
    };
    reputation: number;
    createdAt: Date;
    isEmailVerified: boolean; // ✅ CAMPO CONSISTENTE
    emailVerifiedAt?: Date | null; // ✅ CAMPO CONSISTENTE
  };
  token: string;
  inviteCodeUsed: string;
  emailVerificationSent: boolean;
}

interface RegisterUserUseCase {
  execute(registerDto: RegisterUserDto): Promise<AuthResponseDto>;
}

export class RegisterUser implements RegisterUserUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly inviteCodeRepository: InviteCodeRepository,
    private readonly sendVerificationEmail: SendVerificationEmail
  ) {}

  async execute(registerDto: RegisterUserDto): Promise<AuthResponseDto> {
    // ✅ NORMALIZAR DATOS ANTES DE VALIDAR
    registerDto.username = registerDto.username.trim();
    registerDto.email = registerDto.email.trim().toLowerCase();
    registerDto.inviteCode = registerDto.inviteCode.trim().toUpperCase();

    const { username, email, password, inviteCode } = registerDto;

    // 1. Validaciones básicas (incluye validación del código)
    this.validateInput(username, email, password, inviteCode);

    // 2. 🔥 VALIDAR CÓDIGO DE INVITACIÓN (PASO CRÍTICO)
    const inviteCodeEntity = await this.validateInviteCode(inviteCode);

    // 3. Verificar que el email no exista
    const existingUserByEmail = await this.userRepository.findByEmail(email);
    if (existingUserByEmail) {
      throw UserErrors.emailAlreadyExists(email);
    }

    // 4. Verificar que el username no exista
    const existingUserByUsername = await this.userRepository.findByUsername(username);
    if (existingUserByUsername) {
      throw UserErrors.usernameAlreadyExists(username);
    }

    // 5. Encriptar contraseña con bcrypt
    const hashedPassword = bcryptAdapter.hash(password);

    // 6. Crear usuario (rol 'user' por defecto = id 3, EMAIL NO VERIFICADO)
    const newUser = await this.userRepository.create({
      username: username,
      email: email,
      passwordHash: hashedPassword,
      roleId: 3 // role 'user' por defecto
    });

    // 7. 🔥 MARCAR CÓDIGO DE INVITACIÓN COMO USADO
    await this.inviteCodeRepository.markAsUsed(inviteCode, newUser.id);

    // 8. ✅ ENVIAR EMAIL DE VERIFICACIÓN
    let emailVerificationSent = false;
    try {
      await this.sendVerificationEmail.execute({ userId: newUser.id });
      emailVerificationSent = true;
      console.log(`📧 Verification email sent to ${email}`);
    } catch (error) {
      console.error('❌ Failed to send verification email:', error);
      // No fallar el registro, solo logear el error
    }

    // 9. Generar JWT con id y email
    const token = JwtAdapter.generateToken({
      userId: newUser.id,
      email: newUser.email
    });

    if (!token) {
      throw new Error('Error generating authentication token');
    }

    // 10. ✅ CORREGIDO: Retornar respuesta CON información de verificación
    return {
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        role: newUser.role!,
        reputation: newUser.reputation,
        createdAt: newUser.createdAt,
        isEmailVerified: newUser.isEmailVerified || false, // ✅ AGREGADO
        emailVerifiedAt: newUser.emailVerifiedAt || null   // ✅ AGREGADO
      },
      token,
      inviteCodeUsed: inviteCode,
      emailVerificationSent
    };
  }

  private async validateInviteCode(code: string) {
    // 1. Buscar el código
    const inviteCodeEntity = await this.inviteCodeRepository.findByCode(code);

    if (!inviteCodeEntity) {
      throw InviteCodeErrors.codeNotFound(code);
    }

    // 2. Verificar si ya está usado
    if (inviteCodeEntity.isUsed()) {
      throw InviteCodeErrors.codeAlreadyUsed(
        code,
        inviteCodeEntity.user!.username,
        inviteCodeEntity.usedAt!
      );
    }

    // 3. Verificar si está expirado (7 días)
    if (inviteCodeEntity.isExpired(168)) {
      const expiresAt = new Date(inviteCodeEntity.createdAt);
      expiresAt.setDate(expiresAt.getDate() + 7);

      throw InviteCodeErrors.codeExpired(code, expiresAt);
    }

    return inviteCodeEntity;
  }

  private validateInput(username: string, email: string, password: string, inviteCode: string): void {
    // Username validation
    if (!username || username.length === 0) {
      throw ValidationErrors.requiredField('Username');
    }
    if (username.length < 3) {
      throw ValidationErrors.minLength('Username', 3);
    }
    if (username.length > 30) {
      throw ValidationErrors.maxLength('Username', 30);
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      throw ValidationErrors.invalidFormat('Username', 'letters, numbers, and underscores only');
    }

    // Email validation
    if (!email || email.length === 0) {
      throw ValidationErrors.requiredField('Email');
    }
    if (!this.isValidEmail(email)) {
      throw ValidationErrors.invalidFormat('Email', 'valid email address');
    }

    // Password validation
    if (!password || password.length === 0) {
      throw ValidationErrors.requiredField('Password');
    }
    if (password.length < 6) {
      throw ValidationErrors.minLength('Password', 6);
    }

    // Invite code validation
    if (!inviteCode || inviteCode.length === 0) {
      throw ValidationErrors.requiredField('Invite code');
    }
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}
