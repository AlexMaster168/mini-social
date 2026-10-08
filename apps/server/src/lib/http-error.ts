export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message)
    this.name = 'HttpError'
  }

  static badRequest(message = 'Некорректный запрос', details?: unknown) {
    return new HttpError(400, message, details)
  }

  static unauthorized(message = 'Требуется авторизация') {
    return new HttpError(401, message)
  }

  static forbidden(message = 'Недостаточно прав') {
    return new HttpError(403, message)
  }

  static notFound(message = 'Не найдено') {
    return new HttpError(404, message)
  }

  static conflict(message: string) {
    return new HttpError(409, message)
  }
}
