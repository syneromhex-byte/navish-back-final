import { z } from 'zod';

export const contactInquirySchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  email: z.string().email('Invalid email address'),
  projectType: z.string().optional().nullable(),
  message: z.string().min(1, 'Message is required').max(5000),
});

export type ContactInquiryDto = z.infer<typeof contactInquirySchema>;
