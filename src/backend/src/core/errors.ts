import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public fieldErrors?: Record<string, string[]>,
  ) {
    super(message);
  }
}
export const errorHandler: ErrorRequestHandler = (error, req, res, _next) => {
  let e: ApiError;
  if (error instanceof ApiError) e = error;
  else if (error instanceof ZodError)
    e = new ApiError(
      400,
      'INVALID_INPUT',
      'Periksa kembali isian Anda.',
      Object.fromEntries(error.issues.map((i) => [i.path.join('.'), [i.message]])),
    );
  else if (error.type === 'entity.parse.failed')
    e = new ApiError(400, 'INVALID_JSON', 'JSON tidak valid.');
  else if (error.type === 'entity.too.large')
    e = new ApiError(413, 'TOO_LARGE', 'Berkas atau permintaan terlalu besar.');
  else if (error.code === '23505')
    e = new ApiError(409, 'CONFLICT', 'Data tersebut sudah digunakan.');
  else e = new ApiError(503, 'UNAVAILABLE', 'Layanan sementara tidak tersedia. Silakan coba lagi.');
  res
    .status(e.status)
    .json({
      code: e.code,
      message: e.message,
      request_id: res.locals.requestId,
      ...(e.fieldErrors ? { field_errors: e.fieldErrors } : {}),
    });
};
export function requireState(ok: unknown, code: string, message: string, status = 409): asserts ok {
  if (!ok) throw new ApiError(status, code, message);
}
