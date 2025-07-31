// src/domain/repositories/post.repository.ts - ACTUALIZADO
import { PostEntity } from '../entities/post.entity';
import { 
  CreatePostDto, 
  UpdatePostDto, 
  PostFilters, 
  PaginationOptions, 
  PaginatedResult 
} from '../datasources/post.datasource';

export abstract class PostRepository {
  abstract create(createPostDto: CreatePostDto): Promise<PostEntity>;
  abstract findById(id: number, userId?: number): Promise<PostEntity | null>; // ✅ AGREGADO userId
  abstract findMany(
    filters?: PostFilters,
    pagination?: PaginationOptions,
    userId?: number // ✅ AGREGADO userId
  ): Promise<PaginatedResult<PostEntity>>;
  abstract updateById(id: number, updateDto: UpdatePostDto): Promise<PostEntity>;
  abstract deleteById(id: number): Promise<PostEntity>;
  abstract incrementViews(id: number): Promise<void>;
}