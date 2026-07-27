import { prisma } from '../config/database';
import { parsePaginationQuery, buildPaginationMeta, buildPrismaSkipTake } from '../utils/pagination';
import { generateUniqueSlug } from '../utils/crypto';
import type { CreateProjectDto, UpdateProjectDto, ListProjectsQuery } from '../validators/project.validator';
import { Prisma } from '@prisma/client';

export function formatProjectResponse(project: any) {
  if (!project) return null;
  const meta = (project.metadata as Record<string, any>) || {};

  let firstRoomModelId: string | null = null;
  let firstRoomModelPublicUrl: string | null = null;

  if (Array.isArray(project.rooms)) {
    for (const room of project.rooms) {
      if (Array.isArray(room.models) && room.models.length > 0) {
        const first = room.models[0];
        if (first.modelId || first.model?.id) {
          firstRoomModelId = first.modelId || first.model?.id;
        }
        if (first.model?.publicUrl) {
          firstRoomModelPublicUrl = first.model.publicUrl;
        }
        if (firstRoomModelId) break;
      }
    }
  }

  const modelId = meta.modelId || meta.model_id || firstRoomModelId || null;
  const fileUrl = meta.fileUrl || meta.modelUrl || firstRoomModelPublicUrl || project.coverImageUrl || null;
  const modelUrl = meta.modelUrl || meta.fileUrl || firstRoomModelPublicUrl || project.coverImageUrl || null;

  return {
    ...project,
    modelId,
    model_id: modelId,
    fileUrl,
    modelUrl,
    ...meta,
    ...(modelId !== null ? { modelId, model_id: modelId } : {}),
    ...(fileUrl !== null ? { fileUrl } : {}),
    ...(modelUrl !== null ? { modelUrl } : {}),
  };
}

export class ProjectRepository {
  async create(data: CreateProjectDto & Record<string, any>, ownerId: string) {
    const slug = generateUniqueSlug(data.name);
    const {
      modelUrl,
      fileUrl,
      modelId,
      model_id,
      category,
      clientName,
      clientEmail,
      sizeBytes,
      originalSize,
      optimizedSize,
      modelFormat,
      rooms,
      location,
      thumbnailUrl,
      status,
      metadata,
      ...rest
    } = data as any;

    const resolvedModelId = modelId || model_id || metadata?.modelId || metadata?.model_id;
    const resolvedFileUrl = fileUrl || modelUrl || metadata?.fileUrl || metadata?.modelUrl;

    const initialMetadata = {
      ...(metadata ? metadata : {}),
      ...(resolvedModelId !== undefined ? { modelId: resolvedModelId, model_id: resolvedModelId } : {}),
      ...(resolvedFileUrl !== undefined ? { fileUrl: resolvedFileUrl, modelUrl: resolvedFileUrl } : {}),
      ...(category !== undefined ? { category } : {}),
      ...(clientName !== undefined ? { clientName } : {}),
      ...(clientEmail !== undefined ? { clientEmail } : {}),
      ...(sizeBytes !== undefined ? { sizeBytes } : {}),
      ...(originalSize !== undefined ? { originalSize } : {}),
      ...(optimizedSize !== undefined ? { optimizedSize } : {}),
      ...(modelFormat !== undefined ? { modelFormat } : {}),
      ...(rooms !== undefined ? { rooms } : {}),
      ...(location !== undefined ? { location } : {}),
    };

    const projectStatus = status === 'ready' || status === 'APPROVED' || resolvedFileUrl ? 'APPROVED' : (status || 'DRAFT');

    const created = await prisma.project.create({
      data: {
        name: data.name,
        description: data.description,
        slug,
        clientId: data.clientId,
        tags: data.tags ?? [],
        isPublic: data.isPublic ?? false,
        thumbnailUrl: thumbnailUrl || null,
        status: projectStatus as any,
        metadata: initialMetadata,
        ownerId,
      },
      include: {
        owner: { select: { id: true, firstName: true, lastName: true, email: true } },
        client: true,
        rooms: {
          where: { deletedAt: null },
          orderBy: { sortOrder: 'asc' },
          include: {
            models: {
              where: { isActive: true },
              include: { model: true },
            },
          },
        },
      },
    });

    return formatProjectResponse(created);
  }

  async findById(id: string, includeDeleted = false) {
    const project = await prisma.project.findFirst({
      where: { id, ...(includeDeleted ? {} : { deletedAt: null }) },
      include: {
        owner: { select: { id: true, firstName: true, lastName: true, email: true } },
        client: { include: { user: { select: { firstName: true, lastName: true, email: true } } } },
        rooms: {
          where: { deletedAt: null },
          orderBy: { sortOrder: 'asc' },
          include: {
            models: {
              where: { isActive: true },
              include: { model: true },
            },
          },
        },
        _count: { select: { rooms: true, shareLinks: true, analytics: true } },
      },
    });
    return formatProjectResponse(project);
  }

  async findBySlug(slug: string) {
    const project = await prisma.project.findFirst({
      where: { slug, deletedAt: null },
      include: {
        owner: true,
        client: true,
        rooms: {
          where: { deletedAt: null },
          orderBy: { sortOrder: 'asc' },
          include: {
            models: {
              where: { isActive: true },
              include: { model: true },
            },
          },
        },
      },
    });
    return formatProjectResponse(project);
  }

