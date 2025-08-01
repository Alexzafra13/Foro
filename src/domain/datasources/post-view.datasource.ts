// src/domain/datasources/post-view.datasource.ts
import { PostViewEntity } from '../entities/post-view.entity';

export interface CreatePostViewDto {
  userId: number;
  postId: number;
  ipAddress?: string;
  userAgent?: string;
}

export interface PostViewFilters {
  userId?: number;
  postId?: number;
  viewedAfter?: Date;
  viewedBefore?: Date;
}

export interface PostViewStats {
  postId: number;
  uniqueViews: number;
  totalViews: number;
  todayViews: number;
  thisWeekViews: number;
  thisMonthViews: number;
}

export abstract class PostViewDatasource {
  // Crear nueva vista
  abstract create(createDto: CreatePostViewDto): Promise<PostViewEntity>;
  
  // Buscar vista específica
  abstract findByUserAndPost(userId: number, postId: number): Promise<PostViewEntity | null>;
  
  // Verificar si usuario vio post hoy
  abstract hasViewedToday(userId: number, postId: number): Promise<boolean>;
  
  // Obtener todas las vistas con filtros
  abstract findMany(filters?: PostViewFilters): Promise<PostViewEntity[]>;
  
  // Contar vistas únicas para un post
  abstract countUniqueViewsForPost(postId: number): Promise<number>;
  
  // Contar vistas totales para un post
  abstract countTotalViewsForPost(postId: number): Promise<number>;
  
  // Obtener estadísticas completas de un post
  abstract getPostViewStats(postId: number): Promise<PostViewStats>;
  
  // Obtener vistas de un usuario
  abstract findByUserId(userId: number, limit?: number): Promise<PostViewEntity[]>;
  
  // Eliminar vistas antiguas (cleanup)
  abstract deleteOldViews(olderThanDays: number): Promise<number>;
}