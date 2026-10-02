import { z } from 'zod';
import { coerceNullableInt, optionalString, urlSchema } from '../../utils/schemaHelpers.js';

export const careerEntrySchema = z.object({
  id: z.string().optional(),
  type: z.enum(['Work', 'Internship', 'Education', 'Other']),
  title: z.string().trim().min(1, 'Title is required'),
  organization: z.string().trim().min(1, 'Organization is required'),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Start date must be YYYY-MM-DD'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'End date must be YYYY-MM-DD').or(z.literal('Present')).nullable().optional(),
  description: optionalString()
});

export const updateUserSchema = z.object({
  params: z.object({
    id: z.string().uuid()
  }),
  body: z.object({
    name: z.string().trim().min(2).optional(),
    phone: optionalString(),
    city: optionalString(),
    bio: optionalString(),
    department: optionalString(),
    program: optionalString(),
    graduationYear: coerceNullableInt('Graduation year must be a valid integer'),
    currentSemester: optionalString(),
    expectedGraduation: coerceNullableInt('Expected graduation year must be a valid integer'),
    company: optionalString(),
    jobTitle: optionalString(),
    github: urlSchema,
    linkedin: urlSchema,
    portfolio: urlSchema,
    website: urlSchema,
    willingToMentor: z.boolean().optional(),
    mentorExpertise: z.array(z.string().trim()).max(10, 'Max 10 mentor expertise tags allowed').optional(),
    careerTimeline: z.array(careerEntrySchema).max(50, 'Max 50 career timeline entries allowed').optional(),
    // Forbidden fields send check
    email: z.string().optional(),
    role: z.string().optional(),
    status: z.string().optional(),
    verified: z.boolean().optional(),
    studentId: z.string().optional()
  })
});

export const getMentorsSchema = z.object({
  query: z.object({
    q: z.string().trim().optional(),
    department: z.string().trim().optional(),
    graduationYear: z.string().trim().optional()
  })
});
