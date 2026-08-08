import { z } from 'zod';

export const createClientSchema = z.object({
  email: z.string().email().toLowerCase(),
  password: z.string().min(8).regex(/[A-Z]/).regex(/[a-z]/).regex(/[0-9]/).regex(/[^A-Za-z0-9]/),
  firstName: z.string().min(1).max(50).trim(),
  lastName: z.string().min(1).max(50).trim(),
  companyName: z.string().min(1).max(200).trim(),
  industry: z.string().optional(),
  website: z.string().url().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  contactPhone: z.string().optional(),
  notes: z.string().optional(),
});

export const updateClientSchema = z.object({
  companyName: z.string().min(1).max(200).trim().optional(),
  industry: z.string().optional(),
  website: z.string().url().optional().nullable(),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  country: z.string().optional().nullable(),
  contactPhone: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

export const listClientsQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  search: z.string().optional(),
  isActive: z.enum(['true', 'false']).transform((v) => v === 'true').optional(),
  sortBy: z.enum(['createdAt', 'companyName']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type CreateClientDto = z.infer<typeof createClientSchema>;
export type UpdateClientDto = z.infer<typeof updateClientSchema>;
