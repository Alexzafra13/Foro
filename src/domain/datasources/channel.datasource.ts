import { ChannelEntity } from '../entities/channel.entity';

export interface ChannelStats {
  posts: number;
  members: number;
}

export interface LastPost {
  id: number;
  title: string;
  createdAt: Date;
  author: {
    username: string;
  } | null; // ✅ AHORA PERMITE NULL
}

export abstract class ChannelDatasource {
  abstract findById(id: number): Promise<ChannelEntity | null>;
  abstract findByCategory(categoryId: number): Promise<ChannelEntity[]>;
  abstract getChannelStats(channelId: number): Promise<ChannelStats>;
  abstract getLastPost(channelId: number): Promise<LastPost | null>;
}