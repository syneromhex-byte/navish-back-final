import { prisma } from '../../config/database';
import { NotificationType } from '@prisma/client';
import { getQueues, QueueNames } from '../../config/redis';

export class NotificationService {
  async createNotification(data: {
    userId: string;
    projectId?: string;
    type: NotificationType;
    title: string;
    body: string;
    actionUrl?: string;
    metadata?: object;
  }) {
    const notification = await prisma.notification.create({
      data: {
        userId: data.userId,
        projectId: data.projectId,
        type: data.type,
        title: data.title,
        body: data.body,
        actionUrl: data.actionUrl,
        metadata: data.metadata || {},
      },
    });

    // Check if user has email notifications turned on
    const settings = await prisma.userSettings.findUnique({
      where: { userId: data.userId },
    });

    if (!settings || settings.notifyByEmail) {
      const user = await prisma.user.findUnique({ where: { id: data.userId } });
      if (user && user.emailVerified) {
        // Enqueue email notification job
        const queues = getQueues();
        await queues[QueueNames.EMAIL].add('send-notification-email', {
          to: user.email,
          firstName: user.firstName,
          title: data.title,
          body: data.body,
          actionUrl: data.actionUrl,
        });
      }
    }

    // Push realtime Socket event
    const { notificationSocket } = await import('../../sockets/notification.socket');
    notificationSocket.sendToUser(data.userId, 'notification:received', notification);

    return notification;
  }

  async getNotifications(userId: string, unreadOnly = false) {
    return prisma.notification.findMany({
      where: {
        userId,
        ...(unreadOnly ? { isRead: false } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async markAsRead(id: string, userId: string) {
    return prisma.notification.updateMany({
      where: { id, userId },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
  }

  async markAllAsRead(userId: string) {
    return prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
  }

  async deleteNotification(id: string, userId: string) {
    return prisma.notification.deleteMany({
      where: { id, userId },
    });
  }
}

export const notificationService = new NotificationService();
