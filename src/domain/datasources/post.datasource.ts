// src/domain/datasources/post.datasource.ts - ACTUALIZADA
import { PostEntity } from '../entities/post.entity';

export interface CreatePostDto {
  channelId: number;
  authorId: number;
  title: string;
  content: string;
}

export interface UpdatePostDto {
  title?: string;
  content?: string;
  isLocked?: boolean;
  isPinned?: boolean;
}

export interface PostFilters {
  channelId?: number;
  authorId?: number;
  isLocked?: boolean;
  isPinned?: boolean;
  search?: string;
}

export interface PaginationOptions {
  page: number;
  limit: number;
  sortBy?: 'createdAt' | 'updatedAt' | 'title' | 'voteScore';
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export abstract class PostDatasource {
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