import { prisma } from '../../config/database';
import { ApiError } from '../../utils/ApiError';

export class SettingsService {
  async getUserSettings(userId: string) {
    let settings = await prisma.userSettings.findUnique({
      where: { userId },
    });

    // Lazy initialization of settings if not found
    if (!settings) {
      settings = await prisma.userSettings.create({
        data: {
          userId,
        },
      });
    }

    return settings;
  }

  async updateUserSettings(
    userId: string,
    data: Partial<{
      language: string;
      timezone: string;
      dateFormat: string;
      theme: string;
      notifyProjectUpdates: boolean;
      notifyModelReady: boolean;
      notifyShareAccess: boolean;
      notifyByEmail: boolean;
      defaultRenderMode: string;
      autoSaveInterval: number;
      customSettings: object;
    }>,
  ) {
    // Ensure exist
    await this.getUserSettings(userId);

    return prisma.userSettings.update({
      where: { userId },
      data,
    });
  }

  async getSystemSettings() {
    const records = await prisma.systemSettings.findMany();
    const settings: Record<string, any> = {};
    for (const r of records) {
      settings[r.key] = r.value;
    }
    return settings;
  }

  async updateSystemSetting(key: string, value: any, adminId: string) {
    return prisma.systemSettings.upsert({
      where: { key },
      create: {
        key,
        value,
        updatedById: adminId,
      },
      update: {
        value,
        updatedById: adminId,
      },
    });
  }
}

export const settingsService = new SettingsService();
