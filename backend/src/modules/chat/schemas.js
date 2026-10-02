import { z } from 'zod';

export const sendMessageSchema = z.object({
  params: z.object({
    userId: z.string().uuid()
  }),
  body: z.object({
    text: z.string().trim().min(1, 'Message text cannot be empty').max(2000, 'Message cannot exceed 2000 characters')
  })
});

export const getMessagesSchema = z.object({
  params: z.object({
    userId: z.string().uuid()
  }),
  query: z.object({
    after: z.string().uuid().optional()
  })
});

export const deleteMessageSchema = z.object({
  params: z.object({
    id: z.string().uuid()
  })
});
