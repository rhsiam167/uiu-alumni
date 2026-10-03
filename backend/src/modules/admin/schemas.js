import { z } from 'zod';

export const adminUpdateUserSchema = z.object({
  params: z.object({
    id: z.string().uuid()
  }),
  body: z.object({
    status: z.enum(['approved', 'rejected', 'suspended', 'pending']).optional(),
    rejectionReason: z.string().trim().optional().nullable(),
    verified: z.boolean().optional()
  })
});

export const adminDeleteUserSchema = z.object({
  params: z.object({
    id: z.string().uuid()
  })
});

export const adminUpdateJobSchema = z.object({
  params: z.object({
    id: z.string().uuid()
  }),
  body: z.object({
    status: z.enum(['approved', 'rejected']),
    reason: z.string().trim().optional().nullable()
  })
});
