import { faker } from '@faker-js/faker';
import { UserEntity } from '@/domain/entities/user.entity';
import { PostEntity } from '@/domain/entities/post.entity';
import { InviteCodeEntity } from '@/domain/entities/invite-code.entity';
import { Role, User, Post, InviteCode } from '@prisma/client';

export class TestFactory {
  static createUserEntity(overrides?: Partial<UserEntity>): UserEntity {
    return new UserEntity(
      overrides?.id ?? faker.number.int({ min: 1, max: 1000 }),
      overrides?.username ?? faker.internet.userName(),
      overrides?.email ?? faker.internet.email(),
      overrides?.passwordHash ?? faker.string.alphanumeric(60),
      overrides?.reputation ?? faker.number.int({ min: 0, max: 1000 }),
      overrides?.roleId ?? faker.number.int({ min: 1, max: 3 }),
      overrides?.createdAt ?? faker.date.past(),
      overrides?.role ?? {
        id: faker.number.int({ min: 1, max: 3 }),
        name: faker.helpers.arrayElement(['admin', 'moderator', 'user'])
      },
      overrides?.avatarUrl ?? faker.image.avatar()
    );
  }

  static createPostEntity(overrides?: Partial<PostEntity>): PostEntity {
    return new PostEntity(
      overrides?.id ?? faker.number.int({ min: 1, max: 1000 }),
      overrides?.channelId ?? faker.number.int({ min: 1, max: 10 }),
      overrides?.authorId ?? faker.number.int({ min: 1, max: 100 }),
      overrides?.title ?? faker.lorem.sentence({ min: 3, max: 8 }),
      overrides?.content ?? faker.lorem.paragraphs(3),
      overrides?.isLocked ?? false,
      overrides?.isPinned ?? false,
      overrides?.createdAt ?? faker.date.past(),
      overrides?.updatedAt ?? null,
      overrides?.channel ?? {
        id: faker.number.int({ min: 1, max: 10 }),
        name: faker.lorem.word(),
        isPrivate: false
      },
      overrides?.author ?? {
        id: faker.number.int({ min: 1, max: 100 }),
        username: faker.internet.userName(),
        reputation: faker.number.int({ min: 0, max: 1000 }),
        role: {
          id: faker.number.int({ min: 1, max: 3 }),
          name: faker.helpers.arrayElement(['admin', 'moderator', 'user'])
        }
      },
      overrides?._count ?? {
        comments: faker.number.int({ min: 0, max: 50 }),
        votes: faker.number.int({ min: 0, max: 100 })
      },
      overrides?.voteScore ?? faker.number.int({ min: -10, max: 50 })
    );
  }

  static createInviteCodeEntity(overrides?: Partial<InviteCodeEntity>): InviteCodeEntity {
    return new InviteCodeEntity(
      overrides?.code ?? TestFactory.generateInviteCode(),
      overrides?.createdBy ?? faker.number.int({ min: 1, max: 10 }),
      overrides?.usedBy ?? null,
      overrides?.usedAt ?? null,
      overrides?.createdAt ?? faker.date.past(),
      overrides?.creator ?? {
        id: faker.number.int({ min: 1, max: 10 }),
        username: faker.internet.userName(),
        role: faker.helpers.arrayElement(['admin', 'moderator'])
      },
      overrides?.user ?? undefined
    );
  }

  static createRole(overrides?: Partial<Role>): Role {
    return {
      id: overrides?.id ?? faker.number.int({ min: 1, max: 3 }),
      name: overrides?.name ?? faker.helpers.arrayElement(['admin', 'moderator', 'user'])
    };
  }

  static createUser(overrides?: Partial<User>): User & { role?: Role } {
    const role = TestFactory.createRole();
    return {
      id: overrides?.id ?? faker.number.int({ min: 1, max: 1000 }),
      username: overrides?.username ?? faker.internet.userName(),
      email: overrides?.email ?? faker.internet.email(),
      passwordHash: overrides?.passwordHash ?? faker.string.alphanumeric(60),
      reputation: overrides?.reputation ?? 0,
      roleId: overrides?.roleId ?? role.id,
      createdAt: overrides?.createdAt ?? new Date(),
      avatarUrl: overrides?.avatarUrl ?? null,
      role: role
    };
  }

