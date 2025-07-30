// src/domain/use-cases/categories/get-categories.use-case.ts - CORREGIDO
import { CategoryRepository } from '../../repositories/category.repository';
import { ChannelRepository } from '../../repositories/channel.repository';

export interface CategoryDto {
  id: number;
  name: string;
  description: string | null;
  icon: string | null;
  position: number;
  channels: ChannelDto[];
  stats: {
    totalPosts: number;
    totalChannels: number;
  };
}

export interface ChannelDto {
  id: number;
  name: string;
  description: string | null;
  icon: string | null;
  position: number;
  stats: {
    posts: number;
  };
  lastPost?: {
    id: number;
    title: string;
    createdAt: Date;
    author: {
      username: string;
    } | null; // ✅ AHORA PERMITE NULL
  } | null;
}

export class GetCategories {
  constructor(
    private readonly categoryRepository: CategoryRepository,
    private readonly channelRepository: ChannelRepository
  ) {}

  async execute(): Promise<CategoryDto[]> {
    // 1. Obtener todas las categorías con sus canales
    const categories = await this.categoryRepository.findWithChannels();
    
    // 2. Para cada categoría, procesar sus canales y estadísticas
    const categoriesWithStats = await Promise.all(
      categories.map(async (category) => {
        const channelsWithStats: ChannelDto[] = await Promise.all(
          (category.channels || []).map(async (channel: any) => {
            // Obtener último post del canal
            const lastPost = await this.channelRepository.getLastPost(channel.id);
            
            return {
              id: channel.id,
              name: channel.name,
              description: channel.description,
              icon: channel.icon,
              position: channel.position,
              stats: {
                posts: channel._count?.posts || 0
              },
              lastPost: lastPost ? {
                id: lastPost.id,
                title: lastPost.title,
                createdAt: lastPost.createdAt,
                author: lastPost.author ? {
                  username: lastPost.author.username
                } : null // ✅ MANEJAR AUTOR NULL
              } : null
            };
          })
        );

        // Calcular estadísticas totales de la categoría
        const totalPosts = channelsWithStats.reduce((sum, ch) => sum + ch.stats.posts, 0);

        return {
          id: category.id,
          name: category.name,
          description: category.description,
          icon: category.icon,
          position: category.position,
          channels: channelsWithStats,
          stats: {
            totalPosts,
            totalChannels: channelsWithStats.length
          }
        };
      })
    );

    return categoriesWithStats;
  }
}