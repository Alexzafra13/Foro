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
  abstract findById(id: number): Promise<PostEntity | null>;
  abstract findMany(
    filters?: PostFilters,
    pagination?: PaginationOptions
  ): Promise<PaginatedResult<PostEntity>>;
  abstract updateById(id: number, updateDto: UpdatePostDto): Promise<PostEntity>;
  abstract deleteById(id: number): Promise<PostEntity>;
  abstract incrementViews(id: number): Promise<void>;
}