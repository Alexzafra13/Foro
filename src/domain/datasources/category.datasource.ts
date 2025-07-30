import { CategoryEntity } from '../entities/category.entity';

export abstract class CategoryDatasource {
  abstract findAll(): Promise<CategoryEntity[]>;
  abstract findById(id: number): Promise<CategoryEntity | null>;
  abstract findWithChannels(): Promise<CategoryEntity[]>;
}