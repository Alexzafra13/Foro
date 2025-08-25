import { SanctionEntity, SanctionType, SanctionSeverity } from '../entities/sanction.entity';

export interface CreateSanctionDto {
  userId: number;
  moderatorId: number;
  sanctionType: SanctionType;
  reason: string;
  durationHours?: number;
  severity?: SanctionSeverity;
  evidence?: any;
  isAutomatic?: boolean;
}

export interface SanctionFilters {
  userId?: number;
  moderatorId?: number;
  sanctionType?: string;
  isActive?: boolean;
  severity?: SanctionSeverity;
}

export interface SanctionPaginationOptions {
  page: number;
  limit: number;
  sortBy?: 'createdAt' | 'updatedAt' | 'sanctionType' | 'severity';
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedSanctionsResult {
  data: SanctionEntity[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export abstract class SanctionDatasource {
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