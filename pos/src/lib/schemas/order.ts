import { z } from 'zod'

// Order type enum
export const orderTypeSchema = z.enum(['NORMAL', 'VIP'])

// Order status enum
export const orderStatusSchema = z.enum(['PENDING', 'PROCESSING', 'COMPLETE'])

// Create order schema
export const createOrderSchema = z.object({
  type: orderTypeSchema,
})

export type CreateOrderInput = z.infer<typeof createOrderSchema>

// Update order schema
export const updateOrderSchema = z.object({
  status: orderStatusSchema.optional(),
  botId: z.string().uuid().optional(),
})

export type UpdateOrderInput = z.infer<typeof updateOrderSchema>
