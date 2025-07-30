// src/infrastructure/repositories/category.repository.impl.ts
import { CategoryRepository } from '../../domain/repositories/category.repository';
import { PrismaCategoryDatasource } from '../datasources/prisma-category.datasource'; 

export class CategoryRepositoryImpl implements CategoryRepository {
  constructor(private readonly datasource: PrismaCategoryDatasource) {}

  async findAll(): Promise<any[]> {
    return await this.datasource.findAll();
  }

  async findById(id: number): Promise<any | null> {
    return await this.datasource.findById(id);
  }
}
