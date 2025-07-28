import { UserRepository } from '../../repositories/user.repository';
import { InviteCodeRepository } from '@/domain/repositories/invite-code.repository'; 
import { UserErrors, ValidationErrors, InviteCodeErrors } from '../../../shared/errors';
import { bcryptAdapter } from '../../../config/bcrypt.adapter'; 
import { JwtAdapter } from '../../../config/jwt.adapter';

// DTOs actualizados para incluir invite code
export interface RegisterUserDto {
  username: string;
  email: string;
  password: string;
  inviteCode: string; // ¡NUEVO CAMPO REQUERIDO!
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
  };
  token: string;
  inviteCodeUsed: string; // Info del código usado
}

interface RegisterUserUseCase {
  execute(registerDto: RegisterUserDto): Promise<AuthResponseDto>;
}

export class RegisterUser implements RegisterUserUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly inviteCodeRepository: InviteCodeRepository
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

    // 6. Crear usuario (rol 'user' por defecto = id 3)
    const newUser = await this.userRepository.create({
      username: username,
      email: email,
      passwordHash: hashedPassword,
      roleId: 3 // role 'user' por defecto
    });

    // 7. 🔥 MARCAR CÓDIGO DE INVITACIÓN COMO USADO
    await this.inviteCodeRepository.markAsUsed(inviteCode, newUser.id);

    // 8. Generar JWT con id y email
    const token = JwtAdapter.generateToken({
      userId: newUser.id,
      email: newUser.email
    });

    if (!token) {
      throw new Error('Error generating authentication token');
    }

    // 9. Retornar respuesta sin contraseña + info del código
    return {
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        role: newUser.role!,
        reputation: newUser.reputation,
        createdAt: newUser.createdAt
      },
      token,
      inviteCodeUsed: inviteCode
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
    // Validar invite code PRIMERO
    if (!inviteCode || inviteCode.trim().length === 0) {
      throw ValidationErrors.requiredField('Invite code');
    }

    if (inviteCode.trim().length < 6) {
      throw ValidationErrors.minLength('Invite code', 6);
    }

    // Validar username
    if (!username || username.trim().length < 3) {
      throw ValidationErrors.minLength('Username', 3);
    }

    if (username.trim().length > 32) {
      throw ValidationErrors.maxLength('Username', 32);
    }

    // Validar email
    if (!email || !this.isValidEmail(email)) {
      throw ValidationErrors.invalidFormat('Email', 'valid email address');
    }

    if (email.length > 100) {
      throw ValidationErrors.maxLength('Email', 100);
    }

    // Validar password
    if (!password || password.length < 6) {
      throw ValidationErrors.minLength('Password', 6);
    }

    if (password.length > 100) {
      throw ValidationErrors.maxLength('Password', 100);
    }
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}
