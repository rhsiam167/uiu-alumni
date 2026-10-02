import { z } from 'zod';
import { coerceNullableInt } from '../../utils/schemaHelpers.js';

export const createEventSchema = z.object({
  body: z.object({
    title: z.string().trim().min(2, 'Title is required').max(200),
    description: z.string().trim().min(5, 'Description is required').max(5000),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
    time: z.string().trim().min(1, 'Time is required'),
    venue: z.string().trim().min(1, 'Venue is required').max(200),
    type: z.string().trim().min(1, 'Type is required'),
    capacity: coerceNullableInt('Capacity must be a valid positive integer').refine(val => val === null || val === undefined || val > 0, {
      message: 'Capacity must be greater than 0'
    })
  })
});

export const updateEventSchema = z.object({
  params: z.object({
    id: z.string().uuid()
  }),
  body: z.object({
    title: z.string().trim().min(2).max(200).optional(),
    description: z.string().trim().min(5).max(5000).optional(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    time: z.string().trim().optional(),
    venue: z.string().trim().min(1).max(200).optional(),
    type: z.string().trim().optional(),
    capacity: coerceNullableInt('Capacity must be a valid positive integer').refine(val => val === null || val === undefined || val > 0, {
      message: 'Capacity must be greater than 0'
    })
  })
});
