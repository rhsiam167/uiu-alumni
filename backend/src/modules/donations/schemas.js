import { z } from 'zod';
import { coerceNumber, optionalString } from '../../utils/schemaHelpers.js';

export const createDonationSchema = z.object({
  body: z.object({
    amount: coerceNumber('Amount must be a valid number')
      .refine(val => val !== undefined && val >= 1, { message: 'Amount must be at least 1 BDT' })
      .refine(val => val !== undefined && val <= 10000000, { message: 'Amount cannot exceed 10,000,000 BDT' })
      .refine(val => val === undefined || Number(val.toFixed(2)) === val, { message: 'Amount can have at most 2 decimal places' }),
    purpose: z.enum(['General Fund', 'Scholarship Fund', 'Emergency Fund']),
    message: optionalString(),
    isAnonymous: z.boolean().default(false)
  })
});
