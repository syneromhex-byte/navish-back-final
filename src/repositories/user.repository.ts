import { prisma } from '../config/database';
import type { CreateUserDto, UpdateUserDto, ListUsersQuery } from '../validators/user.validator';
import { buildPaginationMeta, buildPrismaSkipTake } from '../utils/pagination';
import { Prisma, UserRole, UserStatus } from '@prisma/client';

export class UserRepository {
  async create(data: CreateUserDto) {
    return prisma.user.create({
      data: {
        email: data.email,
        password: data.password,
        firstName: data.firstName,
        lastName: data.lastName,
        role: data.role as UserRole ?? UserRole.CLIENT,
        phone: data.phone,
        jobTitle: data.jobTitle,
        company: data.company,
        status: UserStatus.ACTIVE,
      },
      select: this.safeSelect(),
    });
  }

  /**
   * Create a user whose email was already verified by OTP before registration.
   * Sets emailVerified=true, emailVerifiedAt=now, status=ACTIVE immediately.
   */
  async createVerified(data: CreateUserDto) {
    const now = new Date();
    return prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: data.email,
          password: data.password,
          firstName: data.firstName,
          lastName: data.lastName,
          role: (data.role as UserRole) ?? UserRole.CLIENT,
          phone: data.phone,
          jobTitle: data.jobTitle,
          company: data.company,
          status: UserStatus.ACTIVE,
          emailVerified: true,
          emailVerifiedAt: now,
        },
        select: this.safeSelect(),
      });

      if (user.role === UserRole.CLIENT) {
        await tx.client
          .create({
            data: {
              userId: user.id,
              companyName: data.company || `${data.firstName || ''} ${data.lastName || ''}`.trim() || data.email,
              notes: 'Registered Client',
            },
          })
          .catch(() => {});
      }

      return user;
    });
  }

  async findById(id: string) {
    return prisma.user.findFirst({
      where: { id, deletedAt: null },
      select: this.safeSelect(),
    });
  }

  async findByEmail(email: string) {
    return prisma.user.findFirst({
      where: { email, deletedAt: null },
    });
  }

  async findMany(query: ListUsersQuery) {
    const { page, limit, search, role, status, sortBy, sortOrder } = query;

    const where: Prisma.UserWhereInput = {
      deletedAt: null,
      ...(role ? { role: role as UserRole } : {}),
      ...(status ? { status: status as UserStatus } : {}),
      ...(search
        ? {
            OR: [
              { email: { contains: search, mode: 'insensitive' } },
              { firstName: { contains: search, mode: 'insensitive' } },
              { lastName: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [total, data] = await prisma.$transaction([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        ...buildPrismaSkipTake(page, limit),
        orderBy: { [sortBy]: sortOrder },
        select: this.safeSelect(),
      }),
    ]);

    return { data, meta: buildPaginationMeta(total, page, limit) };
  }

  async update(id: string, data: UpdateUserDto) {
    return prisma.user.update({
      where: { id },
      data,
      select: this.safeSelect(),
    });
  }

  async updateRole(id: string, role: UserRole) {
    return prisma.user.update({
      where: { id },
      data: { role },
      select: this.safeSelect(),
    });
  }

  async updateAvatar(id: string, avatarUrl: string) {
    return prisma.user.update({ where: { id }, data: { avatarUrl }, select: this.safeSelect() });
  }

  async updatePassword(id: string, hashedPassword: string): Promise<void> {
    await prisma.user.update({ where: { id }, data: { password: hashedPassword, passwordChangedAt: new Date() } });
  }

  async softDelete(id: string): Promise<void> {
    await prisma.user.update({ where: { id }, data: { deletedAt: new Date(), status: UserStatus.INACTIVE } });
  }

  async suspendUser(id: string): Promise<void> {
    await prisma.user.update({ where: { id }, data: { status: UserStatus.SUSPENDED } });
  }

  async activateUser(id: string): Promise<void> {
    await prisma.user.update({ where: { id }, data: { status: UserStatus.ACTIVE } });
  }

  async getActivityLog(userId: string, limit = 20) {
    return prisma.activityLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  private safeSelect(): Prisma.UserSelect {
    return {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      displayName: true,
      avatarUrl: true,
      role: true,
      status: true,
      phone: true,
      jobTitle: true,
      company: true,
      emailVerified: true,
      lastLoginAt: true,
      loginCount: true,
      createdAt: true,
      updatedAt: true,
    };
  }
}

export const userRepository = new UserRepository();
