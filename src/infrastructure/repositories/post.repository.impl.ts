// src/infrastructure/repositories/post.repository.impl.ts - REEMPLAZAR COMPLETO
import { PostEntity } from '../../domain/entities/post.entity';
import { PostRepository } from '../../domain/repositories/post.repository';
import { 
  PostDatasource, 
  CreatePostDto, 
  UpdatePostDto, 
  PostFilters, 
  PaginationOptions, 
  PaginatedResult 
} from '../../domain/datasources/post.datasource';

export class PostRepositoryImpl implements PostRepository {
  constructor(private readonly postDatasource: PostDatasource) {}

  async create(createPostDto: CreatePostDto): Promise<PostEntity> {
    return await this.postDatasource.create(createPostDto);
  }

  async findById(id: number, userId?: number): Promise<PostEntity | null> {
    return await this.postDatasource.findById(id, userId);
  }

  async findMany(
    filters?: PostFilters,
    pagination?: PaginationOptions,
    userId?: number
  ): Promise<PaginatedResult<PostEntity>> {
    return await this.postDatasource.findMany(filters, pagination, userId);
  }

  async updateById(id: number, updateDto: UpdatePostDto): Promise<PostEntity> {
    return await this.postDatasource.updateById(id, updateDto);
  }

  async deleteById(id: number): Promise<PostEntity> {
    return await this.postDatasource.deleteById(id);
  }

  async incrementViews(id: number): Promise<void> {
    return await this.postDatasource.incrementViews(id);
  }

  // ✅ NUEVOS MÉTODOS PARA ESTADÍSTICAS - CORREGIDOS
  async countByUserId(userId: number): Promise<number> {
    return await this.postDatasource.countByUserId(userId); // ✅ CORREGIDO: postDatasource
  }

  async findByUserId(userId: number): Promise<PostEntity[]> {
    return await this.postDatasource.findByUserId(userId); // ✅ CORREGIDO: postDatasource
  }

  async getTotalVotesForUser(userId: number): Promise<number> {
    return await this.postDatasource.getTotalVotesForUser(userId); // ✅ CORREGIDO: postDatasource
  }
}