import { InviteCodeEntity } from '../entities/invite-code.entity';

export interface CreateInviteCodeDto {
  code: string;
  createdBy: number;
}

export interface UseInviteCodeDto {
  code: string;
  usedBy: number;
}

export interface InviteCodeFilters {
  createdBy?: number;
  isUsed?: boolean;
  isExpired?: boolean;
}

export abstract class InviteCodeDatasource {
  abstract create(createDto: CreateInviteCodeDto): Promise<InviteCodeEntity>;
  abstract findByCode(code: string): Promise<InviteCodeEntity | null>;
  abstract findMany(filters?: InviteCodeFilters): Promise<InviteCodeEntity[]>;
  abstract markAsUsed(code: string, usedBy: number): Promise<InviteCodeEntity>;
  abstract deleteByCode(code: string): Promise<InviteCodeEntity>;
  abstract getStats(createdBy?: number): Promise<{
    total: number;
    used: number;
    available: number;
    expired: number;
  }>;
}