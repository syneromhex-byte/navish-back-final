import { z } from 'zod';

export const createPortfolioSchema = z.object({
  title: z.string().min(1).max(255).trim(),
  category: z.string().optional().default('Residential'),
  description: z.string().optional().nullable(),
  modelUrl: z.string().optional().nullable(),
  thumbnailUrl: z.string().optional().nullable(),
  sizeBytes: z.number().int().optional().nullable(),
  format: z.string().optional().nullable(),
  isPublic: z.boolean().optional().default(true),
});

export const updatePortfolioSchema = createPortfolioSchema.partial();
