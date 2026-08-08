import { z } from 'zod';

export const createShareLinkSchema = z.object({
  projectId: z.string().uuid(),
  clientId: z.string().uuid().optional(),
  password: z.string().min(6).max(100).optional(),
  expiresAt: z.string().datetime().optional().transform((v) => v ? new Date(v) : undefined),
  maxAccessCount: z.number().int().min(1).optional(),
  allowDownload: z.boolean().optional().default(false),
  isOneTime: z.boolean().optional().default(false),
});

export const accessShareLinkSchema = z.object({
  token: z.string().min(1),
  password: z.string().optional(),
});

export const updateShareLinkSchema = z.object({
  expiresAt: z.string().datetime().optional().nullable().transform((v) => v ? new Date(v) : null),
  maxAccessCount: z.number().int().min(1).optional().nullable(),
  allowDownload: z.boolean().optional(),
  password: z.string().min(6).max(100).optional().nullable(),
});

export type CreateShareLinkDto = z.infer<typeof createShareLinkSchema>;
export type AccessShareLinkDto = z.infer<typeof accessShareLinkSchema>;
export type UpdateShareLinkDto = z.infer<typeof updateShareLinkSchema>;
