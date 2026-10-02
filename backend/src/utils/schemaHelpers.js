import { z } from 'zod';

export const coerceInt = (msg = 'Must be a valid integer') => z.preprocess((val) => {
  if (val === '' || val === null || val === undefined) return undefined;
  if (typeof val === 'number') return val;
  if (typeof val === 'string' && val.trim() !== '') {
    const num = Number(val);
    return isNaN(num) ? val : num;
  }
  return val;
}, z.number().int(msg).optional());

export const coerceNullableInt = (msg = 'Must be a valid integer') => z.preprocess((val) => {
  if (val === '' || val === null || val === undefined) return null;
  if (typeof val === 'number') return val;
  if (typeof val === 'string' && val.trim() !== '') {
    const num = Number(val);
    return isNaN(num) ? val : num;
  }
  return val;
}, z.number().int(msg).nullable().optional());

export const coerceNumber = (msg = 'Must be a valid number') => z.preprocess((val) => {
  if (val === '' || val === null || val === undefined) return undefined;
  if (typeof val === 'number') return val;
  if (typeof val === 'string' && val.trim() !== '') {
    const num = Number(val);
    return isNaN(num) ? val : num;
  }
  return val;
}, z.number({ invalid_type_error: msg }));

export const optionalString = () => z.preprocess((val) => {
  if (val === '' || val === null || val === undefined) return null;
  return typeof val === 'string' ? val.trim() : val;
}, z.string().nullable().optional());

export const urlSchema = z.preprocess((val) => {
  if (val === '' || val === null || val === undefined) return null;
  return val;
}, z.string().trim().url({ message: 'Invalid URL format' }).refine(val => /^https?:\/\//i.test(val), {
  message: 'URL must start with http:// or https://'
}).nullable().optional());
