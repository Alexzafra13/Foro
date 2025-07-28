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

  async findById(id: number): Promise<PostEntity | null> {
    return await this.postDatasource.findById(id);
  }

  async findMany(
    filters?: PostFilters,
    pagination?: PaginationOptions
  ): Promise<PaginatedResult<PostEntity>> {
    return await this.postDatasource.findMany(filters, pagination);
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
}