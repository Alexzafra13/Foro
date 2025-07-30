import { ChannelRepository } from '../../repositories/channel.repository';

export interface GetChannelRequestDto {
  channelId: number;
  userId?: number;
}

export interface ChannelDetailDto {
  id: number;
  name: string;
  description: string | null;
  icon: string | null;
  isPrivate: boolean;
  category: {
    id: number;
    name: string;
  } | null;
  stats: {
    posts: number;
    members: number;
  };
  permissions: {
    canPost: boolean;
    canView: boolean;
  };
}

export class GetChannel {
  constructor(private readonly channelRepository: ChannelRepository) {}

  async execute(dto: GetChannelRequestDto): Promise<ChannelDetailDto> {
    const { channelId, userId } = dto;

    // 1. Obtener canal
    const channel = await this.channelRepository.findById(channelId);
    if (!channel) {
      throw new Error(`Channel with id ${channelId} not found`);
    }

    // 2. Verificar permisos básicos
    if (channel.isPrivate && !userId) {
      throw new Error('Authentication required for private channel');
    }

    // 3. Calcular permisos
    const permissions = {
      canPost: !!userId, // Solo usuarios autenticados pueden postear
      canView: !channel.isPrivate || !!userId // Todos ven canales públicos, solo autenticados ven privados
    };

    return {
      id: channel.id,
      name: channel.name,
      description: channel.description,
      icon: channel.icon,
      isPrivate: channel.isPrivate,
      category: channel.category ? {
        id: channel.category.id,
        name: channel.category.name
      } : null,
      stats: {
        posts: channel._count?.posts || 0,
        members: channel._count?.members || 0
      },
      permissions
    };
  }
}