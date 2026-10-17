import { ArgumentsHost, Catch, ExceptionFilter, HttpException, Logger } from '@nestjs/common';
import type { Response } from 'express';
import { AppError } from '@campaign-ops/core';

export { AppError };

/** Every error leaves the API as { code, message, hint } (plus `gates` for AD_GATES_UNMET). */
@Catch()
export class AppExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('AppExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost): void {
    const res = host.switchToHttp().getResponse<Response>();
    if (exception instanceof AppError) {
      res.status(exception.status).json({
        code: exception.code,
        message: exception.message,
        ...(exception.hint ? { hint: exception.hint } : {}),
        ...exception.extra,
      });
      return;
    }
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      const raw = typeof body === 'object' && body && 'message' in body ? (body as { message: unknown }).message : exception.message;
      const message = Array.isArray(raw) ? raw.join('; ') : String(raw);
      res.status(status).json({ code: status === 404 ? 'NOT_FOUND' : 'VALIDATION', message });
      return;
    }
    this.logger.error(exception);
    res.status(500).json({ code: 'INTERNAL', message: 'Unexpected server error.' });
  }
}
