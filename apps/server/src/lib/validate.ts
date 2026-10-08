import { z } from 'zod'
import { HttpError } from './http-error.js'

export function parse<T extends z.ZodType>(schema: T, data: unknown): z.output<T> {
  const result = schema.safeParse(data)
  if (!result.success) {
    const fields = z.flattenError(result.error).fieldErrors
    const first = result.error.issues[0]?.message ?? 'Некорректные данные'
    throw HttpError.badRequest(first, fields)
  }
  return result.data
}

export const uuidParam = z.object({ id: z.uuid('Некорректный идентификатор') })

export const paginationQuery = z.object({
  cursor: z.string().max(200).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
})
