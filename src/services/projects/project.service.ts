import { projectRepository } from '../../repositories/project.repository';
import { ApiError } from '../../utils/ApiError';
import { uploadToS3, buildS3Key } from '../../config/aws';
import { S3Prefix } from '../../types';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import type { CreateProjectDto, UpdateProjectDto, ListProjectsQuery } from '../../validators/project.validator';
import { UserRole } from '@prisma/client';
import { socketService } from '../../sockets';

export class ProjectService {
  async uploadProjectFile(file: Express.Multer.File, ownerId: string, meta: any = {}) {
    const ext = path.extname(file.originalname).toLowerCase();
    const filename = `${uuidv4()}${ext}`;
    // Save to storage path /uploads/projects/ (S3Prefix.PROJECTS = 'projects')
    const key = buildS3Key(S3Prefix.PROJECTS, ownerId, filename);
    const fileUrl = await uploadToS3(key, file.buffer, file.mimetype);

    const name = meta.name || meta.title || file.originalname.replace(/\.[^.]+$/, '');
    const project = await projectRepository.create({
      name,
      description: meta.description || null,
      isPublic: meta.isPublic !== undefined ? Boolean(meta.isPublic) : false, // Client work is private (isPublic = false)
      coverImageUrl: fileUrl,
      clientId: meta.clientId || null,
      tags: meta.tags || [],
    }, ownerId);

    try {
      const io = socketService.getIO();
      io.emit('ENTITY_CREATED', { id: project.id, entityType: 'project', data: project });
      io.emit('project:created', project);
    } catch {}

    return project;
  }

  async createProject(dto: CreateProjectDto, ownerId: string) {
    const project = await projectRepository.create(dto, ownerId);
    try {
      const io = socketService.getIO();
      io.emit('ENTITY_CREATED', { id: project.id, entityType: 'project', data: project });
      io.emit('project:created', project);
    } catch {}
    return project;
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

    const updated = await projectRepository.update(id, dto);
    try {
      const io = socketService.getIO();
      io.emit('ENTITY_UPDATED', { id: updated.id, entityType: 'project', data: updated });
      io.emit('project:updated', updated);
    } catch {}
    return updated;
  }

  async deleteProject(id: string, userId: string, userRole: UserRole): Promise<void> {
    const project = await projectRepository.findById(id);
    if (!project) throw ApiError.notFound('Project not found');

    if (userRole !== UserRole.ADMIN && project.ownerId !== userId) {
      throw ApiError.forbidden('Only the project owner or admin can delete this project');
    }

    await projectRepository.softDelete(id);

    try {
      const io = socketService.getIO();
      io.emit('ENTITY_DELETED', { id, entityType: 'project' });
      io.emit('project:deleted', { id });
    } catch {
      // Suppress if socket service isn't active
    }
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
