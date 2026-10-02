import { z } from 'zod';
import { optionalString, urlSchema } from '../../utils/schemaHelpers.js';

export const createJobSchema = z.object({
  body: z.object({
    title: z.string().trim().min(2, 'Title is required').max(200),
    company: z.string().trim().min(1, 'Company is required').max(200),
    location: z.string().trim().min(1, 'Location is required').max(200),
    type: z.enum(['Full-time', 'Part-time', 'Internship', 'Contract']),
    salary: optionalString(),
    description: z.string().trim().min(10, 'Description must be at least 10 characters').max(5000),
    requirements: optionalString(),
    deadline: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Deadline must be YYYY-MM-DD'),
    recruiterEmail: z.string().trim().email('Invalid recruiter email address').transform(e => e.toLowerCase())
  })
});

export const updateJobSchema = z.object({
  params: z.object({
    id: z.string().uuid()
  }),
  body: z.object({
    title: z.string().trim().min(2).max(200).optional(),
    company: z.string().trim().min(1).max(200).optional(),
    location: z.string().trim().min(1).max(200).optional(),
    type: z.enum(['Full-time', 'Part-time', 'Internship', 'Contract']).optional(),
    salary: optionalString(),
    description: z.string().trim().min(10).max(5000).optional(),
    requirements: optionalString(),
    deadline: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    recruiterEmail: z.string().trim().email().transform(e => e.toLowerCase()).optional(),
    status: z.enum(['pending', 'approved', 'rejected', 'closed']).optional()
  })
});

export const applyJobSchema = z.object({
  params: z.object({
    id: z.string().uuid()
  }),
  body: z.object({
    portfolio: urlSchema,
    github: urlSchema,
    coverNote: optionalString()
  })
});
