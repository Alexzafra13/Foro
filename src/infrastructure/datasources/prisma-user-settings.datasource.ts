import { PrismaClient } from '@prisma/client';
import { UserSettingsEntity } from '../../domain/entities/user-settings.entity';

export interface CreateUserSettingsDto {
  userId: number;
  theme: 'light' | 'dark' | 'system';
  language: string;
  timezone: string;
  emailNotifications: boolean;
  postNotifications: boolean;
  commentNotifications: boolean;
  privateProfile: boolean;
  showEmail: boolean;
  showLastSeen: boolean;
}

export abstract class UserSettingsDatasource {
  abstract create(createDto: CreateUserSettingsDto): Promise<UserSettingsEntity>;
  abstract findByUserId(userId: number): Promise<UserSettingsEntity | null>;
  abstract updateByUserId(userId: number, updateData: any): Promise<UserSettingsEntity>;
  abstract deleteByUserId(userId: number): Promise<UserSettingsEntity>;
}

export class PrismaUserSettingsDatasource implements UserSettingsDatasource {
  constructor(private readonly prisma: PrismaClient) {}

  async create(createDto: CreateUserSettingsDto): Promise<UserSettingsEntity> {
    const settings = await this.prisma.userSettings.create({
      data: createDto,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true
          }
        }
      }
    });

    return UserSettingsEntity.fromObject(settings);
  }

  async findByUserId(userId: number): Promise<UserSettingsEntity | null> {
    const settings = await this.prisma.userSettings.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true
          }
        }
      }
    });

    return settings ? UserSettingsEntity.fromObject(settings) : null;
  }

  async updateByUserId(userId: number, updateData: any): Promise<UserSettingsEntity> {
    const settings = await this.prisma.userSettings.update({
      where: { userId },
      data: {
        ...updateData,
        updatedAt: new Date()
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true
          }
        }
      }
    });

    return UserSettingsEntity.fromObject(settings);
  }

  async deleteByUserId(userId: number): Promise<UserSettingsEntity> {
    const settings = await this.prisma.userSettings.delete({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true
          }
        }
      }
    });

    return UserSettingsEntity.fromObject(settings);
  }
}