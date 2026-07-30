import { z } from 'zod';

export const createPortfolioSchema = z.object({
  title: z.string().optional(),
  name: z.string().optional(),
  category: z.string().optional().default('Residential'),
  description: z.string().optional().nullable(),
  modelUrl: z.string().optional().nullable(),
  fileUrl: z.string().optional().nullable(),
  thumbnailUrl: z.string().optional().nullable(),
  coverImageUrl: z.string().optional().nullable(),
  projectId: z.string().optional().nullable(),
  sizeBytes: z.any().optional().nullable(),
  format: z.string().optional().nullable(),
  isPublic: z.preprocess((val) => {
    if (typeof val === 'string') {
      if (val.trim().toLowerCase() === 'false' || val === '0') return false;
      if (val.trim().toLowerCase() === 'true' || val === '1') return true;
    }
    return val;
  }, z.boolean().optional().default(true)),
});

export const updatePortfolioSchema = createPortfolioSchema.partial();
