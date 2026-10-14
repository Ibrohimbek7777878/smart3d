/* ═══════════════════ VALIDATION (Zod) ═══════════════════ */
import { z } from 'zod';
import { ValidationError } from '../errors.js';

/* Validate middleware */
export function validate(schema, source = 'body') {
  return (req, res, next) => {
    try {
      const data = schema.parse(req[source]);
      req[source] = data;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const details = error.errors.map(e => ({
          field: e.path.join('.'),
          message: e.message,
        }));
        return next(new ValidationError('Validation failed', details));
      }
      next(error);
    }
  };
}

/* ═══════════════════ SCHEMAS ═══════════════════ */

// Auth
export const registerSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email().max(100),
  phone: z.string().max(20).optional().default(''),
  password: z.string().min(6).max(100),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// Material
export const materialUpdateSchema = z.object({
  uzs: z.number().int().min(0),
  usd: z.number().min(0).optional().default(0),
});

// Project
export const projectCreateSchema = z.object({
  name: z.string().min(1).max(200),
  client_name: z.string().max(100).optional().default(''),
  client_phone: z.string().max(20).optional().default(''),
  client_email: z.string().email().optional().default(''),
  room: z.object({}).passthrough().optional().default({}),
  placements: z.array(z.object({}).passthrough()).optional().default([]),
  material_code: z.string().max(20).optional().default('MDF16'),
  sheet_material: z.object({}).passthrough().nullable().optional().default(null),
  settings: z.object({}).passthrough().optional().default({}),
  tags: z.array(z.string()).optional().default([]),
  notes: z.string().max(2000).optional().default(''),
});

export const projectUpdateSchema = projectCreateSchema.partial().extend({
  status: z.enum(['draft', 'sent', 'approved', 'production', 'done']).optional(),
});

// Order
export const orderCreateSchema = z.object({
  project_id: z.string().uuid().optional().nullable(),
  client_name: z.string().max(100).optional().default(''),
  client_phone: z.string().max(20).optional().default(''),
  client_email: z.string().email().optional().default(''),
  subtotal: z.number().int().min(0).optional().default(0),
  discount_percent: z.number().min(0).max(100).optional().default(0),
  total_price: z.number().int().min(0).optional().default(0),
  material_cost: z.number().int().min(0).optional().default(0),
  hardware_cost: z.number().int().min(0).optional().default(0),
  labor_cost: z.number().int().min(0).optional().default(0),
  notes: z.string().max(2000).optional().default(''),
  room_json: z.object({}).passthrough().optional().default({}),
  placements_json: z.array(z.object({}).passthrough()).optional().default([]),
});

// AI
export const aiBuildSchema = z.object({
  text: z.string().min(1).max(5000),
  room: z.object({}).passthrough().optional(),
  language: z.enum(['uz', 'ru', 'en']).optional().default('uz'),
});

export const aiInspectSchema = z.object({
  project: z.object({}).passthrough(),
  cutlists: z.array(z.object({}).passthrough()).optional().default([]),
});

// Export
export const exportSchema = z.object({
  project_id: z.string().uuid().optional(),
  format: z.enum(['obj', 'bpj', 'giblab', 'xnc', 'dxf', 'gcode', 'ptp', 'project', 'cutlist', 'smeta']),
  options: z.object({}).passthrough().optional().default({}),
});

// Search
export const searchSchema = z.object({
  q: z.string().min(1).max(100),
  cat_code: z.string().max(10).optional(),
  type: z.string().max(20).optional(),
  limit: z.number().int().min(1).max(500).optional().default(100),
});
