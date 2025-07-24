// src/services/user.service.ts
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { UserRepository } from '../repositories/user.repository';
import { CreateUserDto, LoginDto, UserResponse } from '../models/user.model';
import { envs } from '../config/envs';

export class UserService {
  private userRepository = new UserRepository();

  async register(userData: CreateUserDto): Promise<UserResponse> {
    // Verificar si el usuario ya existe
    const existingUser = await this.userRepository.findByEmail(userData.email);
    if (existingUser) {
      throw new Error('El usuario ya existe');
    }

    // Encriptar contraseña
    const hashedPassword = await bcrypt.hash(userData.password, envs.BCRYPT_ROUNDS);
    
    // Crear usuario (role por defecto: 4 = 'user')
    const user = await this.userRepository.create({
      ...userData,
      password: hashedPassword,
      roleId: userData.roleId || 4
    });

    // Retornar sin la contraseña
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      reputation: user.reputation,
      role: user.role,
      createdAt: user.createdAt
    };
  }

  async login(loginData: LoginDto): Promise<{ user: UserResponse; token: string }> {
    // Buscar usuario
    const user = await this.userRepository.findByEmail(loginData.email);
    if (!user) {
      throw new Error('Credenciales inválidas');
    }

    // Verificar contraseña
    const isValidPassword = await bcrypt.compare(loginData.password, user.passwordHash);
    if (!isValidPassword) {
      throw new Error('Credenciales inválidas');
    }

    // Generar JWT
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      envs.JWT_SECRET,
      { expiresIn: envs.JWT_EXPIRES_IN }
    );

    const userResponse: UserResponse = {
      id: user.id,
      username: user.username,
      email: user.email,
      reputation: user.reputation,
      role: user.role,
      createdAt: user.createdAt
    };

    return { user: userResponse, token };
  }
}