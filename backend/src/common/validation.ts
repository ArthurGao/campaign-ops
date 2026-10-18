import { ValidationPipe, type ValidationError } from '@nestjs/common';
import { AppError } from '@campaign-ops/core';

function flatten(errors: ValidationError[], prefix = ''): string[] {
  return errors.flatMap((e) => [
    ...Object.values(e.constraints ?? {}).map((m) => (prefix ? `${prefix}.${m}` : m)),
    ...flatten(e.children ?? [], prefix ? `${prefix}.${e.property}` : e.property),
  ]);
}

export function createValidationPipe(): ValidationPipe {
  return new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    exceptionFactory: (errors) =>
      new AppError('VALIDATION', flatten(errors).join('; '), undefined, 400),
  });
}
