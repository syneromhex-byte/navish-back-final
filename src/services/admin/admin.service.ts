import { prisma } from '../../config/database';
import { ApiError } from '../../utils/ApiError';
import { UserRole, UserStatus, ProjectStatus } from '@prisma/client';

export class AdminService {
  async getDashboardStats() {
    const [
      totalUsers,
      activeVerifications,
      totalProjects,
      totalSubscribers,
      totalStorage,
      totalModels,
      recentUploads,
      recentActivity,
    ] = await Promise.all([
      prisma.user.count({ where: { deletedAt: null } }),
      prisma.user.count({ where: { status: UserStatus.PENDING_VERIFICATION } }),
      prisma.project.count({ where: { deletedAt: null } }),
      prisma.client.count({ where: { deletedAt: null } }),
      prisma.model.aggregate({
        where: { deletedAt: null },
        _sum: { fileSize: true },
      }),
      prisma.model.count({ where: { deletedAt: null } }),
      prisma.model.findMany({
        where: { deletedAt: null },
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          fileSize: true,
          format: true,
          status: true,
          createdAt: true,
        },
      }),
      prisma.auditLog.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: { actor: { select: { firstName: true, lastName: true, email: true } } },
      }),
    ]);

    const activeProjectStats = await prisma.project.groupBy({
      by: ['status'],
      where: { deletedAt: null },
      _count: { id: true },
    });

    const formattedProjectStats = activeProjectStats.reduce((acc: Record<string, number>, curr) => {
      acc[curr.status] = curr._count.id;
      return acc;
    }, {});

    return {
      users: {
        total: totalUsers,
        pendingVerification: activeVerifications,
      },
      projects: {
        total: totalProjects,
        byStatus: formattedProjectStats,
      },
      clients: {
        total: totalSubscribers,
      },
      models: {
        total: totalModels,
      },
      storage: {
        totalBytes: totalStorage._sum.fileSize ? totalStorage._sum.fileSize.toString() : '0',
      },
      recentUploads,
      recentActivity,
      systemTime: new Date().toISOString(),
    };
  }

  async getAuditLogs(query: { page: number | string; limit: number | string; action?: string; actorId?: string }) {
    const pageNum = Number(query.page || 1);
    const limitNum = Number(query.limit || 10);
    const { action, actorId } = query;
    const skip = (pageNum - 1) * limitNum;

    const where = {
      ...(action ? { action: action as any } : {}),
      ...(actorId ? { actorId } : {}),
    };

    const [total, logs] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        include: { actor: { select: { email: true, role: true } } },
      }),
    ]);

    return {
      logs,
      meta: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    };
  }

  async buildAuditLog(actorId: string, action: string, entityType: string, entityId?: string, oldValue?: object, newValue?: object) {
    return prisma.auditLog.create({
      data: {
        actorId,
        action: action as any,
        entityType,
        entityId,
        oldValue: oldValue || {},
        newValue: newValue || {},
      },
    });
  }
}

export const adminService = new AdminService();
