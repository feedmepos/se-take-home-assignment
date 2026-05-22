import { z } from 'zod'

// Bot status enum
export const botStatusSchema = z.enum(['IDLE', 'PROCESSING'])

// Create bot schema
export const createBotSchema = z.object({
  status: botStatusSchema.default('IDLE'),
})

export type CreateBotInput = z.infer<typeof createBotSchema>

// Update bot schema
export const updateBotSchema = z.object({
  status: botStatusSchema.optional(),
  currentOrderId: z.string().uuid().optional().nullable(),
})

export type UpdateBotInput = z.infer<typeof updateBotSchema>
