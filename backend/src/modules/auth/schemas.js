import { z } from 'zod';
import { coerceInt, optionalString, urlSchema } from '../../utils/schemaHelpers.js';

const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters long')
  .max(72, 'Password cannot exceed 72 bytes')
  .refine(val => /[a-zA-Z]/.test(val) && /[0-9]/.test(val), {
    message: 'Password must contain at least one letter and one number'
  });

export const registerSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2, 'Name is required'),
    email: z.string().trim().email('Invalid email address').transform(e => e.toLowerCase()),
    password: passwordSchema,
    phone: optionalString(),
    role: z.enum(['student', 'alumni'], { errorMap: () => ({ message: "Role must be 'student' or 'alumni'" }) }),
    studentId: z.string().trim().min(1, 'Student ID is required'),
    department: optionalString(),
    program: optionalString(),
    graduationYear: coerceInt('Graduation year must be a valid integer'),
    currentSemester: optionalString(),
    expectedGraduation: coerceInt('Expected graduation year must be a valid integer'),
    company: optionalString(),
    jobTitle: optionalString(),
    city: optionalString(),
    linkedin: urlSchema
  })
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().trim().email().transform(e => e.toLowerCase()),
    password: z.string()
  })
});

export const changePasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string(),
    newPassword: passwordSchema
  })
});
