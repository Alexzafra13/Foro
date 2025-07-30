import { ChannelRepository } from '../../domain/repositories/channel.repository';
import { PrismaChannelDatasource } from '../datasources/prisma-channel.datasource';

export class ChannelRepositoryImpl implements ChannelRepository {
  constructor(private readonly datasource: PrismaChannelDatasource) {}

  async findById(id: number): Promise<any | null> {
    return await this.datasource.findById(id);
  }

  async findByCategory(categoryId: number): Promise<any[]> {
    return await this.datasource.findByCategory(categoryId);
  }

  async getChannelStats(channelId: number): Promise<{ posts: number; members?: number }> {
    return await this.datasource.getChannelStats(channelId);
  }

  async getLastPost(channelId: number): Promise<any | null> {
    return await this.datasource.getLastPost(channelId);
  }
}