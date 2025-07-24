import { compareSync, genSaltSync, hashSync } from 'bcryptjs';
import { envs } from './envs';

export const bcryptAdapter = {
  hash: (password: string): string => {
    const salt = genSaltSync(envs.BCRYPT_ROUNDS);
    return hashSync(password, salt);
  },
  
  compare: (password: string, hashed: string): boolean => {
    return compareSync(password, hashed);
  }
};