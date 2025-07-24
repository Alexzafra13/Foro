import { PrismaClient } from '../generated/prisma';
import { CreateUserDto } from '../models/user.model';

const prisma = new PrismaClient();

export class UserRepository {
  async create(userData: CreateUserDto) {
    return await prisma.user.create({
      data: userData,
      include: {
        role: true
      }
    });
  }

  async findByEmail(email: string) {
    return await prisma.user.findUnique({
      where: { email },
      include: {
        role: true
      }
    });
  }

  async findById(id: number) {
    return await prisma.user.findUnique({
      where: { id },
      include: {
        role: true
      }
    });
  }
}