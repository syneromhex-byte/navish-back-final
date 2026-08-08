import { userRepository } from '../../repositories/user.repository';
import { ApiError } from '../../utils/ApiError';
import { uploadToS3, buildS3Key } from '../../config/aws';
import { S3Prefix } from '../../types';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';
import type { CreateUserDto, UpdateUserDto, ListUsersQuery } from '../../validators/user.validator';
import { UserRole } from '@prisma/client';
import { prisma } from '../../config/database';
import { hashPassword } from '../../auth/bcrypt';

export class UserService {
  async createUser(dto: CreateUserDto) {
    const existing = await userRepository.findByEmail(dto.email);
    if (existing) throw ApiError.conflict('Email already in use');
    const hashed = await hashPassword(dto.password);
    return userRepository.create({ ...dto, password: hashed });
  }

  async getUserById(id: string) {
    const user = await userRepository.findById(id);
    if (!user) throw ApiError.notFound('User not found');
    return user;
  }

  async listUsers(query: ListUsersQuery) {
    return userRepository.findMany(query);
  }

  async updateUser(id: string, dto: UpdateUserDto, requesterId: string, requesterRole: UserRole) {
    const user = await userRepository.findById(id);
    if (!user) throw ApiError.notFound('User not found');

    // Non-admins can only update themselves
    if (requesterRole !== UserRole.ADMIN && id !== requesterId) {
      throw ApiError.forbidden('You can only update your own profile');
    }

    return userRepository.update(id, dto);
  }

  async updateRole(id: string, role: UserRole) {
    const user = await userRepository.findById(id);
    if (!user) throw ApiError.notFound('User not found');
    return userRepository.updateRole(id, role);
  }

  async uploadAvatar(userId: string, file: Express.Multer.File): Promise<string> {
    // Resize to 256x256 WebP
    const buffer = await sharp(file.buffer)
      .resize(256, 256, { fit: 'cover' })
      .webp({ quality: 80 })
      .toBuffer();

    const key = buildS3Key(S3Prefix.AVATARS, userId, `${uuidv4()}.webp`);
    const url = await uploadToS3(key, buffer, 'image/webp');

    await userRepository.updateAvatar(userId, url);
    return url;
  }

  async suspendUser(id: string): Promise<void> {
    const user = await userRepository.findById(id);
    if (!user) throw ApiError.notFound('User not found');
    await userRepository.suspendUser(id);
  }

  async activateUser(id: string): Promise<void> {
    const user = await userRepository.findById(id);
    if (!user) throw ApiError.notFound('User not found');
    await userRepository.activateUser(id);
  }

  async deleteUser(id: string): Promise<void> {
    const user = await userRepository.findById(id);
    if (!user) throw ApiError.notFound('User not found');
    await userRepository.softDelete(id);
  }

  async getActivityLog(userId: string) {
    return userRepository.getActivityLog(userId);
  }

  async logActivity(userId: string, action: string, description?: string, entityType?: string, entityId?: string): Promise<void> {
    await prisma.activityLog.create({
      data: { userId, action, description, entityType, entityId },
    });
  }
}

export const userService = new UserService();
