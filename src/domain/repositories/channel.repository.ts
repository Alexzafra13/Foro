export interface ChannelRepository {
  findById(id: number): Promise<any | null>;
  findByCategory(categoryId: number): Promise<any[]>;
  getChannelStats(channelId: number): Promise<{ posts: number; members?: number }>;
  getLastPost(channelId: number): Promise<any | null>;
}