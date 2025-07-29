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
      overrides?.avatarUrl ?? faker.image.avatar(),
      overrides?.isEmailVerified ?? false,
      overrides?.emailVerifiedAt ?? null
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
      isEmailVerified: overrides?.isEmailVerified ?? false,
      emailVerifiedAt: overrides?.emailVerifiedAt ?? null,
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

  // Factory para EmailVerificationToken
  static createEmailVerificationTokenEntity(overrides?: Partial<any>) {
    return {
      id: overrides?.id ?? faker.number.int({ min: 1, max: 1000 }),
      userId: overrides?.userId ?? faker.number.int({ min: 1, max: 100 }),
      token: overrides?.token ?? faker.string.hexadecimal({ length: 64, prefix: '' }),
      expiresAt: overrides?.expiresAt ?? faker.date.future(),
      createdAt: overrides?.createdAt ?? faker.date.past(),
      usedAt: overrides?.usedAt ?? null,
      user: overrides?.user ?? {
        id: faker.number.int({ min: 1, max: 100 }),
        email: faker.internet.email(),
        username: faker.internet.userName()
      },
      // Métodos de dominio mock
      isExpired: jest.fn().mockReturnValue(overrides?.isExpired ?? false),
      isUsed: jest.fn().mockReturnValue(overrides?.isUsed ?? false),
      canBeUsed: jest.fn().mockReturnValue(overrides?.canBeUsed ?? true),
      markAsUsed: jest.fn()
    };
  }

  // Métodos helper para crear tokens específicos
  static createValidEmailVerificationToken() {
    return TestFactory.createEmailVerificationTokenEntity({
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24), // 24 horas en el futuro
      usedAt: null,
      isExpired: false,
      isUsed: false,
      canBeUsed: true
    });
  }

  static createExpiredEmailVerificationToken() {
    return TestFactory.createEmailVerificationTokenEntity({
      expiresAt: new Date(Date.now() - 1000 * 60 * 60), // 1 hora en el pasado
      usedAt: null,
      isExpired: true,
      isUsed: false,
      canBeUsed: false
    });
  }

  static createUsedEmailVerificationToken() {
    return TestFactory.createEmailVerificationTokenEntity({
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24), // 24 horas en el futuro
      usedAt: faker.date.past(),
      isExpired: false,
      isUsed: true,
      canBeUsed: false
    });
  }

  // DTO para crear tokens
  static createEmailVerificationTokenDto() {
    return {
      userId: faker.number.int({ min: 1, max: 100 }),
      token: faker.string.hexadecimal({ length: 64, prefix: '' }),
      expiresAt: faker.date.future()
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

  // Usuarios específicos para testing de email verification
  static createVerifiedUser(): UserEntity {
    return TestFactory.createUserEntity({
      isEmailVerified: true,
      emailVerifiedAt: faker.date.past()
    });
  }

  static createUnverifiedUser(): UserEntity {
    return TestFactory.createUserEntity({
      isEmailVerified: false,
      emailVerifiedAt: null
    });
  }

  static createCommentEntity(overrides?: Partial<any>): any {
  return {
    id: overrides?.id ?? faker.number.int({ min: 1, max: 1000 }),
    postId: overrides?.postId ?? faker.number.int({ min: 1, max: 100 }),
    authorId: overrides?.authorId ?? faker.number.int({ min: 1, max: 100 }),
    parentCommentId: overrides?.parentCommentId ?? null,
    content: overrides?.content ?? faker.lorem.paragraph(),
    isEdited: overrides?.isEdited ?? false,
    editedAt: overrides?.editedAt ?? null,
    isDeleted: overrides?.isDeleted ?? false,
    deletedAt: overrides?.deletedAt ?? null,
    deletedBy: overrides?.deletedBy ?? null,
    deletionReason: overrides?.deletionReason ?? null,
    isHidden: overrides?.isHidden ?? false,
    createdAt: overrides?.createdAt ?? faker.date.past(),
    updatedAt: overrides?.updatedAt ?? null,
    author: overrides?.author ?? {
      id: faker.number.int({ min: 1, max: 100 }),
      username: faker.internet.userName(),
      reputation: faker.number.int({ min: 0, max: 1000 }),
      role: {
        id: faker.number.int({ min: 1, max: 3 }),
        name: faker.helpers.arrayElement(['admin', 'moderator', 'user'])
      }
    },
    parentComment: overrides?.parentComment ?? undefined,
    replies: overrides?.replies ?? [],
    _count: overrides?._count ?? {
      votes: faker.number.int({ min: 0, max: 50 }),
      replies: faker.number.int({ min: 0, max: 10 })
    },
    voteScore: overrides?.voteScore ?? faker.number.int({ min: -10, max: 50 }),
    userVote: overrides?.userVote ?? null,
    // Métodos de dominio mock
    isAuthor: jest.fn().mockImplementation((userId) => (overrides?.authorId || 1) === userId),
    canBeEditedBy: jest.fn().mockReturnValue(overrides?.canBeEditedBy ?? true),
    canBeDeletedBy: jest.fn().mockReturnValue(overrides?.canBeDeletedBy ?? true),
    canBeVotedBy: jest.fn().mockReturnValue(overrides?.canBeVotedBy ?? true),
    canBeReportedBy: jest.fn().mockReturnValue(overrides?.canBeReportedBy ?? true),
    markAsEdited: jest.fn(),
    markAsDeleted: jest.fn(),
    hideByModeration: jest.fn(),
    isVisible: jest.fn().mockReturnValue(overrides?.isVisible ?? true),
    getDisplayContent: jest.fn().mockImplementation(() => overrides?.content ?? faker.lorem.paragraph()),
    isReply: jest.fn().mockImplementation(() => (overrides?.parentCommentId ?? null) !== null),
    hasReplies: jest.fn().mockImplementation(() => (overrides?._count?.replies ?? 0) > 0),
    getMinutesSinceCreation: jest.fn().mockReturnValue(overrides?.minutesSinceCreation ?? 5),
    canStillBeEdited: jest.fn().mockReturnValue(overrides?.canStillBeEdited ?? true)
  };
}

// Métodos específicos para crear comentarios con estados particulares
static createRootComment(overrides?: Partial<any>): any {
  return TestFactory.createCommentEntity({
    parentCommentId: null,
    isReply: () => false,
    ...overrides
  });
}

static createReplyComment(parentCommentId: number, overrides?: Partial<any>): any {
  return TestFactory.createCommentEntity({
    parentCommentId,
    isReply: () => true,
    parentComment: {
      id: parentCommentId,
      content: 'Parent comment content...',
      authorUsername: 'parentuser'
    },
    ...overrides
  });
}

static createDeletedComment(overrides?: Partial<any>): any {
  return TestFactory.createCommentEntity({
    isDeleted: true,
    deletedAt: faker.date.past(),
    deletedBy: faker.number.int({ min: 1, max: 10 }),
    deletionReason: 'user_request',
    isVisible: () => false,
    getDisplayContent: () => '[Comentario eliminado]',
    canBeEditedBy: () => false,
    canBeVotedBy: () => false,
    ...overrides
  });
}

static createHiddenComment(overrides?: Partial<any>): any {
  return TestFactory.createCommentEntity({
    isHidden: true,
    deletedBy: faker.number.int({ min: 1, max: 10 }),
    deletionReason: 'moderation',
    isVisible: () => false,
    getDisplayContent: () => '[Este comentario ha sido ocultado por moderación]',
    canBeEditedBy: () => false,
    canBeVotedBy: () => false,
    ...overrides
  });
}

static createEditedComment(overrides?: Partial<any>): any {
  return TestFactory.createCommentEntity({
    isEdited: true,
    editedAt: faker.date.past(),
    canStillBeEdited: () => false, // Ya fue editado hace tiempo
    ...overrides
  });
}

static createPopularComment(overrides?: Partial<any>): any {
  const voteScore = faker.number.int({ min: 20, max: 100 });
  return TestFactory.createCommentEntity({
    voteScore,
    _count: {
      votes: faker.number.int({ min: 30, max: 150 }),
      replies: faker.number.int({ min: 5, max: 20 })
    },
    hasReplies: () => true,
    ...overrides
  });
}

static createUnpopularComment(overrides?: Partial<any>): any {
  const voteScore = faker.number.int({ min: -20, max: -1 });
  return TestFactory.createCommentEntity({
    voteScore,
    _count: {
      votes: faker.number.int({ min: 10, max: 50 }),
      replies: faker.number.int({ min: 0, max: 2 })
    },
    ...overrides
  });
}

// ===== DTOs PARA COMENTARIOS =====

static createCommentDto(overrides?: Partial<any>): any {
  return {
    postId: overrides?.postId ?? faker.number.int({ min: 1, max: 100 }),
    content: overrides?.content ?? faker.lorem.paragraph({ min: 1, max: 3 }),
    authorId: overrides?.authorId ?? faker.number.int({ min: 1, max: 100 }),
    parentCommentId: overrides?.parentCommentId ?? undefined,
    ...overrides
  };
}

static createValidCommentContent(): string {
  return faker.lorem.paragraph({ min: 1, max: 3 }); // Entre 3-2000 caracteres aprox
}

static createShortCommentContent(): string {
  return 'Hi'; // 2 caracteres - muy corto
}

static createLongCommentContent(): string {
  return 'a'.repeat(2001); // Más de 2000 caracteres
}

static createSpamCommentContent(): string {
  return 'aaaaaaaaaaaaaaaaaaaaaa'; // Caracteres repetidos (spam)
}

static createCommentWithUrl(): string {
  return `Check this out: ${faker.internet.url()}`;
}

// ===== MÉTODOS PARA PAGINACIÓN Y FILTROS =====

static createCommentPaginationOptions(overrides?: Partial<any>): any {
  return {
    page: overrides?.page ?? 1,
    limit: overrides?.limit ?? 20,
    sortBy: overrides?.sortBy ?? 'createdAt',
    sortOrder: overrides?.sortOrder ?? 'asc',
    ...overrides
  };
}

static createCommentFilters(overrides?: Partial<any>): any {
  return {
    postId: overrides?.postId ?? faker.number.int({ min: 1, max: 100 }),
    authorId: overrides?.authorId ?? undefined,
    parentCommentId: overrides?.parentCommentId ?? undefined,
    isDeleted: overrides?.isDeleted ?? undefined,
    isHidden: overrides?.isHidden ?? undefined,
    includeDeleted: overrides?.includeDeleted ?? false,
    includeHidden: overrides?.includeHidden ?? false,
    ...overrides
  };
}

// ===== MÉTODOS PARA REQUESTS/RESPONSES =====

static createGetCommentsRequest(overrides?: Partial<any>): any {
  return {
    postId: overrides?.postId ?? faker.number.int({ min: 1, max: 100 }),
    userId: overrides?.userId ?? faker.number.int({ min: 1, max: 100 }),
    page: overrides?.page ?? 1,
    limit: overrides?.limit ?? 20,
    sortBy: overrides?.sortBy ?? 'createdAt',
    sortOrder: overrides?.sortOrder ?? 'asc',
    includeReplies: overrides?.includeReplies ?? false,
    ...overrides
  };
}

static createPaginatedCommentsResult(comments: any[], overrides?: Partial<any>): any {
  const page = overrides?.page ?? 1;
  const limit = overrides?.limit ?? 20;
  const total = overrides?.total ?? comments.length;
  const totalPages = Math.ceil(total / limit);

  return {
    data: comments,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
      ...overrides?.pagination
    },
    ...overrides
  };
}

// ===== MÉTODOS PARA ESTADÍSTICAS =====

static createCommentStats(overrides?: Partial<any>): any {
  const voteScore = overrides?.voteScore ?? faker.number.int({ min: -10, max: 50 });
  const upvotes = Math.max(0, voteScore + faker.number.int({ min: 0, max: 10 }));
  const downvotes = Math.max(0, upvotes - voteScore);

  return {
    voteScore,
    upvotes,
    downvotes,
    repliesCount: overrides?.repliesCount ?? faker.number.int({ min: 0, max: 10 }),
    ...overrides
  };
}

// ===== MÉTODOS HELPER ADICIONALES =====

static createMultipleComments(count: number, postId: number): any[] {
  return Array.from({ length: count }, (_, index) => 
    TestFactory.createCommentEntity({
      id: index + 1,
      postId,
      content: `Comment ${index + 1}`,
      authorId: faker.number.int({ min: 1, max: 10 })
    })
  );
}

static createCommentThread(rootCommentId: number, replyCount: number): any[] {
  const rootComment = TestFactory.createRootComment({ id: rootCommentId });
  const replies = Array.from({ length: replyCount }, (_, index) => 
    TestFactory.createReplyComment(rootCommentId, {
      id: rootCommentId + index + 1,
      content: `Reply ${index + 1} to comment ${rootCommentId}`
    })
  );

  return [rootComment, ...replies];
}

// ===== MÉTODOS PARA DIFERENTES ESCENARIOS DE TESTING =====

static createCommentForLockedPost(): any {
  return TestFactory.createCommentEntity({
    content: 'Trying to comment on locked post'
  });
}

static createCommentForNonExistentPost(): any {
  return TestFactory.createCommentEntity({
    postId: 99999,
    content: 'Comment on non-existent post'
  });
}

static createNestedReplyAttempt(parentCommentId: number): any {
  return TestFactory.createCommentEntity({
    parentCommentId,
    content: 'Nested reply (too deep)'
  });
}
}