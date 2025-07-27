import { UserRepository } from '../../repositories/user.repository';
import { UserEntity } from '../../entities/user.entity';
import { UserErrors, ValidationErrors } from '../../../shared/errors';
import { bcryptAdapter } from '../../../config/bcrypt.adapter';
import { JwtAdapter } from '../../../config/jwt.adapter';

// DTOs para el use case
export interface RegisterUserDto {
  username: string;
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
interface RegisterUserUseCase {
  execute(registerDto: RegisterUserDto): Promise<AuthResponseDto>;
}

export class RegisterUser implements RegisterUserUseCase {
  constructor(private readonly userRepository: UserRepository) {}

  async execute(registerDto: RegisterUserDto): Promise<AuthResponseDto> {
    const { username, email, password } = registerDto;

    // 1. Validaciones básicas
    this.validateInput(username, email, password);

    // 2. Verificar que el email no exista
    const existingUserByEmail = await this.userRepository.findByEmail(email);
    if (existingUserByEmail) {
      throw UserErrors.emailAlreadyExists(email);
    }

    // 3. Verificar que el username no exista
    const existingUserByUsername = await this.userRepository.findByUsername(username);
    if (existingUserByUsername) {
      throw UserErrors.usernameAlreadyExists(username);
    }

    // 4. Encriptar contraseña con bcrypt
    const hashedPassword = bcryptAdapter.hash(password);

    // 5. Crear usuario (rol 'user' por defecto = id 3)
    const newUser = await this.userRepository.create({
      username: username.trim(),
      email: email.toLowerCase().trim(),
      passwordHash: hashedPassword,
      roleId: 3 // role 'user' por defecto
    });

    // 6. Generar JWT con id y email
    const token = JwtAdapter.generateToken({
      userId: newUser.id,
      email: newUser.email
    });

    if (!token) {
      throw new Error('Error generating authentication token');
    }

    // 7. Retornar respuesta sin contraseña
    return {
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        role: newUser.role!,
        reputation: newUser.reputation,
        createdAt: newUser.createdAt
      },
      token
    };
  }

  private validateInput(username: string, email: string, password: string): void {
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