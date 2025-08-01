// src/domain/repositories/post.repository.ts - COMPLETO CON ESTADÍSTICAS
import { PostEntity } from '../entities/post.entity';
import {
  CreatePostDto,
  UpdatePostDto,
  PostFilters,
  PaginationOptions,
  PaginatedResult
} from '../datasources/post.datasource';

export abstract class PostRepository {
  // Métodos existentes (NO CAMBIAR)
  abstract create(createPostDto: CreatePostDto): Promise<PostEntity>;
  abstract findById(id: number, userId?: number): Promise<PostEntity | null>;
  abstract findMany(
    filters?: PostFilters,
    pagination?: PaginationOptions,
    userId?: number
  ): Promise<PaginatedResult<PostEntity>>;
  abstract updateById(id: number, updateDto: UpdatePostDto): Promise<PostEntity>;
  abstract deleteById(id: number): Promise<PostEntity>;
  abstract incrementViews(id: number): Promise<void>;
  
  // ✅ NUEVOS MÉTODOS PARA ESTADÍSTICAS
  abstract countByUserId(userId: number): Promise<number>;
  abstract findByUserId(userId: number): Promise<PostEntity[]>;
  abstract getTotalVotesForUser(userId: number): Promise<number>;
  abstract updateViews(id: number, views: number): Promise<void>;
}