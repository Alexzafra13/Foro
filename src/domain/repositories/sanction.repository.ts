import { SanctionEntity, SanctionType } from '../entities/sanction.entity';
import { 
  CreateSanctionDto, 
  SanctionFilters, 
  SanctionPaginationOptions, 
  PaginatedSanctionsResult 
} from '../datasources/sanction.datasource';

export abstract class SanctionRepository {
  abstract create(dto: CreateSanctionDto): Promise<SanctionEntity>;
  abstract findById(id: number): Promise<SanctionEntity | null>;
  abstract findByUserId(userId: number, includeInactive?: boolean): Promise<SanctionEntity[]>;
  abstract findActiveSanctionsForUser(userId: number): Promise<SanctionEntity[]>;
  abstract findMany(
    filters?: SanctionFilters,
    pagination?: SanctionPaginationOptions
  ): Promise<PaginatedSanctionsResult>;
  abstract updateById(id: number, data: Partial<SanctionEntity>): Promise<SanctionEntity>;
  abstract revoke(sanctionId: number, revokedBy: number, reason: string): Promise<SanctionEntity>;
  abstract deactivateExpiredSanctions(): Promise<number>;
  abstract countActiveSanctionsByType(sanctionType: SanctionType): Promise<number>;
  abstract getModerationStats(moderatorId?: number): Promise<any>;
}