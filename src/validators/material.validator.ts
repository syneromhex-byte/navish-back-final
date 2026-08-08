import { z } from 'zod';

const textureIdOrNull = z.string().uuid().nullable().optional();

export const createMaterialSchema = z.object({
  objectId: z.string().min(1).max(500),
  name: z.string().min(1).max(200),
  baseColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional().nullable(),
  roughness: z.number().min(0).max(1).default(0.5),
  metallic: z.number().min(0).max(1).default(0),
  opacity: z.number().min(0).max(1).default(1),
  emissiveColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional().nullable(),
  emissiveIntensity: z.number().min(0).max(10).default(0),
  normalScale: z.number().min(0).max(10).default(1),
  reflectionLevel: z.number().min(0).max(1).default(0.5),
  doubleSided: z.boolean().default(false),
  wireframe: z.boolean().default(false),
  castShadow: z.boolean().default(true),
  receiveShadow: z.boolean().default(true),
  textureMap: textureIdOrNull,
  normalMap: textureIdOrNull,
  roughnessMap: textureIdOrNull,
  metallicMap: textureIdOrNull,
  emissiveMap: textureIdOrNull,
  aoMap: textureIdOrNull,
  customProperties: z.record(z.unknown()).optional(),
});

export const updateMaterialSchema = createMaterialSchema.partial().omit({ objectId: true });

export type CreateMaterialDto = z.infer<typeof createMaterialSchema>;
export type UpdateMaterialDto = z.infer<typeof updateMaterialSchema>;
