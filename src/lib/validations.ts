import { z } from 'zod';

export const passwordRequirements = [
  { id: 'length', test: (p: string) => p.length >= 8, label: 'At least 8 characters' },
  { id: 'lowercase', test: (p: string) => /[a-z]/.test(p), label: 'One lowercase letter' },
  { id: 'uppercase', test: (p: string) => /[A-Z]/.test(p), label: 'One uppercase letter' },
  { id: 'number', test: (p: string) => /[0-9]/.test(p), label: 'One number' },
  { id: 'special', test: (p: string) => /[^A-Za-z0-9]/.test(p), label: 'One special character' },
] as const;

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[a-z]/, 'Must contain at least one lowercase letter')
  .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
  .regex(/[0-9]/, 'Must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Must contain at least one special character');

export const registerSchema = z.object({
  email: z.string().email(),
  password: passwordSchema,
});
