import { SanctionEntity, SanctionType } from '../../domain/entities/sanction.entity';
import { SanctionRepository } from '../../domain/repositories/sanction.repository';
import { SanctionDatasource } from '../../domain/datasources/sanction.datasource';
import { 
  CreateSanctionDto, 
  SanctionFilters, 
  SanctionPaginationOptions, 
  PaginatedSanctionsResult 
} from '../../domain/datasources/sanction.datasource';

export class SanctionRepositoryImpl implements SanctionRepository {
  constructor(private readonly datasource: SanctionDatasource) {}

  async create(dto: CreateSanctionDto): Promise<SanctionEntity> {
    return await this.datasource.create(dto);
  }

  async findById(id: number): Promise<SanctionEntity | null> {
    return await this.datasource.findById(id);
  }

  async findByUserId(userId: number, includeInactive?: boolean): Promise<SanctionEntity[]> {
    return await this.datasource.findByUserId(userId, includeInactive);
  }

  async findActiveSanctionsForUser(userId: number): Promise<SanctionEntity[]> {
    return await this.datasource.findActiveSanctionsForUser(userId);
  }

  async findMany(
    filters?: SanctionFilters,
    pagination?: SanctionPaginationOptions
  ): Promise<PaginatedSanctionsResult> {
    return await this.datasource.findMany(filters, pagination);
  }

  async updateById(id: number, data: Partial<SanctionEntity>): Promise<SanctionEntity> {
    return await this.datasource.updateById(id, data);
  }

  async revoke(sanctionId: number, revokedBy: number, reason: string): Promise<SanctionEntity> {
    return await this.datasource.revoke(sanctionId, revokedBy, reason);
  }

  async deactivateExpiredSanctions(): Promise<number> {
    return await this.datasource.deactivateExpiredSanctions();
  }

  async countActiveSanctionsByType(sanctionType: SanctionType): Promise<number> {
    return await this.datasource.countActiveSanctionsByType(sanctionType);
  }

  async getModerationStats(moderatorId?: number): Promise<any> {
    return await this.datasource.getModerationStats(moderatorId);
  }
}