  async findMany(query: ListProjectsQuery, userId: string, userRole: string, userEmail?: string) {
    const { page, limit, search, status, clientId, sortBy, sortOrder } = query;

    const clientDbId = userRole === 'CLIENT' ? await this.getClientIdByUserId(userId) : undefined;

    const clientFilter: Prisma.ProjectWhereInput[] = [];
    if (userRole === 'CLIENT') {
      if (clientDbId) clientFilter.push({ clientId: clientDbId });
      if (userEmail) {
        clientFilter.push({ metadata: { path: ['clientEmail'], equals: userEmail.toLowerCase() } });
        clientFilter.push({ metadata: { path: ['clientEmail'], equals: userEmail } });
      }
      clientFilter.push({ isPublic: true });
    }

    const where: Prisma.ProjectWhereInput = {
      deletedAt: null,
      ...(userRole === 'CLIENT' ? { OR: clientFilter } : {}),
      ...(status ? { status: status as any } : {}),
      ...(clientId ? { clientId } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { description: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [total, rawData] = await prisma.$transaction([
      prisma.project.count({ where }),
      prisma.project.findMany({
        where,
        ...buildPrismaSkipTake(page, limit),
        orderBy: { [sortBy]: sortOrder },
        include: {
          owner: { select: { id: true, firstName: true, lastName: true } },
          client: { select: { companyName: true } },
          rooms: {
            where: { deletedAt: null },
            orderBy: { sortOrder: 'asc' },
            include: {
              models: {
                where: { isActive: true },
                include: { model: true },
              },
            },
          },
          _count: { select: { rooms: true } },
        },
      }),
    ]);

    const data = rawData.map((project) => formatProjectResponse(project));

    return { data, meta: buildPaginationMeta(total, page, limit) };
  }

  async update(id: string, data: UpdateProjectDto & Record<string, any>) {
    const {
      modelUrl,
      fileUrl,
      modelId,
      model_id,
      category,
      clientName,
      clientEmail,
      sizeBytes,
      originalSize,
      optimizedSize,
      modelFormat,
      rooms,
      location,
      metadata,
      ...rest
    } = data as any;

    const existing = await prisma.project.findUnique({ where: { id }, select: { metadata: true } });
    const prevMeta = (existing?.metadata as Record<string, any>) || {};
    const resolvedModelId = modelId || model_id || metadata?.modelId || metadata?.model_id;
    const resolvedFileUrl = fileUrl || modelUrl || metadata?.fileUrl || metadata?.modelUrl;

    const newMeta = {
      ...prevMeta,
      ...(metadata ? metadata : {}),
      ...(resolvedModelId !== undefined ? { modelId: resolvedModelId, model_id: resolvedModelId } : {}),
      ...(resolvedFileUrl !== undefined ? { fileUrl: resolvedFileUrl, modelUrl: resolvedFileUrl } : {}),
      ...(category !== undefined ? { category } : {}),
      ...(clientName !== undefined ? { clientName } : {}),
      ...(clientEmail !== undefined ? { clientEmail } : {}),
      ...(sizeBytes !== undefined ? { sizeBytes } : {}),
      ...(originalSize !== undefined ? { originalSize } : {}),
      ...(optimizedSize !== undefined ? { optimizedSize } : {}),
      ...(modelFormat !== undefined ? { modelFormat } : {}),
      ...(rooms !== undefined ? { rooms } : {}),
      ...(location !== undefined ? { location } : {}),
    };

    const updated = await prisma.project.update({
      where: { id },
      data: {
        ...rest,
        metadata: newMeta,
        ...(rest.status === 'PUBLISHED' ? { publishedAt: new Date() } : {}),
      },
      include: {
        owner: { select: { id: true, firstName: true, lastName: true, email: true } },
        client: true,
        rooms: {
          where: { deletedAt: null },
          orderBy: { sortOrder: 'asc' },
          include: {
            models: {
              where: { isActive: true },
              include: { model: true },
            },
          },
        },
      },
    });

    return formatProjectResponse(updated);
  }

  async softDelete(id: string): Promise<void> {
    await prisma.project.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  async addMember(projectId: string, userId: string, role: string) {
    return prisma.projectMember.upsert({
      where: { projectId_userId: { projectId, userId } },
      create: { projectId, userId, role: role as any },
      update: { role: role as any },
    });
  }

  async removeMember(projectId: string, userId: string): Promise<void> {
    await prisma.projectMember.delete({
      where: { projectId_userId: { projectId, userId } },
    });
  }

  async createVersion(projectId: string, version: string, description: string | undefined, createdBy: string, snapshot: object) {
    return prisma.projectVersion.create({
      data: { projectId, version, description, createdBy, snapshot },
    });
  }

  async getVersions(projectId: string) {
    return prisma.projectVersion.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
    });
  }

  private async getClientIdByUserId(userId: string): Promise<string | undefined> {
    const client = await prisma.client.findUnique({ where: { userId } });
    return client?.id;
  }
}

export const projectRepository = new ProjectRepository();
