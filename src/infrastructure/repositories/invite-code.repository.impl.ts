import { InviteCodeEntity } from '../../domain/entities/invite-code.entity';
import { InviteCodeRepository } from '@/domain/repositories/invite-code.repository';
import { 
  InviteCodeDatasource,
  CreateInviteCodeDto,
  UseInviteCodeDto,
  InviteCodeFilters
} from '../../domain/datasources/invite-code.datasource';


export class InviteCodeRepositoryImpl implements InviteCodeRepository {
  constructor(private readonly inviteCodeDatasource: InviteCodeDatasource) {}

  async create(createDto: CreateInviteCodeDto): Promise<InviteCodeEntity> {
    return await this.inviteCodeDatasource.create(createDto);
  }

  async findByCode(code: string): Promise<InviteCodeEntity | null> {
    return await this.inviteCodeDatasource.findByCode(code);
  }

  async findMany(filters?: InviteCodeFilters): Promise<InviteCodeEntity[]> {
    return await this.inviteCodeDatasource.findMany(filters);
  }

  async markAsUsed(code: string, usedBy: number): Promise<InviteCodeEntity> {
    return await this.inviteCodeDatasource.markAsUsed(code, usedBy);
  }

  async deleteByCode(code: string): Promise<InviteCodeEntity> {
    return await this.inviteCodeDatasource.deleteByCode(code);
  }

  async getStats(createdBy?: number): Promise<{
    total: number;
    used: number;
    available: number;
    expired: number;
  }> {
    return await this.inviteCodeDatasource.getStats(createdBy);
  }
}