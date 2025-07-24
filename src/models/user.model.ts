export interface CreateUserDto {
  username: string;
  email: string;
  password: string;
  roleId?: number;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface UserResponse {
  id: number;
  username: string;
  email: string;
  reputation: number;
  role: {
    name: string;
  };
  createdAt: Date;
}