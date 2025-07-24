// src/config/jwt.adapter.ts
import jwt from 'jsonwebtoken';
import { envs } from './envs';

export class JwtAdapter {
  static async generateToken(
    payload: { userId: number; email: string }, 
    duration: string = envs.JWT_EXPIRES_IN
  ): Promise<string | null> {
    return new Promise((resolve) => {
      jwt.sign(payload, envs.JWT_SECRET, { expiresIn: duration }, (err, token) => {
        if (err) return resolve(null);
        resolve(token!);
      });
    });
  }

  static validateToken<T = any>(token: string): T | null {
    try {
      return jwt.verify(token, envs.JWT_SECRET) as T;
    } catch {
      return null;
    }
  }
}