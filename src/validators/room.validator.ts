import { z } from 'zod';

export const createRoomSchema = z.object({
  name: z.string().min(1).max(200).trim(),
  description: z.string().max(1000).optional(),
  sortOrder: z.number().int().min(0).optional(),
  dimensions: z
    .object({
      width: z.number().positive(),
      height: z.number().positive(),
      depth: z.number().positive(),
    })
    .optional(),
});

export const updateRoomSchema = z.object({
  name: z.string().min(1).max(200).trim().optional(),
  description: z.string().max(1000).optional().nullable(),
  sortOrder: z.number().int().min(0).optional(),
  dimensions: z
    .object({
      width: z.number().positive(),
      height: z.number().positive(),
      depth: z.number().positive(),
    })
    .optional()
    .nullable(),
});

export const assignModelToRoomSchema = z.object({
  modelId: z.string().uuid(),
  position: z
    .object({ x: z.number(), y: z.number(), z: z.number() })
    .optional()
    .default({ x: 0, y: 0, z: 0 }),
  rotation: z
    .object({ x: z.number(), y: z.number(), z: z.number() })
    .optional()
    .default({ x: 0, y: 0, z: 0 }),
  scale: z
    .object({ x: z.number(), y: z.number(), z: z.number() })
    .optional()
    .default({ x: 1, y: 1, z: 1 }),
  sortOrder: z.number().int().min(0).optional(),
});

export type CreateRoomDto = z.infer<typeof createRoomSchema>;
export type UpdateRoomDto = z.infer<typeof updateRoomSchema>;
export type AssignModelToRoomDto = z.infer<typeof assignModelToRoomSchema>;
