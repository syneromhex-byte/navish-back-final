import { z } from 'zod';

const colorHex = z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional();

export const upsertLightingSchema = z.object({
  name: z.string().max(200).optional().default('Default Lighting'),
  ambientColor: colorHex.default('#ffffff'),
  ambientIntensity: z.number().min(0).max(10).default(0.5),
  sunEnabled: z.boolean().default(true),
  sunColor: colorHex.default('#ffffff'),
  sunIntensity: z.number().min(0).max(10).default(1),
  sunPositionX: z.number().default(1),
  sunPositionY: z.number().default(2),
  sunPositionZ: z.number().default(1),
  shadowsEnabled: z.boolean().default(true),
  shadowBias: z.number().default(-0.001),
  shadowMapSize: z.enum(['512', '1024', '2048', '4096']).transform(Number).default('2048'),
  shadowSoftness: z.number().min(0).max(10).default(1),
  environmentMapId: z.string().uuid().optional().nullable(),
  exposure: z.number().min(0).max(10).default(1),
  pointLights: z
    .array(
      z.object({
        id: z.string(),
        color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
        intensity: z.number().min(0).max(10),
        position: z.object({ x: z.number(), y: z.number(), z: z.number() }),
        distance: z.number().min(0),
        decay: z.number().min(0),
      }),
    )
    .optional()
    .default([]),
  spotLights: z
    .array(
      z.object({
        id: z.string(),
        color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
        intensity: z.number().min(0).max(10),
        position: z.object({ x: z.number(), y: z.number(), z: z.number() }),
        target: z.object({ x: z.number(), y: z.number(), z: z.number() }),
        angle: z.number().min(0).max(Math.PI),
        penumbra: z.number().min(0).max(1),
        distance: z.number().min(0),
        decay: z.number().min(0),
        castShadow: z.boolean(),
      }),
    )
    .optional()
    .default([]),
});

export type UpsertLightingDto = z.infer<typeof upsertLightingSchema>;
