import { projectRepository } from '../../repositories/project.repository';
import { ApiError } from '../../utils/ApiError';
import { uploadToS3, buildS3Key } from '../../config/aws';
import { S3Prefix } from '../../types';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';
import type { CreateProjectDto, UpdateProjectDto, ListProjectsQuery } from '../../validators/project.validator';
import { UserRole } from '@prisma/client';

export class ProjectService {
  async createProject(dto: CreateProjectDto, ownerId: string) {
    return projectRepository.create(dto, ownerId);
  }

  async getProjectById(id: string, userId: string, userRole: UserRole, userEmail?: string) {
    const project = await projectRepository.findById(id);
    if (!project) throw ApiError.notFound('Project not found');

    this.assertAccess(project, userId, userRole, userEmail);
    return project;
  }

  async listProjects(query: ListProjectsQuery, userId: string, userRole: UserRole, userEmail?: string) {
    return projectRepository.findMany(query, userId, userRole, userEmail);
  }

  async updateProject(id: string, dto: UpdateProjectDto, userId: string, userRole: UserRole) {
    const project = await projectRepository.findById(id);
    if (!project) throw ApiError.notFound('Project not found');

    if (userRole !== UserRole.ADMIN && project.ownerId !== userId) {
      throw ApiError.forbidden('Only the project owner or admin can update this project');
    }

    return projectRepository.update(id, dto);
  }

  async deleteProject(id: string, userId: string, userRole: UserRole): Promise<void> {
    const project = await projectRepository.findById(id);
    if (!project) throw ApiError.notFound('Project not found');

    if (userRole !== UserRole.ADMIN && project.ownerId !== userId) {
      throw ApiError.forbidden('Only the project owner or admin can delete this project');
    }

    await projectRepository.softDelete(id);
  }

  async uploadThumbnail(projectId: string, file: Express.Multer.File): Promise<string> {
    const buffer = await sharp(file.buffer)
      .resize(1920, 1080, { fit: 'cover' })
      .webp({ quality: 85 })
      .toBuffer();

    const key = buildS3Key(S3Prefix.THUMBNAILS, 'projects', projectId, `${uuidv4()}.webp`);
    const url = await uploadToS3(key, buffer, 'image/webp');

    await projectRepository.update(projectId, { thumbnailUrl: url });
    return url;
  }

  async addMember(projectId: string, userId: string, role: string, requesterId: string, requesterRole: UserRole) {
    const project = await projectRepository.findById(projectId);
    if (!project) throw ApiError.notFound('Project not found');

    if (requesterRole !== UserRole.ADMIN && project.ownerId !== requesterId) {
      throw ApiError.forbidden('Only the project owner or admin can manage members');
    }

    return projectRepository.addMember(projectId, userId, role);
  }

  async removeMember(projectId: string, userId: string, requesterId: string, requesterRole: UserRole): Promise<void> {
    const project = await projectRepository.findById(projectId);
    if (!project) throw ApiError.notFound('Project not found');

    if (requesterRole !== UserRole.ADMIN && project.ownerId !== requesterId) {
      throw ApiError.forbidden('Only the project owner can remove members');
    }

    await projectRepository.removeMember(projectId, userId);
  }

  async createVersion(projectId: string, version: string, description: string | undefined, userId: string) {
    const project = await projectRepository.findById(projectId);
    if (!project) throw ApiError.notFound('Project not found');

    const snapshot = { project, timestamp: new Date().toISOString() };
    return projectRepository.createVersion(projectId, version, description, userId, snapshot);
  }

  async getVersions(projectId: string) {
    return projectRepository.getVersions(projectId);
  }

  private assertAccess(project: any, userId: string, userRole: UserRole, userEmail?: string): void {
    if (userRole === UserRole.ADMIN || userRole === UserRole.ARCHITECT) return;
    if (project.ownerId === userId) return;
    const isMember = project.members?.some((m: any) => m.userId === userId);
    const isClientUser = project.client?.userId === userId;
    const isClientEmailMatch =
      userEmail &&
      ((project.clientEmail && project.clientEmail.toLowerCase() === userEmail.toLowerCase()) ||
        (project.client?.user?.email && project.client.user.email.toLowerCase() === userEmail.toLowerCase()) ||
        (project.metadata?.clientEmail && project.metadata.clientEmail.toLowerCase() === userEmail.toLowerCase()));

    if (!isMember && !isClientUser && !isClientEmailMatch && !project.isPublic) {
      throw ApiError.forbidden('Access denied to this project');
    }
  }
}

export const projectService = new ProjectService();
