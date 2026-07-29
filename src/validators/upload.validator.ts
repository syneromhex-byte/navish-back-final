import { z } from 'zod';

export const initiateUploadSchema = z.object({
  fileName: z.string().min(1).max(255),
  fileSize: z.number().positive().max(500 * 1024 * 1024),
  mimeType: z.string().min(1),
  parts: z.number().int().min(1).max(10000).optional(),
  projectId: z.string().uuid().optional(),
  roomId: z.string().uuid().optional(),
  context: z.enum(['portfolio', 'project']).optional(),
  category: z.string().optional(),
});

export const completeUploadSchema = z.object({
  uploadSessionId: z.string().uuid(),
  parts: z
    .array(
      z.object({
        partNumber: z.number().int().min(1),
        eTag: z.string().min(1),
      }),
    )
    .optional(),
  modelName: z.string().max(200).optional(),
  projectId: z.string().uuid().optional(),
  roomId: z.string().uuid().optional(),
  context: z.enum(['portfolio', 'project']).optional(),
  category: z.string().optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  isPublic: z.boolean().optional(),
});

export const abortUploadSchema = z.object({
  uploadSessionId: z.string().uuid(),
});

export type InitiateUploadDto = z.infer<typeof initiateUploadSchema>;
export type CompleteUploadDto = z.infer<typeof completeUploadSchema>;
