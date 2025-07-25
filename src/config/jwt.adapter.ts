// src/config/jwt.adapter.ts
import jwt, { SignOptions } from 'jsonwebtoken';
import { envs } from './envs';

const JWT_SECRET = envs.JWT_SECRET;

export class JwtAdapter {
  static generateToken(
    payload: object,
    duration: SignOptions['expiresIn'] = envs.JWT_EXPIRES_IN as SignOptions['expiresIn']
  ): string | null {
    try {
      return jwt.sign(payload, JWT_SECRET, { expiresIn: duration });
    } catch {
      return null;
    }
  }

  static validateToken<T = any>(token: string): T | null {
    try {
      return jwt.verify(token, JWT_SECRET) as T;
    } catch {
      return null;
    }
  }
}
