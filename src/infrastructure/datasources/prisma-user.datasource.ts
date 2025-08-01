import { PrismaClient } from '@prisma/client';
import { UserDatasource, CreateUserDto } from '../../domain/datasources/user.datasource';
import { UserEntity } from '../../domain/entities/user.entity';

interface UpdateUserData {
  username?: string;
  email?: string;
  passwordHash?: string;
  reputation?: number;
  roleId?: number;
  avatarUrl?: string | null;
  bio?: string | null;  // ✅ AGREGAR ESTA LÍNEA
}

export class PrismaUserDatasource implements UserDatasource {
  constructor(private readonly prisma: PrismaClient) {}

  async create(createUserDto: CreateUserDto): Promise<UserEntity> {
    const user = await this.prisma.user.create({
      data: createUserDto,
      include: {
        role: true
      }
    });

    return UserEntity.fromObject(user);
  }

  async findById(id: number): Promise<UserEntity | null> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { role: true }
    });

    return user ? UserEntity.fromObject(user) : null;
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { role: true }
    });

    return user ? UserEntity.fromObject(user) : null;
  }

  async findByUsername(username: string): Promise<UserEntity | null> {
    const user = await this.prisma.user.findUnique({
      where: { username },
      include: { role: true }
    });

    return user ? UserEntity.fromObject(user) : null;
  }

 async updateById(id: number, data: Partial<UserEntity>): Promise<UserEntity> {
  const updateData: UpdateUserData = {
    ...(data.username !== undefined && { username: data.username }),
    ...(data.email !== undefined && { email: data.email }),
    ...(data.passwordHash !== undefined && { passwordHash: data.passwordHash }),
    ...(data.reputation !== undefined && { reputation: data.reputation }),
    ...(data.roleId !== undefined && { roleId: data.roleId }),
    ...(data.avatarUrl !== undefined && { avatarUrl: data.avatarUrl }),
    ...(data.bio !== undefined && { bio: data.bio }), // ✅ AGREGAR ESTA LÍNEA
  };

  const user = await this.prisma.user.update({
    where: { id },
    data: updateData,
    include: { role: true }
  });

  return UserEntity.fromObject(user);
}
  async deleteById(id: number): Promise<UserEntity> {
    const user = await this.prisma.user.delete({
      where: { id },
      include: { role: true }
    });

    return UserEntity.fromObject(user);
  }
}