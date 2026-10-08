import { HttpError } from './http-error.js'

export interface Cursor {
  createdAt: Date
  id: string
}

export function encodeCursor(cursor: Cursor): string {
  return Buffer.from(`${cursor.createdAt.toISOString()}|${cursor.id}`).toString('base64url')
}

export function decodeCursor(raw: string | undefined): Cursor | undefined {
  if (!raw) return undefined
  const [iso, id] = Buffer.from(raw, 'base64url').toString('utf8').split('|')
  const createdAt = new Date(iso ?? '')
  if (!id || Number.isNaN(createdAt.getTime())) throw HttpError.badRequest('Некорректный курсор')
  return { createdAt, id }
}
