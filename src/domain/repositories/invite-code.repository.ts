import { InviteCodeEntity } from '../entities/invite-code.entity';
import { 
  CreateInviteCodeDto, 
  UseInviteCodeDto, 
  InviteCodeFilters 
} from '../datasources/invite-code.datasource';

export abstract class InviteCodeRepository {
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