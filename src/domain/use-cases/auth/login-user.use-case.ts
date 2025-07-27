import { UserRepository } from '../../repositories/user.repository';
import { UserErrors, ValidationErrors } from '../../../shared/errors';
import { bcryptAdapter } from '../../../config/bcrypt.adapter';
import { JwtAdapter } from '../../../config/jwt.adapter';

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
  };
  token: string;
}

// Interface del use case
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

    // 3. Verificar contraseña con bcrypt
    const isPasswordValid = bcryptAdapter.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw UserErrors.invalidCredentials();
    }

    // 4. Generar JWT con id y email
    const token = JwtAdapter.generateToken({
      userId: user.id,
      email: user.email
    });

    if (!token) {
      throw new Error('Error generating authentication token');
    }

    // 5. Retornar respuesta sin contraseña
    return {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role!,
        reputation: user.reputation,
        createdAt: user.createdAt
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