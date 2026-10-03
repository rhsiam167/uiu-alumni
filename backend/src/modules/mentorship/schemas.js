import { z } from 'zod';

export const createMentorshipRequestSchema = z.object({
  body: z.object({
    mentorId: z.string().uuid('Invalid mentorId UUID'),
    topic: z.string().trim().min(1, 'Topic is required').max(200),
    message: z.string().trim().min(1, 'Message is required').max(2000)
  })
});

export const updateMentorshipStatusSchema = z.object({
  params: z.object({
    id: z.string().uuid()
  }),
  body: z.object({
    status: z.enum(['accepted', 'declined'])
  })
});

export const deleteMentorshipSchema = z.object({
  params: z.object({
    id: z.string().uuid()
  })
});
