import { faker } from '@faker-js/faker';
import { UserEntity } from '@/domain/entities/user.entity';
import { Role, User } from '@prisma/client';

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

  static createRegisterDto() {
    return {
      username: faker.internet.userName(),
      email: faker.internet.email(),
      password: faker.internet.password({ length: 10 })
    };
  }

  static createLoginDto() {
    return {
      email: faker.internet.email(),
      password: faker.internet.password({ length: 10 })
    };
  }
}