import { ChannelEntity } from '../../domain/entities/channel.entity';
import { ChannelRepository } from '../../domain/repositories/channel.repository';
import { ChannelDatasource, ChannelStats, LastPost } from '../../domain/datasources/channel.datasource';

export class ChannelRepositoryImpl implements ChannelRepository {
  constructor(private readonly datasource: ChannelDatasource) {}

  async findById(id: number): Promise<ChannelEntity | null> {
    return await this.datasource.findById(id);
  }

  async findByCategory(categoryId: number): Promise<ChannelEntity[]> {
    return await this.datasource.findByCategory(categoryId);
  }

  async getChannelStats(channelId: number): Promise<ChannelStats> {
    return await this.datasource.getChannelStats(channelId);
  }

  async getLastPost(channelId: number): Promise<LastPost | null> {
    return await this.datasource.getLastPost(channelId);
  }
}