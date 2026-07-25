import { prisma } from '../config/database';
import type { CreateClientDto, UpdateClientDto } from '../validators/client.validator';
import { buildPaginationMeta, buildPrismaSkipTake } from '../utils/pagination';
import { hashPassword } from '../auth/bcrypt';
import { UserRole, UserStatus, Prisma } from '@prisma/client';

export class ClientRepository {
  async create(data: CreateClientDto) {
    const hashedPassword = await hashPassword(data.password);

    return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const user = await tx.user.create({
        data: {
          email: data.email,
          password: hashedPassword,
          firstName: data.firstName,
          lastName: data.lastName,
          role: UserRole.CLIENT,
          status: UserStatus.ACTIVE,
          emailVerified: false,
        },
      });

      const client = await tx.client.create({
        data: {
          userId: user.id,
          companyName: data.companyName,
          industry: data.industry,
          website: data.website,
          address: data.address,
          city: data.city,
          country: data.country,
          contactPhone: data.contactPhone,
          notes: data.notes,
        },
        include: {
          user: { select: { id: true, email: true, firstName: true, lastName: true, role: true, status: true } },
        },
      });

      return client;
    });
  }

  async findById(id: string) {
    return prisma.client.findFirst({
      where: { id, deletedAt: null },
      include: {
        user: { select: { id: true, email: true, firstName: true, lastName: true, role: true, status: true, lastLoginAt: true } },
        projects: { where: { deletedAt: null }, select: { id: true, name: true, status: true, createdAt: true } },
        _count: { select: { projects: true } },
      },
    });
  }

  async findByUserId(userId: string) {
    return prisma.client.findFirst({ where: { userId, deletedAt: null } });
  }

  async findMany(query: { page: number; limit: number; search?: string; isActive?: boolean; sortBy: string; sortOrder: 'asc' | 'desc' }) {
    const { page, limit, search, isActive, sortBy, sortOrder } = query;

    // Auto-sync users with role CLIENT that do not have a Client table entry
    const usersWithoutClient = await prisma.user.findMany({
      where: {
        role: UserRole.CLIENT,
        deletedAt: null,
        clientProfile: { is: null },
      },
    });

    for (const u of usersWithoutClient) {
      await prisma.client
        .create({
          data: {
            userId: u.id,
            companyName: u.company || `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email,
            notes: 'Registered Client',
          },
        })
        .catch(() => {});
    }

    const where: Prisma.ClientWhereInput = {
      deletedAt: null,
      ...(isActive !== undefined ? { isActive } : {}),
      ...(search
        ? {
            OR: [
              { companyName: { contains: search, mode: 'insensitive' } },
              { user: { email: { contains: search, mode: 'insensitive' } } },
              { user: { firstName: { contains: search, mode: 'insensitive' } } },
              { user: { lastName: { contains: search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };

    const [total, data] = await prisma.$transaction([
      prisma.client.count({ where }),
      prisma.client.findMany({
        where,
        ...buildPrismaSkipTake(page, limit),
        orderBy: sortBy === 'companyName' ? { companyName: sortOrder } : { createdAt: sortOrder },
        include: {
          user: { select: { id: true, email: true, firstName: true, lastName: true } },
          _count: { select: { projects: true } },
        },
      }),
    ]);

    return { data, meta: buildPaginationMeta(total, page, limit) };
  }

  async update(id: string, data: UpdateClientDto) {
    return prisma.client.update({
      where: { id },
      data,
      include: { user: { select: { id: true, email: true, firstName: true, lastName: true } } },
    });
  }

  async softDelete(id: string): Promise<void> {
    const client = await prisma.client.findUnique({ where: { id } });
    if (!client) return;

    await prisma.$transaction([
      prisma.client.update({ where: { id }, data: { deletedAt: new Date(), isActive: false } }),
      prisma.user.update({ where: { id: client.userId }, data: { deletedAt: new Date(), status: UserStatus.INACTIVE } }),
    ]);
  }

  async uploadLogo(id: string, logoUrl: string) {
    return prisma.client.update({ where: { id }, data: { companyLogo: logoUrl } });
  }
}

export const clientRepository = new ClientRepository();