  static createPost(overrides?: Partial<Post>): Post {
    return {
      id: overrides?.id ?? faker.number.int({ min: 1, max: 1000 }),
      channelId: overrides?.channelId ?? faker.number.int({ min: 1, max: 10 }),
      authorId: overrides?.authorId ?? faker.number.int({ min: 1, max: 100 }),
      title: overrides?.title ?? faker.lorem.sentence({ min: 3, max: 8 }),
      content: overrides?.content ?? faker.lorem.paragraphs(3),
      isLocked: overrides?.isLocked ?? false,
      isPinned: overrides?.isPinned ?? false,
      createdAt: overrides?.createdAt ?? faker.date.past(),
      updatedAt: overrides?.updatedAt ?? null
    };
  }

  static createInviteCode(overrides?: Partial<InviteCode>): InviteCode {
    return {
      code: overrides?.code ?? TestFactory.generateInviteCode(),
      createdBy: overrides?.createdBy ?? faker.number.int({ min: 1, max: 10 }),
      usedBy: overrides?.usedBy ?? null,
      usedAt: overrides?.usedAt ?? null,
      createdAt: overrides?.createdAt ?? faker.date.past()
    };
  }

  // DTOs para requests
  static createRegisterDto() {
    return {
      username: faker.internet.userName(),
      email: faker.internet.email(),
      password: faker.internet.password({ length: 10 }),
      inviteCode: TestFactory.generateInviteCode()
    };
  }

  static createLoginDto() {
    return {
      email: faker.internet.email(),
      password: faker.internet.password({ length: 10 })
    };
  }

  static createPostDto() {
    return {
      channelId: faker.number.int({ min: 1, max: 10 }),
      title: faker.lorem.sentence({ min: 3, max: 8 }),
      content: faker.lorem.paragraphs(2),
      authorId: faker.number.int({ min: 1, max: 100 })
    };
  }

  static createUpdatePostDto() {
    return {
      title: faker.lorem.sentence({ min: 3, max: 8 }),
      content: faker.lorem.paragraphs(2)
    };
  }

  static createGenerateInviteDto() {
    return {
      createdBy: faker.number.int({ min: 1, max: 10 }),
      customCode: Math.random() > 0.5 ? TestFactory.generateInviteCode() : undefined
    };
  }

  // Helper methods
  static generateInviteCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    
    for (let i = 0; i < 3; i++) {
      if (i > 0) code += '-';
      for (let j = 0; j < 4; j++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
    }
    
    return code;
  }

  static createValidInviteCode(): InviteCodeEntity {
    return TestFactory.createInviteCodeEntity({
      createdAt: new Date(Date.now() - 1000 * 60 * 60), // 1 hora atrás
      usedBy: null,
      usedAt: null
    });
  }

  static createUsedInviteCode(): InviteCodeEntity {
    return TestFactory.createInviteCodeEntity({
      usedBy: faker.number.int({ min: 1, max: 100 }),
      usedAt: faker.date.past(),
      user: {
        id: faker.number.int({ min: 1, max: 100 }),
        username: faker.internet.userName()
      }
    });
  }

  static createExpiredInviteCode(): InviteCodeEntity {
    return TestFactory.createInviteCodeEntity({
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 8), // 8 días atrás
      usedBy: null,
      usedAt: null
    });
  }

  static createAdminUser(): UserEntity {
    return TestFactory.createUserEntity({
      role: { id: 1, name: 'admin' },
      roleId: 1
    });
  }

  static createModeratorUser(): UserEntity {
    return TestFactory.createUserEntity({
      role: { id: 2, name: 'moderator' },
      roleId: 2
    });
  }

  static createRegularUser(): UserEntity {
    return TestFactory.createUserEntity({
      role: { id: 3, name: 'user' },
      roleId: 3
    });
  }
}