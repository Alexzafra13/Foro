// src/domain/use-cases/auth/login-user.use-case.ts - CORREGIDO
import { UserRepository } from '../../repositories/user.repository';
import { UserErrors, ValidationErrors } from '../../../shared/errors';
import { bcryptAdapter } from '../../../config/bcrypt.adapter';
import { JwtAdapter } from '../../../config/jwt.adapter';
// ✅ QUITAR ESTA LÍNEA: import { AuthenticationErrors } from '../../../shared/errors';

// DTOs para el use case
export interface LoginUserDto {
  email: string;
  password: string;
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
    isEmailVerified: boolean;
    emailVerifiedAt?: Date | null;
  };
  token: string;
}

interface LoginUserUseCase {
  execute(loginDto: LoginUserDto): Promise<AuthResponseDto>;
}

export class LoginUser implements LoginUserUseCase {
  constructor(private readonly userRepository: UserRepository) {}

  async execute(loginDto: LoginUserDto): Promise<AuthResponseDto> {
    const { email, password } = loginDto;

    // 1. Validaciones básicas
    this.validateInput(email, password);

    // 2. Buscar usuario por email
    const user = await this.userRepository.findByEmail(email.toLowerCase().trim());
    if (!user) {
      throw UserErrors.invalidCredentials();
    }

    // 3. ✅ VERIFICAR SI ESTÁ BANEADO - ARREGLADO EL TIPO:
    if (user.isBanned) {
      throw UserErrors.accountBanned(user.banReason || undefined);
    }

    // 4. Verificar contraseña con bcrypt
    const isPasswordValid = bcryptAdapter.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw UserErrors.invalidCredentials();
    }

    // 5. Actualizar lastLoginAt
    await this.userRepository.updateById(user.id, {
      lastLoginAt: new Date()
    });

    // 6. Generar JWT con id y email
    const token = JwtAdapter.generateToken({
      userId: user.id,
      email: user.email
    });

    if (!token) {
      throw new Error('Error generating authentication token');
    }

    // 7. Retornar respuesta
    return {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role!,
        reputation: user.reputation,
        createdAt: user.createdAt,
        isEmailVerified: user.isEmailVerified || false,
        emailVerifiedAt: user.emailVerifiedAt || null
      },
      token
    };
  }

  private validateInput(email: string, password: string): void {
    // Validar email
    if (!email || email.trim().length === 0) {
      throw ValidationErrors.requiredField('Email');
    }
    if (!this.isValidEmail(email)) {
      throw ValidationErrors.invalidFormat('Email', 'valid email address');
    }

    // Validar password
    if (!password || password.length === 0) {
      throw ValidationErrors.requiredField('Password');
    }
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}