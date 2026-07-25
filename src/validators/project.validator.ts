import { z } from 'zod';

export const createProjectSchema = z.object({
  name: z.string().min(1).max(200).trim(),
  description: z.string().max(2000).optional().nullable(),
  clientId: z.string().uuid().optional().nullable(),
  tags: z.array(z.string()).optional().default([]),
  isPublic: z.boolean().optional().default(false),
  status: z.union([
    z.enum(['DRAFT', 'IN_PROGRESS', 'REVIEW', 'APPROVED', 'PUBLISHED', 'ARCHIVED']),
    z.string(),
  ]).optional(),
  modelUrl: z.string().optional().nullable(),
  thumbnailUrl: z.string().optional().nullable(),
  coverImageUrl: z.string().optional().nullable(),
  category: z.string().optional().nullable(),
  clientName: z.string().optional().nullable(),
  clientEmail: z.string().optional().nullable(),
  sizeBytes: z.number().optional().nullable(),
  originalSize: z.number().optional().nullable(),
  optimizedSize: z.number().optional().nullable(),
  modelFormat: z.string().optional().nullable(),
  rooms: z.array(z.string()).optional(),
  location: z.string().optional().nullable(),
  metadata: z.record(z.any()).optional().nullable(),
});

export const updateProjectSchema = z.object({
  name: z.string().min(1).max(200).trim().optional(),
  description: z.string().max(2000).optional().nullable(),
  clientId: z.string().uuid().optional().nullable(),
  tags: z.array(z.string()).optional(),
  isPublic: z.boolean().optional(),
  status: z.union([
    z.enum(['DRAFT', 'IN_PROGRESS', 'REVIEW', 'APPROVED', 'PUBLISHED', 'ARCHIVED']),
    z.string(),
  ]).optional(),
  modelUrl: z.string().optional().nullable(),
  thumbnailUrl: z.string().optional().nullable(),
  coverImageUrl: z.string().optional().nullable(),
  category: z.string().optional().nullable(),
  clientName: z.string().optional().nullable(),
  clientEmail: z.string().optional().nullable(),
  sizeBytes: z.number().optional().nullable(),
  originalSize: z.number().optional().nullable(),
  optimizedSize: z.number().optional().nullable(),
  modelFormat: z.string().optional().nullable(),
  rooms: z.array(z.string()).optional(),
  location: z.string().optional().nullable(),
  metadata: z.record(z.any()).optional().nullable(),
});

export const listProjectsQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  search: z.string().optional(),
  status: z.enum(['DRAFT', 'IN_PROGRESS', 'REVIEW', 'APPROVED', 'PUBLISHED', 'ARCHIVED']).optional(),
  clientId: z.string().uuid().optional(),
  sortBy: z.enum(['createdAt', 'updatedAt', 'name']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const createProjectVersionSchema = z.object({
  version: z.string().min(1).max(20),
  description: z.string().optional(),
});

export const addProjectMemberSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(['ARCHITECT', 'CLIENT', 'CLIENT']).default('CLIENT'),
});

export type CreateProjectDto = z.infer<typeof createProjectSchema>;
export type UpdateProjectDto = z.infer<typeof updateProjectSchema>;
export type ListProjectsQuery = z.infer<typeof listProjectsQuerySchema>;
