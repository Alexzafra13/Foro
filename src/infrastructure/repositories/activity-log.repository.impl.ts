import { ActivityLogEntity } from '../../domain/entities/activity-log.entity';
import { 
  ActivityLogRepository, 
  CreateActivityLogDto, 
  ActivityLogFilters, 
  ActivityLogPagination 
} from '../../domain/repositories/activity-log.repository';
import { ActivityLogDatasource } from '../datasources/prisma-activity-log.datasource';

export class ActivityLogRepositoryImpl implements ActivityLogRepository {
  constructor(private readonly datasource: ActivityLogDatasource) {}

  async create(createDto: CreateActivityLogDto): Promise<ActivityLogEntity> {
    return await this.datasource.create(createDto);
  }

  async findById(id: number): Promise<ActivityLogEntity | null> {
    return await this.datasource.findById(id);
  }

  async findMany(
    filters?: ActivityLogFilters,
    pagination?: ActivityLogPagination
  ): Promise<{
    data: ActivityLogEntity[];
    total: number;
    page: number;
    limit: number;
  }> {
    return await this.datasource.findMany(filters, pagination);
  }

  async findByUserId(
    userId: number,
    pagination?: ActivityLogPagination
  ): Promise<{
    data: ActivityLogEntity[];
    total: number;
    page: number;
    limit: number;
  }> {
    return await this.datasource.findByUserId(userId, pagination);
  }

  async deleteOlderThan(days: number): Promise<number> {
    return await this.datasource.deleteOlderThan(days);
  }
}