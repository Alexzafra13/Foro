// src/infrastructure/repositories/post-view.repository.impl.ts
import { PostViewEntity } from '../../domain/entities/post-view.entity';
import { PostViewRepository } from '../../domain/repositories/post-view.repository';
import { 
  PostViewDatasource, 
  CreatePostViewDto, 
  PostViewFilters, 
  PostViewStats 
} from '../../domain/datasources/post-view.datasource';

export class PostViewRepositoryImpl implements PostViewRepository {
  constructor(private readonly postViewDatasource: PostViewDatasource) {}

  async create(createDto: CreatePostViewDto): Promise<PostViewEntity> {
    return await this.postViewDatasource.create(createDto);
  }

  async findByUserAndPost(userId: number, postId: number): Promise<PostViewEntity | null> {
    return await this.postViewDatasource.findByUserAndPost(userId, postId);
  }

  async hasViewedToday(userId: number, postId: number): Promise<boolean> {
    return await this.postViewDatasource.hasViewedToday(userId, postId);
  }

  async findMany(filters?: PostViewFilters): Promise<PostViewEntity[]> {
    return await this.postViewDatasource.findMany(filters);
  }

  async countUniqueViewsForPost(postId: number): Promise<number> {
    return await this.postViewDatasource.countUniqueViewsForPost(postId);
  }

  async countTotalViewsForPost(postId: number): Promise<number> {
    return await this.postViewDatasource.countTotalViewsForPost(postId);
  }

  async getPostViewStats(postId: number): Promise<PostViewStats> {
    return await this.postViewDatasource.getPostViewStats(postId);
  }

  async findByUserId(userId: number, limit?: number): Promise<PostViewEntity[]> {
    return await this.postViewDatasource.findByUserId(userId, limit);
  }

  async deleteOldViews(olderThanDays: number): Promise<number> {
    return await this.postViewDatasource.deleteOldViews(olderThanDays);
  }
}