import { z } from 'zod'
import { users } from '../../db/schema.js'

export const nameField = z
  .string()
  .trim()
  .min(1, 'Укажите имя')
  .max(60, 'Имя не длиннее 60 символов')

export const usernameField = z
  .string()
  .trim()
  .min(3, 'Логин от 3 символов')
  .max(30, 'Логин не длиннее 30 символов')
  .regex(/^[a-zA-Z0-9_]+$/, 'Логин: только латиница, цифры и _')

export const emailField = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email('Некорректный e-mail').max(254))

// bcrypt only uses the first 72 bytes of the password.
export const passwordField = z
  .string()
  .min(8, 'Пароль от 8 символов')
  .max(72, 'Пароль не длиннее 72 символов')

export const bioField = z.string().trim().max(160, 'О себе — не длиннее 160 символов')

export const publicUserColumns = {
  id: users.id,
  name: users.name,
  username: users.username,
  bio: users.bio,
  role: users.role,
  createdAt: users.createdAt,
}

export const meColumns = { ...publicUserColumns, email: users.email }
