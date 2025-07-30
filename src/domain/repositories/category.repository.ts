export interface CategoryRepository {
  findAll(): Promise<any[]>;
  findById(id: number): Promise<any | null>;
}