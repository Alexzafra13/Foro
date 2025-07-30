import { CategoryEntity } from '../../domain/entities/category.entity';
import { CategoryRepository } from '../../domain/repositories/category.repository';
import { CategoryDatasource } from '../../domain/datasources/category.datasource';

export class CategoryRepositoryImpl implements CategoryRepository {
  constructor(private readonly datasource: CategoryDatasource) {}

  async findAll(): Promise<CategoryEntity[]> {
    return await this.datasource.findAll();
  }

  async findById(id: number): Promise<CategoryEntity | null> {
    return await this.datasource.findById(id);
  }

  async findWithChannels(): Promise<CategoryEntity[]> {
    return await this.datasource.findWithChannels();
  }
}