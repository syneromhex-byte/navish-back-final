import { prisma } from '../../config/database';
import { uploadToS3, buildS3Key } from '../../config/aws';
import { ApiError } from '../../utils/ApiError';
import { S3Prefix } from '../../types';
import { v4 as uuidv4 } from 'uuid';

export class EnvironmentService {
  async createEnvironment(roomId: string, data: { name: string; description?: string; preset?: string; intensity?: number; rotation?: number }) {
    const room = await prisma.room.findFirst({ where: { id: roomId, deletedAt: null } });
    if (!room) throw ApiError.notFound('Room not found');

    return prisma.environment.create({ data: { roomId, ...data } });
  }

  async uploadHdr(environmentId: string, file: Express.Multer.File): Promise<string> {
    const key = buildS3Key(S3Prefix.HDR, `${uuidv4()}.${file.originalname.endsWith('.exr') ? 'exr' : 'hdr'}`);
    const url = await uploadToS3(key, file.buffer, file.mimetype);

    await prisma.environment.update({
      where: { id: environmentId },
      data: { hdrFileKey: key, hdrPublicUrl: url },
    });

    return url;
  }

  async getEnvironmentsByRoom(roomId: string) {
    return prisma.environment.findMany({
      where: { roomId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getEnvironmentById(id: string) {
    const env = await prisma.environment.findUnique({ where: { id } });
    if (!env) throw ApiError.notFound('Environment not found');
    return env;
  }

  async updateEnvironment(id: string, data: Partial<{ name: string; description: string; preset: string; intensity: number; rotation: number; isDefault: boolean }>) {
    return prisma.environment.update({ where: { id }, data });
  }

  async setDefault(roomId: string, environmentId: string): Promise<void> {
    await prisma.$transaction([
      prisma.environment.updateMany({ where: { roomId }, data: { isDefault: false } }),
      prisma.environment.update({ where: { id: environmentId }, data: { isDefault: true } }),
    ]);
  }

  async deleteEnvironment(id: string): Promise<void> {
    await prisma.environment.delete({ where: { id } });
  }
}

export const environmentService = new EnvironmentService();
